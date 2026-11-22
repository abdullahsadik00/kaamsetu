import { Body, Controller, Get, HttpCode, HttpStatus, Injectable, Module, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentAuth } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.js';
import type { AuthContext } from '../auth/token.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { holdSide } from '../dashboard/hold-side.js';
import type { JobStatus, MemberRole, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { scoped } from '../tenancy/tenant.js';

/**
 * One row of "Updates from teams" (Stitch 03, T4.7):
 * - STATUS: a status change by field staff (job status history),
 * - APPOINTMENT_FIXED / PART_NEEDED / NOTE: a field update (JobUpdate),
 * - REFUSED: field work the server could not apply ("Couldn't apply: <reason>", docs/09 §7).
 * `at` is server time (the feed's order); `savedAt` is the phone's time for field updates.
 */
export type FeedKind = 'STATUS' | 'APPOINTMENT_FIXED' | 'PART_NEEDED' | 'NOTE' | 'REFUSED';
export type FeedItem = {
  id: string;
  kind: FeedKind;
  jobId: string;
  /** Null when a refused operation named a job this business does not have. */
  jobNumber: number | null;
  customerName: string | null;
  by: string;
  at: Date;
  savedAt?: Date;
  /** STATUS: the new status; on hold also the side. */
  status?: JobStatus;
  side?: 'OURS' | 'CUSTOMER' | null;
  /** Hold reason, part note, note text, or the note inside refused work. */
  note?: string | null;
  appointment?: { date: string; slot: string };
  part?: { name: string; qty: number; canContinue: boolean };
  /** REFUSED: what the phone sent, why it was refused, and its body as saved. */
  operation?: string;
  code?: string | null;
  payload?: unknown;
};

const STAFF: MemberRole[] = ['SENIOR_TECHNICIAN', 'HELPER'];
export const FEED_PAGE = 30;
const JOB_FEED = 50;
const REFUSED = ['conflict', 'rejected'];

/** Opaque page cursor: the last row's server time and id. */
const CURSOR = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)_([0-9a-f-]{36})$/;
export const encodeCursor = (at: Date, id: string) => `${at.toISOString()}_${id}`;
export function decodeCursor(cursor: string): { at: Date; id: string } | null {
  const m = CURSOR.exec(cursor);
  return m ? { at: new Date(m[1]), id: m[2] } : null;
}

/** Newest first; same time → larger id first (stable across pages). */
export function newestFirst(x: { at: Date; id: string }, y: { at: Date; id: string }): number {
  return y.at.getTime() - x.at.getTime() || (y.id > x.id ? 1 : y.id < x.id ? -1 : 0);
}

const ListQuery = z.strictObject({
  cursor: z.string().regex(CURSOR, 'Cursor from the last page').optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  /** "Delays & parts" tab: holds, parts needed and refused work only. */
  filter: z.enum(['ALL', 'PROBLEMS']).optional(),
});
type ListQuery = z.infer<typeof ListQuery>;

const SeenSchema = z.strictObject({ upTo: z.iso.datetime() });

type Window = { before?: { at: Date; id: string }; after?: Date; jobId?: string; problems?: boolean; take?: number };

/** Owner's feed of what teams sent (T4.7, docs/06 §6). */
@Injectable()
export class UpdatesService {
  constructor(private readonly prisma: PrismaService) {}

  private async staff(auth: AuthContext) {
    return this.prisma.organizationMember.findMany({
      where: scoped(auth, { role: { in: STAFF } }),
      select: { id: true, user: { select: { name: true } } },
    });
  }

  /** Field updates, staff status changes and refused field work, newest first. */
  async list(auth: AuthContext, q: ListQuery) {
    const limit = q.limit ?? FEED_PAGE;
    const before = q.cursor ? (decodeCursor(q.cursor) ?? undefined) : undefined;
    const items = await this.feed(auth, { before, problems: q.filter === 'PROBLEMS', take: limit + 1 });
    const page = items.slice(0, limit);
    const { unread, seenUpTo } = await this.unread(auth);
    return {
      items: page,
      nextCursor: items.length > limit ? encodeCursor(page[page.length - 1].at, page[page.length - 1].id) : null,
      unread,
      seenUpTo,
    };
  }

