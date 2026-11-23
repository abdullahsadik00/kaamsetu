import { SetMetadata } from '@nestjs/common';
import type { BusinessType, Prisma, SubscriptionStatus } from '../generated/prisma/client.js';

/**
 * Paid plans (D-045, T7.1). Each plan allows some business types (D-044), so
 * the screens a business gets follow from the type it may pick. Prices in
 * paise; a year costs ten months. Shown only inside the app (D-014).
 */
export type PlanId = 'SOLO' | 'CREW' | 'BUSINESS';

export const PLANS: Record<PlanId, { monthly: number; yearly: number; types: readonly BusinessType[]; maxTeams: number | null }> = {
  SOLO: { monthly: 29_900, yearly: 299_000, types: ['SOLO'], maxTeams: null },
  CREW: { monthly: 49_900, yearly: 499_000, types: ['SOLO', 'CREW'], maxTeams: null },
  BUSINESS: { monthly: 149_900, yearly: 1_499_000, types: ['SOLO', 'CREW', 'VENDOR'], maxTeams: 10 },
};

export const isPlanId = (v: string): v is PlanId => v in PLANS;

/** The cheapest plan that allows a business type: what the plan screen suggests. */
export const planFor = (type: BusinessType): PlanId => (type === 'SOLO' ? 'SOLO' : type === 'CREW' ? 'CREW' : 'BUSINESS');

/** Days after a trial or paid period ends when everything still works, with a reminder. */
export const GRACE_DAYS = 7;

/** FULL: all works. GRACE: all works, pay soon. READ_ONLY: see and export, no new work. */
export type Access = 'FULL' | 'GRACE' | 'READ_ONLY';

export type PlanState = {
  plan: PlanId | 'TRIAL';
  status: SubscriptionStatus;
  endsAt: Date | null;
  graceEndsAt: Date | null;
  access: Access;
};

type Sub = { plan: string; status: SubscriptionStatus; currentPeriodEnd: Date; trialEndsAt: Date | null };

/** Worked out from the dates each time, so nothing has to run when a period ends. */
export function planState(sub: Sub | null, now = new Date()): PlanState {
  // Businesses from before subscriptions: nothing to enforce.
  if (!sub) return { plan: 'TRIAL', status: 'TRIALING', endsAt: null, graceEndsAt: null, access: 'FULL' };
  const plan = sub.status === 'TRIALING' || !isPlanId(sub.plan) ? 'TRIAL' : sub.plan;
  const endsAt = sub.status === 'TRIALING' ? (sub.trialEndsAt ?? sub.currentPeriodEnd) : sub.currentPeriodEnd;
  const graceEndsAt = new Date(endsAt.getTime() + GRACE_DAYS * 86_400_000);
  const access: Access =
    sub.status === 'CANCELLED' || now > graceEndsAt ? 'READ_ONLY' : now > endsAt ? 'GRACE' : 'FULL';
  return { plan, status: sub.status, endsAt, graceEndsAt, access };
}

/** A trial has everything; a paid plan only its types. */
export const planAllowsType = (plan: PlanState['plan'], type: BusinessType) => plan === 'TRIAL' || PLANS[plan].types.includes(type);

export const teamLimit = (plan: PlanState['plan']) => (plan === 'TRIAL' ? null : PLANS[plan].maxTeams);

export async function loadPlan(prisma: Pick<Prisma.TransactionClient, 'subscription'>, organizationId: string): Promise<PlanState> {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { plan: true, status: true, currentPeriodEnd: true, trialEndsAt: true },
  });
  return planState(sub);
}

export const OPEN_WHEN_READ_ONLY = 'kaamsetu:open-when-read-only';

/**
 * A change that still works once the plan has ended (D-045): finishing work
 * already given out, money for it, and making the business smaller so a
 * cheaper plan fits. Every other owner change is refused with PLAN_ENDED.
 */
export const OpenWhenReadOnly = () => SetMetadata(OPEN_WHEN_READ_ONLY, true);
