import { isOpen, nextStatus, type JobAction } from './jobs.state.js';

const STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;
const ACTIONS: JobAction[] = ['assign', 'start', 'hold', 'complete', 'cancel'];

/** Every allowed move; everything else must be refused (exhaustive, T4.6). */
const ALLOWED: Record<string, string> = {
  'NEW assign': 'ASSIGNED',
  'ASSIGNED assign': 'ASSIGNED',
  'ON_HOLD assign': 'ON_HOLD',
  'ASSIGNED start': 'IN_PROGRESS',
  'ON_HOLD start': 'IN_PROGRESS',
  'ASSIGNED hold': 'ON_HOLD',
  'IN_PROGRESS hold': 'ON_HOLD',
  'ASSIGNED complete': 'COMPLETED',
  'IN_PROGRESS complete': 'COMPLETED',
  'NEW cancel': 'CANCELLED',
  'ASSIGNED cancel': 'CANCELLED',
  'IN_PROGRESS cancel': 'CANCELLED',
  'ON_HOLD cancel': 'CANCELLED',
};

describe('job state machine', () => {
  for (const status of STATUSES) {
    for (const action of ACTIONS) {
      const expected = ALLOWED[`${status} ${action}`] ?? null;
      it(`${status} + ${action} → ${expected ?? 'refused'}`, () => {
        expect(nextStatus(status, action)).toBe(expected);
      });
    }
  }

  it('closed jobs never reopen', () => {
    for (const action of ACTIONS) {
      expect(nextStatus('COMPLETED', action)).toBeNull();
      expect(nextStatus('CANCELLED', action)).toBeNull();
    }
    expect(isOpen('COMPLETED')).toBe(false);
    expect(isOpen('CANCELLED')).toBe(false);
    expect(isOpen('ON_HOLD')).toBe(true);
  });
});
