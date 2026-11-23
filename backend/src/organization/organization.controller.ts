import {
  Body,
  Controller,
  Get,
  Patch,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { CurrentAuth } from '../auth/auth.guard.js';
import { InviteService } from '../auth/invite.service.js';
import { ALL_ROLES, Roles } from '../auth/roles.js';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import { audit } from '../common/audit.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { myTeamIds } from '../field/scope.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';
import {
  ChangeBusinessTypeSchema,
  CreateEmployeeSchema,
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
} from './organization.schemas.js';
import type {
  ChangeBusinessType,
  CreateEmployee,
  CreateOrganization,
  UpdateOrganization,
} from './organization.schemas.js';
import { exportBusiness, exportCounts } from './export.js';
import { Feature, featuresFor } from './features.js';
import { OrganizationService } from './organization.service.js';

const memberSelect = {
  id: true,
  role: true,
  status: true,
  joinedAt: true,
  user: { select: { name: true, phone: true, googleSubject: true } },
} as const;

/** Never expose the Google account id; only whether a login is linked. */
function present<
  T extends {
    user: { name: string; phone: string | null; googleSubject: string | null };
  },
>(m: T) {
  return {
    ...m,
    user: { name: m.user.name, phone: m.user.phone },
    loginLinked: m.user.googleSubject !== null,
  };
}

/**
 * Business and employee endpoints (docs/06 §3). Creating a business and
 * adding staff were built early under D-027; editing comes with 4.1/4.2.
 */
@Controller()
export class OrganizationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invites: InviteService,
    private readonly organizations: OrganizationService,
  ) {}

  /**
   * "Your business" (T4.1): a signed-in user without a business creates one
   * and becomes its owner, with a 30-day trial. No @Roles: callers have no
   * business yet. The app refreshes its token afterwards to get the role.
   */
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('organizations')
  @HttpCode(HttpStatus.CREATED)
  createOrganization(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateOrganizationSchema))
    body: CreateOrganization,
  ) {
    return this.organizations.create(auth, body);
  }

  /** Owner edits the business details (D-027). */
  @Roles('OWNER')
  @Patch('organization')
  updateOrganization(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(UpdateOrganizationSchema))
    body: UpdateOrganization,
  ) {
    return this.organizations.update(auth, body);
  }

  /**
   * Owner downloads everything the business has entered, as JSON (doc 10 §4).
   * Heavy, so a few times an hour at most; each download is in the audit log.
   */
  @Roles('OWNER')
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Get('organization/export')
  async exportData(@CurrentAuth() auth: AuthContext) {
    const data = await exportBusiness(this.prisma, requireOrg(auth));
    await audit(this.prisma, auth, 'DATA_EXPORTED', 'Organization', data.business.id, exportCounts(data));
    return data;
  }

  /** Owner removes someone who left: inactive at once, phones signed out (D-027). */
  @Roles('OWNER')
  @Feature('EMPLOYEES')
  @Post('employees/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivateEmployee(
    @CurrentAuth() auth: AuthContext,
    @Param('id', new ZodValidationPipe(z.uuid())) id: string,
  ) {
    return this.organizations.deactivateEmployee(auth, id);
  }

  /** Owner adds a senior technician or helper (D-027); they join by invite. */
  @Roles('OWNER')
  @Feature('EMPLOYEES')
  @Post('employees')
  @HttpCode(HttpStatus.CREATED)
  async addEmployee(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateEmployeeSchema)) body: CreateEmployee,
  ) {
    return present(await this.organizations.addEmployee(auth, body));
  }

  /**
   * The caller's own business. Any member may see its basic details; only the
   * owner sees when the free trial ends (null when not on a trial, T7.1).
   * `inTeam`: the caller is in an active team, so an owner gets My work (D-043).
   */
  @Roles(...ALL_ROLES)
  @Get('organization')
  async organization(@CurrentAuth() auth: AuthContext) {
    const org = await this.prisma.organization.findUnique({
      where: { id: requireOrg(auth) },
      select: {
        id: true,
        name: true,
        phone: true,
        city: true,
        currencyCode: true,
        gstBills: true,
        gstin: true,
        timezone: true,
        businessType: true,
        subscription: { select: { status: true, trialEndsAt: true } },
      },
    });
    if (!org) throw AppError.notFound('ORGANIZATION_NOT_FOUND');
    const { subscription, ...details } = org;
    const onTrial = auth.role === 'OWNER' && subscription?.status === 'TRIALING';
    const inTeam = (await myTeamIds(this.prisma, auth)).length > 0;
    return {
      ...details,
      features: featuresFor(details.businessType),
      trialEndsAt: onTrial ? (subscription?.trialEndsAt ?? null) : null,
      inTeam,
    };
  }

  /** Owner changes how the business works; screens follow `features` (D-044). */
  @Roles('OWNER')
  @Post('organization/business-type')
  @HttpCode(HttpStatus.OK)
  changeBusinessType(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(ChangeBusinessTypeSchema)) body: ChangeBusinessType,
  ) {
    return this.organizations.changeBusinessType(auth, body);
  }

  @Roles('OWNER')
  @Feature('EMPLOYEES')
  @Get('employees')
  async employees(@CurrentAuth() auth: AuthContext) {
    const rows = await this.prisma.organizationMember.findMany({
      where: scoped(auth),
      select: memberSelect,
      orderBy: { joinedAt: 'asc' },
    });
    return rows.map(present);
  }

  @Roles('OWNER')
  @Feature('EMPLOYEES')
  @Get('employees/:id')
  async employee(
    @CurrentAuth() auth: AuthContext,
    @Param('id', new ZodValidationPipe(z.uuid())) id: string,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: scoped(auth, { id }),
      select: memberSelect,
    });
    // Same answer whether it does not exist or belongs to another business (docs/10 §3).
    if (!member) throw AppError.notFound('EMPLOYEE_NOT_FOUND');
    return present(member);
  }

  /** QR + 6-digit invite that links this employee's Google login (D-025). */
  @Roles('OWNER')
  @Feature('EMPLOYEES')
  @Post('employees/:id/invite')
  @HttpCode(HttpStatus.CREATED)
  invite(
    @CurrentAuth() auth: AuthContext,
    @Param('id', new ZodValidationPipe(z.uuid())) id: string,
  ) {
    return this.invites.create(auth, id);
  }

  /** Unlinks the employee's Google login and signs out their phones. */
  @Roles('OWNER')
  @Feature('EMPLOYEES')
  @Post('employees/:id/reset-login')
  @HttpCode(HttpStatus.OK)
  resetLogin(
    @CurrentAuth() auth: AuthContext,
    @Param('id', new ZodValidationPipe(z.uuid())) id: string,
  ) {
    return this.invites.resetLogin(auth, id);
  }
}
