import type { JobStatus } from '../generated/prisma/client.js';

/** What can happen to a job (owner: assign, cancel; technician, T4.7: start, hold, complete). */
export type JobAction = 'assign' | 'start' | 'hold' | 'complete' | 'cancel';

/**
 * The job state machine (docs/05 §5, docs/09 §7: "the server state machine
 * decides"). Returns the next status, or null if the action is not allowed.
 */
const TABLE: Record<JobAction, Partial<Record<JobStatus, JobStatus>>> = {
  // Giving a job to a team (or changing the team). A held job stays on hold.
  assign: { NEW: 'ASSIGNED', ASSIGNED: 'ASSIGNED', ON_HOLD: 'ON_HOLD' },
  start: { ASSIGNED: 'IN_PROGRESS', ON_HOLD: 'IN_PROGRESS' },
  hold: { ASSIGNED: 'ON_HOLD', IN_PROGRESS: 'ON_HOLD' },
  complete: { ASSIGNED: 'COMPLETED', IN_PROGRESS: 'COMPLETED' },
  // The owner may cancel any open job; completed work is never undone.
  cancel: { NEW: 'CANCELLED', ASSIGNED: 'CANCELLED', IN_PROGRESS: 'CANCELLED', ON_HOLD: 'CANCELLED' },
};

export function nextStatus(status: JobStatus, action: JobAction): JobStatus | null {
  return TABLE[action][status] ?? null;
}

/** Details (date, slot, problem, amount) can change until the job is closed. */
export const isOpen = (status: JobStatus) => status !== 'COMPLETED' && status !== 'CANCELLED';
