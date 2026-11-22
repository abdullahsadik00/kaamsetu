import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { migrate } from '@/db/migrations';
import { openNodeDatabase, type NodeSqlDatabase } from '@/db/node-sqlite.testing';
import { api, useSession } from '@/features/auth/session';
import { JobStore } from '@/features/sync/job-store';
import { Outbox } from '@/features/sync/outbox';
import { renderScreen, setupI18n } from '@/testing/render';

import { dayString } from '@/features/jobs/jobs';

import type { FieldJob } from './data';
import { JobScreen, MyWorkScreen, TodayScreen, toPaise } from './field';

let mockDb: NodeSqlDatabase;
let mockOutbox: Outbox;
let mockStore: JobStore<FieldJob>;
const mockNotify = jest.fn();
const mockSyncNow = jest.fn();
jest.mock('@/features/sync/sync-engine', () => ({
  currentDb: () => mockDb,
  currentOutbox: () => mockOutbox,
  currentJobStore: () => mockStore,
  notifyLocalSave: () => mockNotify(),
  syncNow: () => mockSyncNow(),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), navigate: (...a: unknown[]) => mockNavigate(...a), back: jest.fn() },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '7f1d6f0e-0000-4000-8000-000000000001' }));

const scope = { organizationId: 'o1', memberId: 'm1', role: 'SENIOR_TECHNICIAN' as const };

const job: FieldJob = {
  id: 'job-1',
  jobNumber: 1001,
  type: 'SERVICE',
  status: 'ASSIGNED',
  version: 2,
  scheduledDate: '2026-11-21',
  timeSlot: 'MORNING',
  customer: { name: 'Meera', phone: '+919822011111' },
  locality: 'Kothrud',
  senior: { name: 'Rakesh', phone: '+919000000001' },
  completedAt: null,
  address: 'Flat 1, Kothrud',
  landmark: null,
  complaint: 'Not cooling',
  amountToCollect: 80000,
  equipment: [{ id: 'ac-1', type: 'SPLIT', brand: null, capacityTons: 1.5, locationLabel: 'Bedroom' }],
};

/** Jobs as a finished sync leaves them on the phone. */
async function synced(jobs: FieldJob[], role: 'SENIOR_TECHNICIAN' | 'HELPER' = 'SENIOR_TECHNICIAN') {
  signIn(role);
  await mockStore.setScope({ ...scope, role });
  await mockStore.replaceAll(jobs);
  await mockStore.setCursor('10');
}

function signIn(role: 'SENIOR_TECHNICIAN' | 'HELPER' = 'SENIOR_TECHNICIAN') {
  useSession.setState({
    status: 'signedIn',
    profile: { user: { id: 'u1', phone: null, email: null, name: 'T', preferredLanguage: 'en' }, membership: { ...scope, role } },
  });
}

const saveOp = (state: string, code: string | null = null, operation = 'job.start') =>
  mockDb.runAsync(
    `INSERT INTO outbox (id, entity_type, entity_id, operation, payload, created_at, updated_at, state, last_error_code)
     VALUES (?, 'ServiceJob', 'job-1', ?, '{}', '2026-11-22', '2026-11-22', ?, ?)`,
    [`op-${state}`, operation, state, code],
  );

beforeAll(setupI18n);
beforeEach(async () => {
  mockDb = openNodeDatabase(':memory:');
  await migrate(mockDb);
  mockOutbox = new Outbox(mockDb);
  mockStore = new JobStore<FieldJob>(mockDb);
  mockNotify.mockClear();
  mockSyncNow.mockReset().mockResolvedValue({ ok: true });
  mockPush.mockClear();
  mockNavigate.mockClear();
});
afterEach(() => {
  mockDb.close();
  jest.restoreAllMocks();
});

