import { fireEvent, screen } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { api } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import { OwnerHomeScreen, type Dashboard } from './home-screen';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    navigate: (...a: unknown[]) => mockNavigate(...a),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));

const now = new Date().toISOString();
const full: Dashboard = {
  today: '2026-11-22',
  enquiries: { open: 4, bySource: { WHATSAPP: 3, PHONE: 1 }, newest: { id: 'enq-1', customerName: 'Rohan Kulkarni' } },
  needTeam: {
    count: 2,
    next: { id: 'job-next', jobNumber: 1050, customerName: 'Hotel Annapurna', scheduledDate: null, timeSlot: null },
  },
  needsAction: {
    count: 12,
    items: [
      {
        kind: 'HOLD_OURS',
        jobId: 'job-46',
        jobNumber: 1046,
        customerName: 'Sunita Rao',
        teamName: 'Team 1',
        note: 'Tool or gas missing',
        at: now,
      },
      { kind: 'NOT_SCHEDULED', jobId: 'job-53', jobNumber: 1053, customerName: 'Shreeji Clinic', teamName: null, note: null, at: now },
    ],
  },
  todayByStatus: { total: 6, NEW: 1, ASSIGNED: 1, IN_PROGRESS: 1, ON_HOLD: 2, COMPLETED: 1 },
  latest: [
    { jobId: 'job-43', jobNumber: 1043, customerName: 'Meera Joshi', toStatus: 'COMPLETED', note: null, by: 'Santosh', at: now },
  ],
  money: { toCollect: 1230400, cashWithTeams: 100000, cashCount: 1, readyToBill: 1 },
};
const empty: Dashboard = {
  today: '2026-11-22',
  enquiries: { open: 0, bySource: {}, newest: null },
  needTeam: { count: 0, next: null },
  needsAction: { count: 0, items: [] },
  todayByStatus: { total: 0, NEW: 0, ASSIGNED: 0, IN_PROGRESS: 0, ON_HOLD: 0, COMPLETED: 0 },
  latest: [],
  money: { toCollect: 0, cashWithTeams: 0, cashCount: 0, readyToBill: 0 },
};

const serve = (dash: Dashboard | Error) =>
  jest.spyOn(api, 'get').mockImplementation(((path: string) => {
    if (path === '/dashboard') return dash instanceof Error ? Promise.reject(dash) : Promise.resolve(dash);
    if (path === '/teams') return Promise.resolve([{ id: 'team-1', active: true }]);
    return Promise.reject(new Error(`unexpected ${path}`));
  }) as never);

beforeAll(setupI18n);
beforeEach(() => {
  mockPush.mockClear();
  mockNavigate.mockClear();
});
afterEach(() => jest.restoreAllMocks());

describe('Owner home dashboard (T4.12)', () => {
  it('shows every card from one dashboard call', async () => {
    const get = serve(full);
    await renderScreen(<OwnerHomeScreen />);
    expect(await screen.findByText('4 open enquiries')).toBeTruthy();
    expect(get).toHaveBeenCalledWith('/dashboard');
    expect(screen.getByText('3 WhatsApp, 1 call · not jobs yet')).toBeTruthy();
    expect(screen.getByText('2 jobs need a team')).toBeTruthy();
    expect(screen.getByText('Needs your action · 12')).toBeTruthy();
    expect(screen.getByText("Can't continue: Tool or gas missing")).toBeTruthy();
    expect(screen.getByText('Sunita Rao · Team 1 · #1046')).toBeTruthy();
    expect(screen.getByText('Appointment not fixed yet')).toBeTruthy();
    expect(screen.getByText('Shreeji Clinic · No team yet · #1053')).toBeTruthy();
    expect(screen.getByText('+10 more')).toBeTruthy();
    expect(screen.getByText('Today · 6')).toBeTruthy();
    expect(screen.getByText('2 Not started')).toBeTruthy();
    expect(screen.getByText('2 On hold')).toBeTruthy();
    expect(screen.getByText('Work completed')).toBeTruthy();
    expect(screen.getByText('1 finished job ready to bill')).toBeTruthy();
    expect(screen.getByText('₹12,304')).toBeTruthy();
    expect(screen.getByText('₹1,000')).toBeTruthy();
    expect(screen.getByText('with teams, to hand over')).toBeTruthy();
  });

  it('taps through to the right screen', async () => {
    serve(full);
    await renderScreen(<OwnerHomeScreen />);
    await fireEvent.press(await screen.findByText('4 open enquiries'));
    expect(mockNavigate).toHaveBeenLastCalledWith({ pathname: '/jobs', params: { show: 'enquiries' } });
    await fireEvent.press(screen.getByText('2 jobs need a team'));
    expect(mockNavigate).toHaveBeenLastCalledWith({ pathname: '/jobs', params: { show: 'open' } });
    await fireEvent.press(screen.getByText('Assign'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/jobs/[id]', params: { id: 'job-next' } });
    await fireEvent.press(screen.getByText("Can't continue: Tool or gas missing"));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/jobs/[id]', params: { id: 'job-46' } });
    await fireEvent.press(screen.getByText('Work completed'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/jobs/[id]', params: { id: 'job-43' } });
    await fireEvent.press(screen.getByText('See all'));
    expect(mockNavigate).toHaveBeenLastCalledWith({ pathname: '/jobs', params: { show: 'today' } });
    await fireEvent.press(screen.getByText('Money to collect'));
    expect(mockNavigate).toHaveBeenLastCalledWith('/billing');
  });

  it('shows calm empty states for a quiet day', async () => {
    serve(empty);
    await renderScreen(<OwnerHomeScreen />);
    expect(await screen.findByText('Nothing needs you right now')).toBeTruthy();
    expect(screen.getByText('No updates from teams yet.')).toBeTruthy();
    expect(screen.queryByText(/open enquir/)).toBeNull();
    expect(screen.queryByText(/need a team/)).toBeNull();
    expect(screen.queryByText(/ready to bill/)).toBeNull();
    expect(screen.getAllByText('₹0')).toHaveLength(2);
  });

  it('shows an error with a retry', async () => {
    const get = serve(new ApiError(500, 'INTERNAL', 'boom'));
    await renderScreen(<OwnerHomeScreen />);
    expect(await screen.findByText("Couldn't load the home screen.")).toBeTruthy();
    get.mockRestore();
    serve(empty);
    await fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('Nothing needs you right now')).toBeTruthy();
  });
});
