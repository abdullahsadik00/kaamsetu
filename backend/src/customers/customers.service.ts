import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';
import type {
  CreateCustomer,
  CreateEquipment,
  ListCustomers,
  SiteInput,
  UpdateCustomer,
  UpdateEquipment,
} from './customers.schemas.js';

const equipmentSelect = {
  id: true,
  siteId: true,
  type: true,
  brand: true,
  capacityTons: true,
  locationLabel: true,
  model: true,
  serialNumber: true,
  refrigerant: true,
  status: true,
} as const;

/** Decimal → number for JSON (capacity like 1.5 tons). */
function presentEquipment<T extends { capacityTons: Prisma.Decimal | null }>(e: T) {
  return { ...e, capacityTons: e.capacityTons === null ? null : Number(e.capacityTons) };
}

const notFound = () => AppError.notFound('CUSTOMER_NOT_FOUND');

/** Customers, their addresses and ACs (T4.3/T4.4, D-028). Owner only; every query scoped to the business. */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Search by name (any part, any case) or by any digits of the mobile number. */
  async list(auth: AuthContext, query: ListCustomers) {
    const q = query.q ?? '';
    const digits = q.replace(/\D/g, '');
    const where: Prisma.CustomerWhereInput = {
      archivedAt: query.archived === 'true' ? { not: null } : null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
            ],
          }
        : {}),
    };
    const rows = await this.prisma.customer.findMany({
      where: scoped(auth, where),
      orderBy: [{ updatedAt: 'desc' }],
      take: 50,
      select: {
        id: true,
        type: true,
        name: true,
        phone: true,
        archivedAt: true,
        sites: {
          where: { isDefault: true },
          select: { locality: true, city: true, addressLine1: true },
          take: 1,
        },
        _count: { select: { equipment: { where: { status: 'ACTIVE' } } } },
      },
    });
    return rows.map(({ sites, _count, ...c }) => ({
      ...c,
      place: sites[0]?.locality || sites[0]?.city || sites[0]?.addressLine1 || null,
      acCount: _count.equipment,
    }));
  }

  async get(auth: AuthContext, id: string) {
    const c = await this.prisma.customer.findFirst({
      where: scoped(auth, { id }),
      include: {
        sites: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          include: {
            equipment: {
              where: { status: 'ACTIVE' },
              orderBy: { createdAt: 'asc' },
              select: equipmentSelect,
            },
          },
        },
      },
    });
    if (!c) throw notFound();
    const { organizationId: _org, sites, ...rest } = c;
    void _org;
    return {
      ...rest,
      sites: sites.map(({ organizationId: _o, customerId: _c, equipment, ...s }) => {
        void _o;
        void _c;
        return { ...s, equipment: equipment.map(presentEquipment) };
      }),
    };
  }

  /**
   * Adds a customer with their first address as the default site. A mobile
   * number already used by another customer of this business is refused
   * with CUSTOMER_PHONE_EXISTS (and that customer's id) unless the owner
   * chose "Add anyway". Other businesses' customers never count.
   */
  async create(auth: AuthContext, input: CreateCustomer) {
    const organizationId = requireOrg(auth);
    if (!input.allowDuplicatePhone) {
      const existing = await this.prisma.customer.findFirst({
        where: scoped(auth, { phone: input.phone, archivedAt: null }),
        select: { id: true, name: true },
      });
      if (existing) {
        throw new AppError(
          HttpStatus.CONFLICT,
          'CUSTOMER_PHONE_EXISTS',
          `This number is already saved for ${existing.name}.`,
          { customerId: existing.id, name: existing.name },
        );
      }
    }
    const created = await this.prisma.customer.create({
      data: {
        organizationId,
        type: input.type,
        name: input.name,
        phone: input.phone,
        alternatePhone: input.alternatePhone ?? null,
        notes: input.notes ?? null,
        gstBills: input.gstBills,
        gstin: input.gstin ?? null,
        sites: {
          create: { organizationId, isDefault: true, ...this.siteData(input.site) },
        },
      },
      select: { id: true },
    });
    return this.get(auth, created.id);
  }

  async update(auth: AuthContext, id: string, input: UpdateCustomer) {
    const { archived, ...fields } = input;
    const result = await this.prisma.customer.updateMany({
      where: scoped(auth, { id }),
      data: {
        ...fields,
        ...(archived !== undefined ? { archivedAt: archived ? new Date() : null } : {}),
      },
    });
    if (result.count === 0) throw notFound();
    return this.get(auth, id);
  }

  async addSite(auth: AuthContext, customerId: string, input: SiteInput) {
    const organizationId = requireOrg(auth);
    await this.ownCustomer(auth, customerId);
    await this.prisma.site.create({
      data: { organizationId, customerId, isDefault: false, ...this.siteData(input) },
    });
    return this.get(auth, customerId);
  }

  /** The AC's address must belong to the same customer of the same business (T4.4). */
  async addEquipment(auth: AuthContext, input: CreateEquipment) {
    const organizationId = requireOrg(auth);
    const site = await this.prisma.site.findFirst({
      where: scoped(auth, { id: input.siteId, customerId: input.customerId }),
      select: { id: true },
    });
    if (!site) throw AppError.notFound('SITE_NOT_FOUND');
    const { customerId, siteId, ...fields } = input;
    const e = await this.prisma.equipment.create({
      data: { organizationId, customerId, siteId, ...fields },
      select: equipmentSelect,
    });
    return presentEquipment(e);
  }

  async updateEquipment(auth: AuthContext, id: string, input: UpdateEquipment) {
    const { archived, ...fields } = input;
    const result = await this.prisma.equipment.updateMany({
      where: scoped(auth, { id }),
      data: {
        ...fields,
        ...(archived !== undefined ? { status: archived ? 'ARCHIVED' : 'ACTIVE' } : {}),
      },
    });
    if (result.count === 0) throw AppError.notFound('EQUIPMENT_NOT_FOUND');
    const e = await this.prisma.equipment.findFirstOrThrow({
      where: scoped(auth, { id }),
      select: equipmentSelect,
    });
    return presentEquipment(e);
  }

  private async ownCustomer(auth: AuthContext, id: string) {
    const c = await this.prisma.customer.findFirst({
      where: scoped(auth, { id }),
      select: { id: true },
    });
    if (!c) throw notFound();
  }

  private siteData(s: SiteInput) {
    return {
      label: s.label ?? null,
      addressLine1: s.addressLine1,
      locality: s.locality ?? null,
      city: s.city ?? null,
      landmark: s.landmark ?? null,
    };
  }
}
