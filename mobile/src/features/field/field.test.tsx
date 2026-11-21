import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ApiError, NETWORK_ERROR } from '@/api/errors';
import { migrate } from '@/db/migrations';
import { openNodeDatabase, type NodeSqlDatabase } from '@/db/node-sqlite.testing';
import { api } from '@/features/auth/session';
import { Outbox } from '@/features/sync/outbox';
import { renderScreen, setupI18n } from '@/testing/render';

import { JobScreen, MyWorkScreen, TodayScreen, toPaise } from './field';

let mockDb: NodeSqlDatabase;
let mockOutbox: Outbox;
const mockNotify = jest.fn();
jest.mock('@/features/sync/sync-engine', () => ({
  currentDb: () => mockDb,
  currentOutbox: () => mockOutbox,
  notifyLocalSave: () => mockNotify(),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a), navigate: jest.fn(), back: jest.fn() } }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '7f1d6f0e-0000-4000-8000-000000000001' }));

const job = {
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
  address: 'Flat 1, Kothrud',
  landmark: null,
  complaint: 'Not cooling',
  amountToCollect: 80000,
  equipment: [{ id: 'ac-1', type: 'SPLIT', brand: null, capacityTons: 1.5, locationLabel: 'Bedroom' }],
};

beforeAll(setupI18n);
beforeEach(async () => {
  mockDb = openNodeDatabase(':memory:');
  await migrate(mockDb);
  mockOutbox = new Outbox(mockDb);
  mockNotify.mockClear();
  mockPush.mockClear();
});
afterEach(() => {
  mockDb.close();
  jest.restoreAllMocks();
});

describe('My Work (T4.7)', () => {
  it('lists the job and opens its page', async () => {
    jest.spyOn(api, 'get').mockResolvedValue([job] as never);
    await renderScreen(<MyWorkScreen />);
    await fireEvent.press(await screen.findByText('Meera'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/job/[id]', params: { id: 'job-1' } });
  });

  it('Start work is saved on the phone first and the job moves to In progress', async () => {
    jest.spyOn(api, 'get').mockResolvedValue([job] as never);
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
    jest.spyOn(api, 'get').mockResolvedValue([{ ...job, status: 'IN_PROGRESS' }] as never);
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

  it('offline: shows the last list kept on the phone', async () => {
    await mockDb.runAsync('INSERT INTO kv (key, value) VALUES (?, ?)', ['myJobs', JSON.stringify([job])]);
    jest.spyOn(api, 'get').mockRejectedValue(new ApiError(0, NETWORK_ERROR, 'offline') as never);
    await renderScreen(<MyWorkScreen />);
    expect(await screen.findByText('Meera')).toBeTruthy();
  });
});

describe("Helper's Today's work (Q-01)", () => {
  it('shows the job and call buttons, and nothing to fill', async () => {
    const { address: _a, complaint: _c, amountToCollect: _m, equipment: _e, landmark: _l, ...slim } = job;
    jest.spyOn(api, 'get').mockResolvedValue([slim] as never);
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
    jest.spyOn(api, 'get').mockResolvedValue([{ ...job, status: 'IN_PROGRESS' }] as never);
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
    jest.spyOn(api, 'get').mockResolvedValue([{ ...job, status: 'IN_PROGRESS' }] as never);
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
