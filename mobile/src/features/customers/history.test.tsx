import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import type { HistoryJob } from './api';
import { AcHistoryScreen, CustomerHistoryCard } from './history';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a) },
  useLocalSearchParams: () => ({ id: 'c1', acId: 'ac-1' }),
  Stack: { Screen: () => null },
}));

const done: HistoryJob = {
  id: 'job-1',
  jobNumber: 12,
  type: 'SERVICE',
  status: 'COMPLETED',
  scheduledDate: '2026-11-20',
  completedAt: '2026-11-20T10:00:00.000Z',
  complaint: 'Not cooling',
  team: 'Team 1',
  outcome: 'COMPLETED',
  reportNote: 'All good',
  parts: [{ name: 'Capacitor', qty: 1 }],
  work: ['CLEANED', 'GAS_FILLED'],
  workNote: 'Gas was low',
};
const hall = { id: 'ac-1', customerId: 'c1', siteId: 's1', type: 'SPLIT', brand: 'Voltas', capacityTons: 1.5, locationLabel: 'Hall', model: null, serialNumber: 'SN-9', refrigerant: null, status: 'ACTIVE' };

beforeAll(setupI18n);
beforeEach(() => mockPush.mockClear());

describe('AC history (T4.4)', () => {
  it('shows the AC and the work done on it in each job; a row opens the job', async () => {
    const get = jest.spyOn(api, 'get').mockResolvedValue({ equipment: hall, jobs: [done] } as never);
    await renderScreen(<AcHistoryScreen />);
    expect(await screen.findByText('Hall')).toBeTruthy();
    expect(get).toHaveBeenCalledWith('/equipment/ac-1/history');
    expect(screen.getByText('SN-9')).toBeTruthy();
    expect(screen.getByText('Cleaned, Gas filled, Capacitor × 1')).toBeTruthy();
    expect(screen.getByText('Gas was low')).toBeTruthy();
    expect(screen.getByText('#12 · Team 1 · Work done')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^#12,/ }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/jobs/[id]', params: { id: 'job-1' } });
  });

  it('says so when the AC was never in a job', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ equipment: hall, jobs: [] } as never);
    await renderScreen(<AcHistoryScreen />);
    expect(await screen.findByText('This AC has not been in a job yet.')).toBeTruthy();
  });

  it("the customer's past jobs card lists jobs with the report note", async () => {
    const { work: _w, workNote: _n, ...job } = done;
    jest.spyOn(api, 'get').mockResolvedValue([job] as never);
    await renderScreen(<CustomerHistoryCard customerId="c1" />);
    expect(await screen.findByText('All good')).toBeTruthy();
    expect(screen.getByText('Capacitor × 1')).toBeTruthy();
  });
});
