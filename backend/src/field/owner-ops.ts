import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import { CreateCustomerSchema, CreateEquipmentSchema } from '../customers/customers.schemas.js';
import { CustomersService } from '../customers/customers.service.js';
import { CreateEnquirySchema, EnquiriesService } from '../enquiries/enquiries.service.js';
import { CreateJobSchema, JobsService } from '../jobs/jobs.service.js';
import { loadPlan } from '../organization/plans.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Owner basic offline, saving (D-021, docs/09 §2): what the owner saved
 * without internet arrives as operations, in order, with ids made on the
 * phone, so a job can name a customer and address saved offline before it.
 * Each runs through the same rules as the online endpoint.
 */
export const OWNER_OPS = ['customer.create', 'equipment.create', 'enquiry.create', 'job.create'] as const;
export type OwnerOp = (typeof OWNER_OPS)[number];
export const isOwnerOp = (o: string): o is OwnerOp => (OWNER_OPS as readonly string[]).includes(o);

export const ENTITY: Record<OwnerOp, string> = {
  'customer.create': 'Customer',
  'equipment.create': 'Equipment',
  'enquiry.create': 'ServiceRequest',
  'job.create': 'ServiceJob',
};

/** customer.create also carries the id of the customer's first address. */
const CustomerPayload = CreateCustomerSchema.safeExtend({ siteId: z.uuid() });

type Outcome = { status: 'applied' | 'conflict' | 'rejected'; code?: string };

@Injectable()
export class OwnerOps {
  constructor(
    private readonly customers: CustomersService,
    private readonly enquiries: EnquiriesService,
    private readonly jobs: JobsService,
    private readonly prisma: PrismaService,
  ) {}

  async apply(auth: AuthContext, op: OwnerOp, entityId: string, payload: unknown): Promise<Outcome> {
    if (auth.role !== 'OWNER') return { status: 'rejected', code: 'FORBIDDEN_ROLE' };
    // New work saved offline after the plan ended (D-045), like the online routes.
    if (auth.organizationId && (await loadPlan(this.prisma, auth.organizationId)).access === 'READ_ONLY') {
      return { status: 'rejected', code: 'PLAN_ENDED' };
    }
    try {
      switch (op) {
        case 'customer.create': {
          const { siteId, ...input } = parse(CustomerPayload, payload);
          // Saved offline: the owner could not be warned about a number already
          // saved elsewhere; keep both, merging comes later (docs/09 §2, P1).
          await this.customers.create(auth, { ...input, allowDuplicatePhone: true }, { id: entityId, siteId });
          break;
        }
        case 'equipment.create':
          await this.customers.addEquipment(auth, parse(CreateEquipmentSchema, payload), entityId);
          break;
        case 'enquiry.create':
          await this.enquiries.create(auth, parse(CreateEnquirySchema, payload), entityId);
          break;
        case 'job.create':
          await this.jobs.create(auth, parse(CreateJobSchema, payload), entityId);
          break;
      }
      return { status: 'applied' };
    } catch (e) {
      if (e instanceof AppError) return { status: e.status === 409 ? 'conflict' : 'rejected', code: e.code };
      throw e;
    }
  }
}

function parse<T extends z.ZodType>(schema: T, payload: unknown): z.infer<T> {
  const r = schema.safeParse(payload ?? {});
  if (!r.success) throw new AppError(400, 'VALIDATION_FAILED', 'The saved details are not valid.');
  return r.data;
}
