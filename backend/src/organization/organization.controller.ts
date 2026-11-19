import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentAuth } from '../auth/auth.guard.js';
import { InviteService } from '../auth/invite.service.js';
import { ALL_ROLES, Roles } from '../auth/roles.js';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';

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
 * Read-only business and employee endpoints (docs/06 §3). Creating and
 * editing them comes with modules 4.1 and 4.2.
 */
@Controller()
export class OrganizationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invites: InviteService,
  ) {}

  /** The caller's own business. Any member may see its basic details. */
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
        timezone: true,
      },
    });
    if (!org) throw AppError.notFound('ORGANIZATION_NOT_FOUND');
    return org;
  }

  @Roles('OWNER')
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
  @Post('employees/:id/reset-login')
  @HttpCode(HttpStatus.OK)
  resetLogin(
    @CurrentAuth() auth: AuthContext,
    @Param('id', new ZodValidationPipe(z.uuid())) id: string,
  ) {
    return this.invites.resetLogin(auth, id);
  }
}
