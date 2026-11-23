import { describe, expect, it } from 'vitest';
import { planAllowsType, planState, teamLimit } from './plans.js';

const now = new Date('2026-12-20T12:00:00Z');
const day = (d: number) => new Date(now.getTime() + d * 86_400_000);
const trial = (end: Date) => ({ plan: 'TRIAL', status: 'TRIALING' as const, currentPeriodEnd: end, trialEndsAt: end });

describe('planState (D-045)', () => {
  it('a business without a subscription row is not limited', () => {
    expect(planState(null, now).access).toBe('FULL');
  });

  it('trial: full, then 7 grace days, then view-only', () => {
    expect(planState(trial(day(1)), now)).toMatchObject({ plan: 'TRIAL', access: 'FULL' });
    expect(planState(trial(day(-1)), now).access).toBe('GRACE');
    expect(planState(trial(day(-7)), now).access).toBe('GRACE');
    expect(planState(trial(day(-7.01)), now).access).toBe('READ_ONLY');
    expect(planState(trial(day(-1)), now).graceEndsAt).toEqual(day(6));
  });

  it('a paid plan ends on its period end; cancelled is view-only at once', () => {
    const paid = { plan: 'CREW', status: 'ACTIVE' as const, currentPeriodEnd: day(10), trialEndsAt: day(-50) };
    expect(planState(paid, now)).toMatchObject({ plan: 'CREW', endsAt: day(10), access: 'FULL' });
    expect(planState({ ...paid, status: 'CANCELLED' }, now).access).toBe('READ_ONLY');
    expect(planState({ ...paid, plan: 'UNKNOWN' }, now).plan).toBe('TRIAL');
  });

  it('plans allow their business types and team limits', () => {
    expect(planAllowsType('TRIAL', 'VENDOR')).toBe(true);
    expect(planAllowsType('SOLO', 'CREW')).toBe(false);
    expect(planAllowsType('CREW', 'SOLO')).toBe(true);
    expect(planAllowsType('BUSINESS', 'VENDOR')).toBe(true);
    expect([teamLimit('TRIAL'), teamLimit('BUSINESS')]).toEqual([null, 10]);
  });
});
