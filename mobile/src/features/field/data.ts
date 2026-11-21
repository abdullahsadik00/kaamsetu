import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useCallback, useState } from 'react';

import type { SyncState } from '@/components/ui/sync-label';
import { useSession } from '@/features/auth/session';
import { sameScope } from '@/features/sync/job-store';
import { OP_STATUS } from '@/features/sync/job-sync';
import { currentJobStore, currentOutbox, notifyLocalSave, syncNow } from '@/features/sync/sync-engine';
import type { Language } from '@/localization/languages';

// ---------- Data: my team's jobs, kept on the phone (docs/09 §2–3, T4.9) ----------

export type Status = 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'NEW' | 'CANCELLED';
export type Equipment = { id: string; type: string; brand: string | null; capacityTons: number | null; locationLabel: string | null };
export type FieldJob = {
  id: string;
  jobNumber: number;
  type: string;
  status: Status;
  version: number;
  scheduledDate: string | null;
  timeSlot: string | null;
  customer: { name: string; phone: string } | null;
  locality: string | null;
  senior: { name: string; phone: string | null } | null;
  completedAt?: string | null;
  address?: string | null;
  landmark?: string | null;
  complaint?: string | null;
  amountToCollect?: number | null;
  equipment?: Equipment[];
  /** The server took the job away (cancelled, another team) but it still has unsent or refused work. */
  gone?: boolean;
};

export const MY_JOBS = ['my-jobs'] as const;

/**
 * The jobs on the phone. Screens never wait for the network: the sync engine
 * fills the store and refreshes this query when something changed.
 * `ready` is false until the first download has finished.
 */
export async function loadMyJobs(): Promise<{ jobs: FieldJob[]; ready: boolean }> {
  const store = currentJobStore<FieldJob>();
  if (!store) return { jobs: [], ready: false };
  const m = useSession.getState().profile?.membership;
  const scope = await store.scope();
  // Kept for another business or role: the sync engine is about to clear it.
  if (!m || !sameScope(scope, { organizationId: m.organizationId, memberId: m.memberId, role: m.role })) {
    return { jobs: [], ready: false };
  }
  const [jobs, cursor] = await Promise.all([store.list(), store.cursor()]);
  return { jobs, ready: cursor !== null };
}

export function useMyJobs() {
  return useQuery({ queryKey: MY_JOBS, queryFn: loadMyJobs, staleTime: Infinity });
}

/** Pull-to-refresh: send what is waiting, pull changes, then re-read the phone's list. */
export function useRefresh() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncNow();
      await qc.invalidateQueries({ queryKey: MY_JOBS });
      await qc.invalidateQueries({ queryKey: ['job-local'] });
    } finally {
      setRefreshing(false);
    }
  }, [qc]);
  return { refreshing, onRefresh };
}

export type Op = 'job.start' | 'job.hold' | 'job.complete';

export type LocalState = {
  status: Status;
  /** Saved on phone · Sending… · Sent · Needs attention; null when nothing was done on this phone. */
  sync: SyncState | null;
  /** The server's reason shown with "Needs attention" (e.g. JOB_CANCELLED). */
  code: string | null;
  pending: boolean;
  attention: boolean;
};

/** Status as the phone knows it: the server's, moved on by operations not sent yet. */
export async function localState(job: FieldJob): Promise<LocalState> {
  const ops = (await currentOutbox()?.allFor('ServiceJob', job.id)) ?? [];
  let status = job.status;
  for (const o of ops) {
    if (o.state !== 'SENT' && o.state !== 'NEEDS_ATTENTION') status = (OP_STATUS[o.operation] as Status | undefined) ?? status;
  }
  const refused = ops.find((o) => o.state === 'NEEDS_ATTENTION');
  const sync: SyncState | null = refused
    ? 'attention'
    : ops.some((o) => o.state === 'SENDING')
      ? 'sending'
      : ops.some((o) => o.state === 'PENDING' || o.state === 'FAILED_RETRYABLE')
        ? 'saved'
        : ops.length > 0
          ? 'sent'
          : null;
  return {
    status,
    sync,
    code: refused?.lastErrorCode ?? null,
    pending: sync === 'saved' || sync === 'sending',
    attention: !!refused,
  };
}

