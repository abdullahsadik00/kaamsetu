import { Controller, Get, Param } from '@nestjs/common';
import { z } from 'zod';
import { CurrentAuth } from '../auth/auth.guard.js';
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
  user: { select: { name: true, phone: true } },
} as const;

/**
 * Read-only business and employee endpoints (docs/06 §3). Creating and
 * editing them comes with modules 4.1 and 4.2.
 */
@Controller()
export class OrganizationController {
  constructor(private readonly prisma: PrismaService) {}

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
  employees(@CurrentAuth() auth: AuthContext) {
    return this.prisma.organizationMember.findMany({
      where: scoped(auth),
      select: memberSelect,
      orderBy: { joinedAt: 'asc' },
    });
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
    return member;
  }
}
