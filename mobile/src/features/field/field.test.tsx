import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ApiError, NETWORK_ERROR } from '@/api/errors';
import { migrate } from '@/db/migrations';
import { openNodeDatabase, type NodeSqlDatabase } from '@/db/node-sqlite.testing';
import { api } from '@/features/auth/session';
import { Outbox } from '@/features/sync/outbox';
import { renderScreen, setupI18n } from '@/testing/render';

import { MyWorkScreen, TodayScreen } from './field';

let mockDb: NodeSqlDatabase;
let mockOutbox: Outbox;
const mockNotify = jest.fn();
jest.mock('@/features/sync/sync-engine', () => ({
  currentDb: () => mockDb,
  currentOutbox: () => mockOutbox,
  notifyLocalSave: () => mockNotify(),
}));
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
  equipment: [],
};

beforeAll(setupI18n);
beforeEach(async () => {
  mockDb = openNodeDatabase(':memory:');
  await migrate(mockDb);
  mockOutbox = new Outbox(mockDb);
  mockNotify.mockClear();
});
afterEach(() => {
  mockDb.close();
  jest.restoreAllMocks();
});

describe('My Work (T4.7)', () => {
  it('Start work is saved on the phone first and the job moves to In progress', async () => {
    jest.spyOn(api, 'get').mockResolvedValue([job] as never);
    await renderScreen(<MyWorkScreen />);
    expect(await screen.findByText('Meera')).toBeTruthy();
    expect(screen.getByText('Collect: ₹800')).toBeTruthy();

    await fireEvent.press(screen.getByText('Start work'));

    await waitFor(() => expect(mockNotify).toHaveBeenCalled());
    const [op] = await mockOutbox.unsentFor('ServiceJob', 'job-1');
    expect(op).toMatchObject({ operation: 'job.start', baseVersion: 2, state: 'PENDING' });
    expect(await screen.findByText('In progress')).toBeTruthy();
    expect(screen.getByText('Saved on phone')).toBeTruthy();
    expect(screen.getByText('Finish work')).toBeTruthy();
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
    expect(await screen.findByText('Service · Kothrud')).toBeTruthy();
    expect(screen.getByText('Call Meera')).toBeTruthy();
    expect(screen.getByText('Call Rakesh (senior)')).toBeTruthy();
    expect(screen.queryByText('Start work')).toBeNull();
  });
});