  /** The job page's feed (owner `GET /jobs/:id`). */
  forJob(auth: AuthContext, jobId: string) {
    return this.feed(auth, { jobId, take: JOB_FEED });
  }

  /** The newest few rows (Home "Latest from teams"). */
  latest(auth: AuthContext, take: number) {
    return this.feed(auth, { take });
  }

  /** How many rows arrived after the owner last opened the feed. */
  async unread(auth: AuthContext): Promise<{ unread: number; seenUpTo: Date | null }> {
    const me = await this.prisma.organizationMember.findFirst({
      where: scoped(auth, { id: auth.memberId as string }),
      select: { updatesSeenAt: true },
    });
    const seenUpTo = me?.updatesSeenAt ?? null;
    const staffIds = (await this.staff(auth)).map((s) => s.id);
    const w = this.where(auth, staffIds, { after: seenUpTo ?? undefined });
    const [a, b, c] = await Promise.all([
      this.prisma.jobUpdate.count({ where: w.updates }),
      this.prisma.jobStatusHistory.count({ where: w.history }),
      this.prisma.syncOperation.count({ where: w.refused }),
    ]);
    return { unread: a + b + c, seenUpTo };
  }

  /** "Seen up to" moves forward only, and never past now. */
  async markSeen(auth: AuthContext, upTo: Date) {
    const now = new Date();
    const at = upTo > now ? now : upTo;
    await this.prisma.organizationMember.updateMany({
      where: scoped(auth, {
        id: auth.memberId as string,
        OR: [{ updatesSeenAt: null }, { updatesSeenAt: { lt: at } }],
      }),
      data: { updatesSeenAt: at },
    });
    return this.unread(auth);
  }

  private where(auth: AuthContext, staffIds: string[], w: Window) {
    const page = (field: 'at' | 'receivedAt') => ({
      ...(w.before
        ? { OR: [{ [field]: { lt: w.before.at } }, { [field]: w.before.at, id: { lt: w.before.id } }] }
        : {}),
      ...(w.after ? { [field]: { gt: w.after } } : {}),
    });
    const updates: Prisma.JobUpdateWhereInput = scoped(auth, {
      ...page('receivedAt'),
      ...(w.jobId ? { jobId: w.jobId } : {}),
      ...(w.problems ? { type: 'PART_NEEDED' as const } : {}),
    });
    const history: Prisma.JobStatusHistoryWhereInput = scoped(auth, {
      ...page('at'),
      byMemberId: { in: staffIds },
      ...(w.jobId ? { jobId: w.jobId } : {}),
      ...(w.problems ? { toStatus: 'ON_HOLD' as const } : {}),
    });
    const refused: Prisma.SyncOperationWhereInput = scoped(auth, {
      ...page('receivedAt'),
      memberId: { in: staffIds },
      result: { in: REFUSED },
      ...(w.jobId ? { entityId: w.jobId } : {}),
    });
    return { updates, history, refused };
  }