describe('My Work (T4.7, T4.9)', () => {
  it('lists the job from the phone and opens its page, with no network call', async () => {
    const get = jest.spyOn(api, 'get');
    await synced([job]);
    await renderScreen(<MyWorkScreen />);
    await fireEvent.press(await screen.findByText('Meera'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/job/[id]', params: { id: 'job-1' } });
    expect(get).not.toHaveBeenCalled(); // works fully offline
  });

  it('says the jobs are on their way before the first download', async () => {
    signIn();
    await renderScreen(<MyWorkScreen />);
    expect(await screen.findByText('Getting your jobs…')).toBeTruthy();
    expect(screen.queryByText('No jobs')).toBeNull();
  });

  it('shows nothing kept for another business', async () => {
    await synced([job]);
    useSession.setState({
      profile: { user: { id: 'u1', phone: null, email: null, name: 'T', preferredLanguage: 'en' }, membership: { ...scope, organizationId: 'o2' } },
    });
    await renderScreen(<MyWorkScreen />);
    expect(await screen.findByText('Getting your jobs…')).toBeTruthy();
    expect(screen.queryByText('Meera')).toBeNull();
  });

  it('pull to refresh runs a sync and shows what it brought', async () => {
    await synced([job]);
    await renderScreen(<MyWorkScreen />);
    expect(await screen.findByText('Meera')).toBeTruthy();
    mockSyncNow.mockImplementation(async () => {
      await mockStore.upsert([{ ...job, id: 'job-2', jobNumber: 1002, customer: { name: 'Rohan', phone: '+919000004001' } }]);
      return { ok: true };
    });

    // The ScrollView's pull-to-refresh control, as the user's swipe calls it.
    await act(() => screen.getByTestId('my-work').props.refreshControl.props.onRefresh());

    expect(mockSyncNow).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Rohan')).toBeTruthy();
  });

  it.each([
    ['PENDING', 'Saved on phone'],
    ['FAILED_RETRYABLE', 'Saved on phone'],
    ['SENDING', 'Sending…'],
    ['SENT', 'Sent'],
    ['NEEDS_ATTENTION', 'Needs attention'],
  ])('a job card with a %s operation shows "%s"', async (state, label) => {
    await synced([job]);
    await saveOp(state, state === 'NEEDS_ATTENTION' ? 'JOB_CANCELLED' : null);
    await renderScreen(<MyWorkScreen />);
    expect(await screen.findByText(label)).toBeTruthy();
  });

  it('Start work is saved on the phone first and the job moves to In progress', async () => {
    await synced([job]);
    await renderScreen(<JobScreen id="job-1" />);
    expect(await screen.findByText('Meera')).toBeTruthy();
    expect(screen.getByText('₹800')).toBeTruthy();

    await fireEvent.press(screen.getByText('Start work'));

    await waitFor(() => expect(mockNotify).toHaveBeenCalled());
    const [op] = await mockOutbox.unsentFor('ServiceJob', 'job-1');
    expect(op).toMatchObject({ operation: 'job.start', baseVersion: 2, state: 'PENDING' });
    expect(await screen.findByText('In progress')).toBeTruthy();
    expect(screen.getByText('Saved on phone')).toBeTruthy();
    expect(screen.getByText('Finish work')).toBeTruthy();
  });

  it('Customer not ready is saved as job.hold with the side and reason', async () => {
    await synced([{ ...job, status: 'IN_PROGRESS' }]);
    await renderScreen(<JobScreen id="job-1" />);
    await fireEvent.press(await screen.findByText('Update status'));
    await fireEvent.press(screen.getByText('Customer not ready'));
    await fireEvent.press(screen.getByText('Customer not at home'));
    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(mockNotify).toHaveBeenCalled());
    const [op] = await mockOutbox.unsentFor('ServiceJob', 'job-1');
    expect(op.operation).toBe('job.hold');
    expect(op.payload).toEqual({ side: 'CUSTOMER', reason: 'Customer not at home' });
  });
});

describe('Field updates (T4.7)', () => {
  const open = async (row: string) => {
    await synced([{ ...job, status: 'IN_PROGRESS' }]);
    await renderScreen(<JobScreen id="job-1" />);
    await fireEvent.press(await screen.findByText('Update status'));
    await fireEvent.press(screen.getByText(row));
  };
  const saved = async () => {
    await waitFor(() => expect(mockNotify).toHaveBeenCalled());
    const [op] = await mockOutbox.unsentFor('ServiceJob', 'job-1');
    return op;
  };

  it('Appointment fixed is saved as job.appointment with the day and slot', async () => {
    await open('Appointment fixed');
    await fireEvent.press(screen.getByText('Tomorrow'));
    await fireEvent.press(screen.getByText('Afternoon'));
    await fireEvent.press(screen.getByText('Save'));
    const op = await saved();
    expect(op.operation).toBe('job.appointment');
    expect(op.payload).toEqual({ date: dayString(1), slot: 'AFTERNOON' });
    expect(await screen.findByText('Your updates')).toBeTruthy();
  });

  it('Part needed is saved as job.part with quantity and whether work stopped', async () => {
    await open('Part needed');
    await fireEvent.press(screen.getByText('Capacitor'));
    await fireEvent.press(screen.getByLabelText('How many? +'));
    await fireEvent.press(screen.getByText('No, work stopped'));
    const asks = screen.getAllByText('Ask owner to arrange a part');
    await fireEvent.press(asks[asks.length - 1]);
    const op = await saved();
    expect(op.operation).toBe('job.part');
    expect(op.payload).toEqual({ part: 'Capacitor', qty: 2, canContinue: false });
    expect(await screen.findByText('Part needed: 2 Capacitor')).toBeTruthy();
  });

  it('Note for owner is saved as job.note and listed under Your updates', async () => {
    await open('Note for owner');
    await fireEvent.press(screen.getByText('Need ladder'));
    await fireEvent.press(screen.getByText('Save'));
    const op = await saved();
    expect(op.operation).toBe('job.note');
    expect(op.payload).toEqual({ text: 'Need ladder' });
    expect(await screen.findByText('Note: Need ladder')).toBeTruthy();
    expect(screen.getByText('In progress')).toBeTruthy(); // status unchanged
  });
});

describe('Needs attention (T4.9, docs/09 §7)', () => {
  it.each([
    ['JOB_CANCELLED', 'The owner cancelled this job. What you saved is kept for the owner.'],
    ['JOB_REASSIGNED', 'This job was given to another team. What you saved is kept for the owner.'],
    ['JOB_ALREADY_COMPLETED', 'This job was already finished on another phone.'],
    ['VALIDATION_FAILED', 'This update could not be sent.'],
  ])('%s: the job page says why', async (code, message) => {
    await synced([{ ...job, status: 'IN_PROGRESS' }]);
    await saveOp('NEEDS_ATTENTION', code, 'job.complete');
    await renderScreen(<JobScreen id="job-1" />);
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getAllByText('Needs attention').length).toBeGreaterThan(0);
    expect(screen.getByText('Needs attention · Please call the owner')).toBeTruthy();
  });

  it('a cancelled job taken off the phone shows no actions; "OK, got it" lets it go', async () => {
    await synced([job]);
    await saveOp('NEEDS_ATTENTION', 'JOB_CANCELLED');
    await mockStore.remove(['job-1']); // the pull said it left this phone
    await renderScreen(<JobScreen id="job-1" />);

    expect(await screen.findByText('The owner cancelled this job. What you saved is kept for the owner.')).toBeTruthy();
    expect(screen.queryByText('Start work')).toBeNull();
    await fireEvent.press(screen.getByText('OK, got it'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/my-work'));
    expect(await mockStore.get('job-1')).toBeNull();
    expect(await mockOutbox.unsentCount()).toBe(0);
  });
});

describe("Helper's Today's work (Q-01)", () => {
  it('shows the job and call buttons from the phone, and nothing to fill', async () => {
    const { address: _a, complaint: _c, amountToCollect: _m, equipment: _e, landmark: _l, ...slim } = job;
    await synced([slim], 'HELPER');
    await renderScreen(<TodayScreen />);
    expect(await screen.findByText('Kothrud')).toBeTruthy();
    expect(screen.getByText('Meera')).toBeTruthy();
    expect(screen.getByText('Rakesh')).toBeTruthy();
    expect(screen.getByTestId('call-senior')).toBeTruthy();
    expect(screen.getByTestId('call-customer-job-1')).toBeTruthy();
    expect(screen.queryByText('Start work')).toBeNull();
  });
});

describe('Finish page (T4.8)', () => {
  const pressLastFinish = () => fireEvent.press(screen.getByText('Save and finish'));

  it('sends outcome, work per AC, parts and money in paise with job.complete', async () => {
    await synced([{ ...job, status: 'IN_PROGRESS' }]);
    await renderScreen(<JobScreen id="job-1" />);
    await fireEvent.press(await screen.findByText('Finish work'));
    await fireEvent.press(screen.getByText('Gas filled'));
    await fireEvent.press(screen.getByText('+ Add part used'));
    await fireEvent.press(screen.getByText('Capacitor'));
    await fireEvent.press(screen.getByText('UPI'));
    await pressLastFinish();

    await waitFor(() => expect(mockNotify).toHaveBeenCalled());
    const [op] = await mockOutbox.unsentFor('ServiceJob', 'job-1');
    expect(op.operation).toBe('job.complete');
    expect(op.payload).toEqual({
      outcome: 'COMPLETED',
      work: [{ equipmentId: 'ac-1', work: ['GAS_FILLED'] }],
      parts: [{ name: 'Capacitor', qty: 1 }],
      collected: { amount: 80000, mode: 'UPI' }, // pre-filled with the amount to collect
    });
    expect(await screen.findByText('Work completed')).toBeTruthy(); // confirmation page
  });

  it("needs a reason for couldn't do it", async () => {
    await synced([{ ...job, status: 'IN_PROGRESS' }]);
    await renderScreen(<JobScreen id="job-1" />);
    await fireEvent.press(await screen.findByText('Finish work'));
    await fireEvent.press(screen.getByText("Couldn't do it"));
    await pressLastFinish();
    expect(await screen.findByText("Please write why the work couldn't be done.")).toBeTruthy();
    expect(await mockOutbox.unsentFor('ServiceJob', 'job-1')).toEqual([]);
  });

  it('turns typed rupees into paise', () => {
    expect(toPaise('1,500')).toBe(150000);
    expect(toPaise('₹ 99.5')).toBe(9950);
    expect(toPaise('')).toBeNull();
    expect(toPaise('abc')).toBeNull();
  });
});
