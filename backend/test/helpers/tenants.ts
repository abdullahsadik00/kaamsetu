import type { INestApplication } from '@nestjs/common';
import { TokenService } from '../../src/auth/token.service.js';
import type { Role } from '../../src/auth/roles.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

/**
 * Isolation test harness (docs/12 §2). Creates synthetic businesses with
 * staff and hands out access tokens without going through SMS. Every
 * business module must add tests proving business A cannot read or change
 * business B's records with these helpers.
 */
export interface TestTenant {
  organizationId: string;
  tokens: Record<Role, string>;
  memberIds: Record<Role, string>;
}

const ROLES: Role[] = ['OWNER', 'SENIOR_TECHNICIAN', 'HELPER'];

export class TenantFactory {
  private readonly prisma: PrismaService;
  private readonly tokens: TokenService;
  private readonly orgIds: string[] = [];
  private readonly userIds: string[] = [];

  constructor(app: INestApplication) {
    this.prisma = app.get(PrismaService);
    this.tokens = app.get(TokenService);
  }

  /** `phonePrefix` must be 8 digits starting 6–9, e.g. '90000001'; roles get suffixes 01–03. */
  async create(name: string, phonePrefix: string): Promise<TestTenant> {
    const org = await this.prisma.organization.create({
      data: { name, phone: `+91${phonePrefix}00` },
    });
    this.orgIds.push(org.id);
    const tenant: TestTenant = {
      organizationId: org.id,
      tokens: {} as TestTenant['tokens'],
      memberIds: {} as TestTenant['memberIds'],
    };
    for (const [i, role] of ROLES.entries()) {
      const user = await this.prisma.user.create({
        data: { phone: `+91${phonePrefix}0${i + 1}`, name: `${name} ${role}` },
      });
      this.userIds.push(user.id);
      const member = await this.prisma.organizationMember.create({
        data: { organizationId: org.id, userId: user.id, role },
      });
      tenant.memberIds[role] = member.id;
      const issued = await this.tokens.loginNewDevice(user.id, {
        platform: 'android',
      });
      tenant.tokens[role] = issued.accessToken;
    }
    return tenant;
  }

  /** A logged-in user who has not created or joined a business yet. */
  async userWithoutBusiness(phone: string): Promise<string> {
    const user = await this.prisma.user.create({ data: { phone } });
    this.userIds.push(user.id);
    return (await this.tokens.loginNewDevice(user.id, { platform: 'android' }))
      .accessToken;
  }

  async cleanUp(): Promise<void> {
    const userIds = this.userIds.splice(0);
    const orgIds = this.orgIds.splice(0);
    await this.prisma.refreshToken.deleteMany({
      where: { device: { userId: { in: userIds } } },
    });
    await this.prisma.device.deleteMany({ where: { userId: { in: userIds } } });
    await this.prisma.organizationMember.deleteMany({
      where: { organizationId: { in: orgIds } },
    });
    await this.prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await this.prisma.organization.deleteMany({
      where: { id: { in: orgIds } },
    });
  }

  /** Removes leftovers from an interrupted earlier run. */
  async removeLeftovers(phonePrefixes: string[]): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        OR: phonePrefixes.map((p) => ({ phone: { startsWith: `+91${p}` } })),
      },
    });
    const orgs = await this.prisma.organization.findMany({
      where: {
        OR: phonePrefixes.map((p) => ({ phone: { startsWith: `+91${p}` } })),
      },
    });
    this.userIds.push(...users.map((u) => u.id));
    this.orgIds.push(...orgs.map((o) => o.id));
    await this.cleanUp();
  }
}
