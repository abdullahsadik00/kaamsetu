import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { ApiError } from '@/api/errors';
import { api } from '@/features/auth/session';
import { currentDb, currentOutbox, notifyLocalSave } from '@/features/sync/sync-engine';
import type { Language } from '@/localization/languages';

// ---------- Data: my team's jobs, cached on the phone (docs/09 §2) ----------

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
  address?: string | null;
  landmark?: string | null;
  complaint?: string | null;
  amountToCollect?: number | null;
  equipment?: Equipment[];
};

const CACHE_KEY = 'myJobs';
export const MY_JOBS = ['my-jobs'] as const;

/** Online: fetch and keep a copy. Offline: the last copy, so field staff can keep working. */
export async function loadMyJobs(): Promise<{ jobs: FieldJob[]; offline: boolean }> {
  const db = currentDb();
  try {
    const jobs = await api.get<FieldJob[]>('/my/jobs');
    await db?.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [CACHE_KEY, JSON.stringify(jobs)]);
    return { jobs, offline: false };
  } catch (error) {
    if (!(error instanceof ApiError) || !error.isNetwork) throw error;
    const row = await db?.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [CACHE_KEY]);
    return { jobs: row ? (JSON.parse(row.value) as FieldJob[]) : [], offline: true };
  }
}

export function useMyJobs() {
  return useQuery({ queryKey: MY_JOBS, queryFn: loadMyJobs, refetchInterval: 60_000 });
}

export type Op = 'job.start' | 'job.hold' | 'job.complete';
const NEXT: Record<Op, Status> = { 'job.start': 'IN_PROGRESS', 'job.hold': 'ON_HOLD', 'job.complete': 'COMPLETED' };

export type LocalState = { status: Status; pending: boolean; attention: boolean };

/** Status as the phone knows it: the server's, moved on by operations not sent yet. */
export async function localState(job: FieldJob): Promise<LocalState> {
  const ops = (await currentOutbox()?.unsentFor('ServiceJob', job.id)) ?? [];
  let status = job.status;
  for (const o of ops) if (o.state !== 'NEEDS_ATTENTION') status = NEXT[o.operation as Op] ?? status;
  return {
    status,
    pending: ops.some((o) => o.state !== 'NEEDS_ATTENTION'),
    attention: ops.some((o) => o.state === 'NEEDS_ATTENTION'),
  };
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
