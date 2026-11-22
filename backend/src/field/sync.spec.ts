import type { PrismaService } from '../prisma/prisma.service.js';
import { FieldService, OPERATION_RETENTION_DAYS } from './field.js';
import type { OwnerOps } from './owner-ops.js';
import { dayIn, onFieldPhone, withMyTeam } from './scope.js';

describe('sync operation retention (docs/09 §6)', () => {
  it('removes processed operations older than 30 days and keeps the rest', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 4 });
    const field = new FieldService({ syncOperation: { deleteMany } } as unknown as PrismaService, {} as OwnerOps);
    const now = new Date('2026-11-21T10:00:00.000Z');

    await expect(field.purgeOldOperations(now)).resolves.toBe(4);
    expect(OPERATION_RETENTION_DAYS).toBe(30);
    expect(deleteMany).toHaveBeenCalledWith({ where: { receivedAt: { lt: new Date('2026-10-22T10:00:00.000Z') } } });
  });

  it('takes a shorter window when asked', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const field = new FieldService({ syncOperation: { deleteMany } } as unknown as PrismaService, {} as OwnerOps);
    await field.purgeOldOperations(new Date('2026-11-21T00:00:00.000Z'), 1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { receivedAt: { lt: new Date('2026-11-20T00:00:00.000Z') } } });
  });
});

describe('what a field phone keeps (docs/09 §2)', () => {
  const tz = 'Asia/Kolkata';
  const today = '2026-11-21';
  const job = (status: string, assignedTeamId: string | null = 't1', completedAt: Date | null = null) =>
    ({ status, assignedTeamId, completedAt }) as Parameters<typeof onFieldPhone>[0];

  it('keeps open jobs of my teams only', () => {
    for (const s of ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD']) expect(onFieldPhone(job(s), ['t1'], today, tz)).toBe(true);
    expect(onFieldPhone(job('ASSIGNED', 't2'), ['t1'], today, tz)).toBe(false);
    expect(onFieldPhone(job('ASSIGNED', null), ['t1'], today, tz)).toBe(false);
    expect(onFieldPhone(job('CANCELLED'), ['t1'], today, tz)).toBe(false);
    expect(onFieldPhone(job('NEW'), ['t1'], today, tz)).toBe(false);
  });

  it('a helper lent for a day keeps the other team’s jobs of that day instead of their own (D-038)', () => {
    const scope = { home: ['t1'], lent: new Map([['2026-11-21', 't2']]) };
    const on = (team: string, day: string | null) =>
      onFieldPhone({ ...job('ASSIGNED', team), scheduledDate: day ? new Date(`${day}T00:00:00.000Z`) : null }, scope, today, tz);
    expect(on('t2', '2026-11-21')).toBe(true);
    expect(on('t1', '2026-11-21')).toBe(false);
    expect(on('t1', '2026-11-22')).toBe(true);
    expect(on('t2', '2026-11-22')).toBe(false);
    expect(on('t1', null)).toBe(true);
    expect(withMyTeam({ assignedTeamId: 't3', scheduledDate: new Date('2026-11-21T00:00:00.000Z') }, scope)).toBe(false);
  });

  it('keeps finished jobs only on the day they were finished (business time zone)', () => {
    // 21 Nov 00:30 IST is still 20 Nov in UTC.
    expect(onFieldPhone(job('COMPLETED', 't1', new Date('2026-11-20T19:00:00.000Z')), ['t1'], today, tz)).toBe(true);
    expect(onFieldPhone(job('COMPLETED', 't1', new Date('2026-11-20T18:00:00.000Z')), ['t1'], today, tz)).toBe(false);
    expect(dayIn(tz, new Date('2026-11-20T19:00:00.000Z'))).toBe('2026-11-21');
  });
});
