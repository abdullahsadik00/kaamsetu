import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import type { FeedItem, FeedPage } from './api';
import { JobFeed, UpdatesScreen } from './feed';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), navigate: jest.fn(), back: jest.fn() },
}));

const at = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const base = { jobId: 'job-46', jobNumber: 1046, customerName: 'Sunita Rao', by: 'Santosh' };
const rows: FeedItem[] = [
  { ...base, id: 'u-1', kind: 'PART_NEEDED', at: at(1), part: { name: 'MCB 16A', qty: 1, canContinue: true } },
  { ...base, id: 'u-2', kind: 'STATUS', at: at(5), status: 'ON_HOLD', side: 'OURS', note: 'Tool or gas missing' },
  {
    ...base,
    id: 'u-3',
    kind: 'REFUSED',
    at: at(9),
    operation: 'job.complete',
    code: 'JOB_CANCELLED',
    payload: { collected: { amount: 50000, mode: 'CASH' } },
  },
  { ...base, id: 'u-4', kind: 'APPOINTMENT_FIXED', at: at(20), appointment: { date: '2030-01-05', slot: 'MORNING' } },
];

const page = (items: FeedItem[], over: Partial<FeedPage> = {}): FeedPage => ({ items, nextCursor: null, unread: 0, seenUpTo: null, ...over });

beforeAll(setupI18n);
beforeEach(() => mockPush.mockClear());
afterEach(() => jest.restoreAllMocks());

describe('Updates from teams (T4.7)', () => {
  it('lists what teams sent, newest first, and opens the job', async () => {
    jest.spyOn(api, 'get').mockResolvedValue(page(rows) as never);
    await renderScreen(<UpdatesScreen />);
    expect(await screen.findByText('Part needed: 1 MCB 16A')).toBeTruthy();
    expect(screen.getByText("Can't continue: Tool or gas missing")).toBeTruthy();
    expect(screen.getByText("Couldn't apply: job was cancelled")).toBeTruthy();
    expect(screen.getByText('What was saved: Work completed · ₹500 taken (Cash)')).toBeTruthy();
    expect(screen.getByText(/^Appointment fixed: /)).toBeTruthy();
    await fireEvent.press(screen.getByText('Part needed: 1 MCB 16A'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/jobs/[id]', params: { id: 'job-46' } });
  });

  it('marks everything up to the newest row as seen', async () => {
    jest.spyOn(api, 'get').mockResolvedValue(page(rows, { unread: 2 }) as never);
    const post = jest.spyOn(api, 'post').mockResolvedValue({ unread: 0, seenUpTo: rows[0].at } as never);
    await renderScreen(<UpdatesScreen />);
    await waitFor(() => expect(post).toHaveBeenCalledWith('/updates/seen', { upTo: rows[0].at }));
  });

  it('does not mark seen when nothing is new', async () => {
    jest.spyOn(api, 'get').mockResolvedValue(page(rows) as never);
    const post = jest.spyOn(api, 'post');
    await renderScreen(<UpdatesScreen />);
    await screen.findByText('Part needed: 1 MCB 16A');
    expect(post).not.toHaveBeenCalled();
  });

  it('Delays & parts asks for problems only; Show older loads the next page', async () => {
    const get = jest.spyOn(api, 'get').mockImplementation(((path: string) =>
      Promise.resolve(
        path.includes('cursor=') ? page([rows[3]]) : path.includes('PROBLEMS') ? page([rows[0]]) : page(rows.slice(0, 2), { nextCursor: 'c1' }),
      )) as never);
    await renderScreen(<UpdatesScreen />);
    await fireEvent.press(await screen.findByText('Show older'));
    expect(await screen.findByText(/^Appointment fixed: /)).toBeTruthy();
    expect(get).toHaveBeenCalledWith('/updates?filter=ALL&cursor=c1');
    await fireEvent.press(screen.getByText('Delays & parts'));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/updates?filter=PROBLEMS'));
  });

  it('says so when teams sent nothing', async () => {
    jest.spyOn(api, 'get').mockResolvedValue(page([]) as never);
    await renderScreen(<UpdatesScreen />);
    expect(await screen.findByText('No updates from teams yet.')).toBeTruthy();
  });

  it('job page card shows the rows without customer and job number', async () => {
    await renderScreen(<JobFeed items={[rows[1]]} />);
    expect(screen.getByText('Updates from team')).toBeTruthy();
    expect(screen.getByText(/^Santosh · /)).toBeTruthy();
    expect(screen.queryByText(/Sunita Rao/)).toBeNull();
  });
});
