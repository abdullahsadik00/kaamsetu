import { onlineManager, useQuery, type QueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import type { OutboxOperation } from './outbox';
import { currentOutbox, notifyLocalSave } from './sync-engine';

/**
 * Owner basic offline, saving (D-021, docs/09 §2): without internet the
 * owner's new customers, ACs, enquiries and jobs are saved on the phone with
 * ids made here and sent later in order (`POST /sync/operations`). Bills and
 * payments stay online-only (D-018).
 */
export const OWNER_OPS = ['customer.create', 'equipment.create', 'enquiry.create', 'job.create'] as const;
export type OwnerOp = (typeof OWNER_OPS)[number];
export const isOwnerOp = (o: string): o is OwnerOp => (OWNER_OPS as readonly string[]).includes(o);

const ENTITY: Record<OwnerOp, string> = {
  'customer.create': 'Customer',
  'equipment.create': 'Equipment',
  'enquiry.create': 'ServiceRequest',
  'job.create': 'ServiceJob',
};

export const PENDING_KEY = ['owner-pending'] as const;

/**
 * Saves offline only when the phone already knows it has no internet. A
 * request that fails half-way shows an error instead: the server may have
 * saved it, and saving again offline would make it twice.
 */
export const isOffline = () => !onlineManager.isOnline();

export const newId = () => randomUUID();

/**
 * Puts one save in the outbox. `after` names records it refers to that may
 * still be waiting on this phone (a customer, an AC); the last of their saves
 * becomes `dependsOn`, so this one is refused if that one was.
 */
export async function saveOffline(
  qc: QueryClient,
  operation: OwnerOp,
  entityId: string,
  payload: object,
  after: { type: string; id: string }[] = [],
): Promise<void> {
  const outbox = currentOutbox();
  if (!outbox) throw new Error('Phone storage not ready');
  let dependsOn: string | null = null;
  for (const ref of after) {
    const waiting = await outbox.unsentFor(ref.type, ref.id);
    if (waiting.length) dependsOn = waiting[waiting.length - 1].id;
  }
  await outbox.enqueue({ id: randomUUID(), entityType: ENTITY[operation], entityId, operation, payload, dependsOn });
  notifyLocalSave();
  void qc.invalidateQueries({ queryKey: PENDING_KEY });
}

/** The owner's saves not yet accepted by the server (waiting, or refused with a reason). */
export function usePendingSaves() {
  return useQuery({
    queryKey: PENDING_KEY,
    queryFn: async (): Promise<OutboxOperation[]> => (await currentOutbox()?.unsentOf(OWNER_OPS)) ?? [],
    // Local data: reads the phone, works offline.
    networkMode: 'always',
    staleTime: 0,
  });
}

/** "OK, got it" on a refused save: the server kept it for the owner (docs/09 §7). */
export async function dismissSave(qc: QueryClient, op: OutboxOperation): Promise<void> {
  await currentOutbox()?.dismissRefused(op.entityType, op.entityId);
  void qc.invalidateQueries({ queryKey: PENDING_KEY });
}