/** The most urgent label among several jobs (the "done today" line). */
export function worstSync(states: (LocalState | undefined)[]): SyncState | null {
  for (const s of ['attention', 'sending', 'saved', 'sent'] as const) if (states.some((x) => x?.sync === s)) return s;
  return null;
}

/** Local state of one job, refreshed while the sender works through the outbox. */
export function useLocalState(job: FieldJob | undefined) {
  return useQuery({
    queryKey: ['job-local', job?.id, job?.status],
    queryFn: () => localState(job as FieldJob),
    enabled: !!job,
    refetchInterval: 3000,
  });
}

/** Local state of every job in the list, keyed by id (My Work sections). */
export function useLocalStates(jobs: FieldJob[] | undefined) {
  return useQuery({
    queryKey: ['job-local', 'all', jobs?.map((j) => `${j.id}:${j.status}`).join(',')],
    queryFn: async () => {
      const out: Record<string, LocalState> = {};
      for (const j of jobs ?? []) out[j.id] = await localState(j);
      return out;
    },
    enabled: !!jobs,
    refetchInterval: 3000,
  });
}

/** Saves a job action on the phone first (docs/09 §5); the sender delivers it when online. */
export function useSaveOp(job: FieldJob | undefined, onSaved?: (op: Op) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ op, payload }: { op: Op; payload: object }) => {
      const outbox = currentOutbox();
      if (!outbox || !job) throw new Error('Phone storage not ready');
      await outbox.enqueue({ id: randomUUID(), entityType: 'ServiceJob', entityId: job.id, operation: op, payload, baseVersion: job.version });
      notifyLocalSave();
      return op;
    },
    onSuccess: (op) => {
      void qc.invalidateQueries({ queryKey: ['job-local'] });
      onSaved?.(op);
    },
  });
}

/**
 * "OK, got it" on Needs attention: the server kept the refused work for the
 * owner (docs/09 §7), so the phone lets it go. A job the server took away
 * then leaves the phone (`onGone`).
 */
export function useDismissAttention(job: FieldJob | undefined, onGone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const outbox = currentOutbox();
      const store = currentJobStore<FieldJob>();
      if (!outbox || !store || !job) throw new Error('Phone storage not ready');
      await outbox.dismissRefused('ServiceJob', job.id);
      await store.prune();
      return (await store.get(job.id)) === null;
    },
    onSuccess: (removed) => {
      void qc.invalidateQueries({ queryKey: MY_JOBS });
      void qc.invalidateQueries({ queryKey: ['job-local'] });
      if (removed) onGone?.();
    },
  });
}

/** Finished today (by the server, or on this phone and not sent yet). */
export function doneToday(job: FieldJob, today = todayIso()): boolean {
  return !job.completedAt || todayIso(new Date(job.completedAt)) === today;
}

/** Rupees typed by the technician → paise (docs/11 §3); empty or invalid → null. */
export function toPaise(rupees: string): number | null {
  const n = Number(rupees.replace(/[,\s₹]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

export function rupees(paise: number): string {
  return (paise / 100).toLocaleString('en-IN');
}

/** Today's date as YYYY-MM-DD in the phone's time zone. */
export function todayIso(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

const LOCALE: Record<Language, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

/** "Sat, 21 Nov" in the UI language. */
export function shortDate(iso: string | Date, language: Language): string {
  const d = typeof iso === 'string' ? new Date(`${iso}T00:00:00`) : iso;
  try {
    return d.toLocaleDateString(LOCALE[language], { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return d.toDateString();
  }
}