  private async feed(auth: AuthContext, w: Window): Promise<FeedItem[]> {
    const staff = await this.staff(auth);
    const who = new Map(staff.map((s) => [s.id, s.user.name ?? '']));
    const where = this.where(auth, staff.map((s) => s.id), w);
    const take = w.take ?? FEED_PAGE;
    const [updates, history, refused] = await Promise.all([
      this.prisma.jobUpdate.findMany({ where: where.updates, orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }], take }),
      this.prisma.jobStatusHistory.findMany({ where: where.history, orderBy: [{ at: 'desc' }, { id: 'desc' }], take }),
      this.prisma.syncOperation.findMany({ where: where.refused, orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }], take }),
    ]);

    const rows: FeedItem[] = [
      ...updates.map((u): FeedItem => {
        const p = (u.payload ?? {}) as Record<string, unknown>;
        const base = { id: u.id, kind: u.type, jobId: u.jobId, by: who.get(u.byMemberId) ?? '', at: u.receivedAt, savedAt: u.createdAt };
        if (u.type === 'APPOINTMENT_FIXED') return { ...base, jobNumber: null, customerName: null, appointment: { date: String(p.date), slot: String(p.slot) } };
        if (u.type === 'PART_NEEDED') {
          return {
            ...base,
            jobNumber: null,
            customerName: null,
            part: { name: String(p.part), qty: Number(p.qty ?? 1), canContinue: p.canContinue !== false },
            note: typeof p.note === 'string' && p.note ? p.note : null,
          };
        }
        return { ...base, jobNumber: null, customerName: null, note: typeof p.text === 'string' ? p.text : null };
      }),
      ...history.map((h): FeedItem => {
        const hold = h.toStatus === 'ON_HOLD' ? holdSide(h.note) : null;
        return {
          id: h.id,
          kind: 'STATUS',
          jobId: h.jobId,
          jobNumber: null,
          customerName: null,
          by: who.get(h.byMemberId) ?? '',
          at: h.at,
          status: h.toStatus,
          ...(hold ? { side: hold.side, note: hold.reason } : { note: h.note }),
        };
      }),
      ...refused.map((r): FeedItem => {
        const p = (r.payload ?? {}) as Record<string, unknown>;
        const text = [p.note, p.reason, p.text].find((x) => typeof x === 'string' && x) as string | undefined;
        return {
          id: r.id,
          kind: 'REFUSED',
          jobId: r.entityId,
          jobNumber: null,
          customerName: null,
          by: who.get(r.memberId) ?? '',
          at: r.receivedAt,
          operation: r.operation,
          code: r.errorCode,
          note: text ?? null,
          payload: r.payload ?? null,
        };
      }),
    ];
    rows.sort(newestFirst);
    const page = rows.slice(0, take);

    // Job number and customer name, only for this business's jobs.
    const jobs = await this.prisma.serviceJob.findMany({
      where: scoped(auth, { id: { in: [...new Set(page.map((r) => r.jobId))] } }),
      select: { id: true, jobNumber: true, customerId: true },
    });
    const customers = await this.prisma.customer.findMany({
      where: scoped(auth, { id: { in: [...new Set(jobs.map((j) => j.customerId))] } }),
      select: { id: true, name: true },
    });
    const job = new Map(jobs.map((j) => [j.id, j]));
    const name = new Map(customers.map((c) => [c.id, c.name]));
    return page.map((r) => {
      const j = job.get(r.jobId);
      return { ...r, jobNumber: j?.jobNumber ?? null, customerName: j ? (name.get(j.customerId) ?? null) : null };
    });
  }
}

@Roles('OWNER')
@Controller('updates')
export class UpdatesController {
  constructor(private readonly updates: UpdatesService) {}

  /** `?cursor=` from the last page's `nextCursor`; `filter=PROBLEMS` for "Delays & parts". */
  @Get()
  list(@CurrentAuth() auth: AuthContext, @Query(new ZodValidationPipe(ListQuery)) q: ListQuery) {
    return this.updates.list(auth, q);
  }

  /** The owner opened the feed: rows received up to `upTo` are read. */
  @Post('seen')
  @HttpCode(HttpStatus.OK)
  seen(@CurrentAuth() auth: AuthContext, @Body(new ZodValidationPipe(SeenSchema)) body: { upTo: string }) {
    return this.updates.markSeen(auth, new Date(body.upTo));
  }
}

@Module({ controllers: [UpdatesController], providers: [UpdatesService], exports: [UpdatesService] })
export class UpdatesModule {}
