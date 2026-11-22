import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { api } from '@/features/auth/session';
import { dayString } from '@/features/jobs/jobs';
import { renderScreen, setupI18n } from '@/testing/render';

import { DaySwapCard, type DayHelper, type TeamDay } from './day-swap';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const santosh: DayHelper = {
  lendingId: 'lend-1',
  memberId: 'm-santosh',
  name: 'Santosh',
  phone: null,
  fromTeamId: 'team-1',
  fromTeamName: 'Team 1',
  toTeamId: 'team-2',
  toTeamName: 'Team 2',
};
const day = (over: Partial<TeamDay> = {}): TeamDay => ({
  id: 'team-2',
  name: 'Team 2',
  members: [{ memberId: 'm-ravi' }],
  day: dayString(0),
  borrowed: [],
  lentOut: [],
  ...over,
});
const employees = [
  { id: 'm-santosh', role: 'HELPER', status: 'ACTIVE', joinedAt: '', user: { name: 'Santosh', phone: null }, loginLinked: true },
  { id: 'm-ravi', role: 'HELPER', status: 'ACTIVE', joinedAt: '', user: { name: 'Ravi', phone: null }, loginLinked: true },
  { id: 'm-senior', role: 'SENIOR_TECHNICIAN', status: 'ACTIVE', joinedAt: '', user: { name: 'Rakesh', phone: null }, loginLinked: true },
];

const serve = (team: TeamDay) =>
  jest.spyOn(api, 'get').mockImplementation(((path: string) =>
    path === '/employees' ? Promise.resolve(employees) : Promise.resolve(team)) as never);

beforeAll(setupI18n);
afterEach(() => jest.restoreAllMocks());

describe('One-day helper swap (T4.6, D-038)', () => {
  it('says everyone is with their own team when nothing is swapped', async () => {
    const get = serve(day());
    await renderScreen(<DaySwapCard teamId="team-2" teamName="Team 2" />);
    expect(await screen.findByText('Everyone works with their own team.')).toBeTruthy();
    expect(get).toHaveBeenCalledWith(`/teams/team-2?day=${dayString(0)}`);
    await fireEvent.press(screen.getAllByText('Tomorrow')[0]);
    await waitFor(() => expect(get).toHaveBeenCalledWith(`/teams/team-2?day=${dayString(1)}`));
  });

  it('lends a helper who is not in the team for the chosen day', async () => {
    serve(day());
    const post = jest.spyOn(api, 'post').mockResolvedValue(day({ borrowed: [santosh] }) as never);
    await renderScreen(<DaySwapCard teamId="team-2" teamName="Team 2" />);
    await fireEvent.press(await screen.findByText('Lend a helper for a day'));
    // Ravi is already in Team 2 and Rakesh is not a helper: only Santosh is offered.
    expect(await screen.findByText('Santosh')).toBeTruthy();
    expect(screen.queryByText('Ravi')).toBeNull();
    expect(screen.queryByText('Rakesh')).toBeNull();
    await fireEvent.press(screen.getByText('Santosh'));
    await fireEvent.press(screen.getByText('Lend for the day'));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/teams/team-2/day-helpers', { memberId: 'm-santosh', day: dayString(0) }));
  });

  it('shows the refusal in plain words', async () => {
    serve(day());
    jest.spyOn(api, 'post').mockRejectedValue(new ApiError(409, 'ALREADY_LENT', 'x') as never);
    await renderScreen(<DaySwapCard teamId="team-2" teamName="Team 2" />);
    await fireEvent.press(await screen.findByText('Lend a helper for a day'));
    await fireEvent.press(await screen.findByText('Santosh'));
    await fireEvent.press(screen.getByText('Lend for the day'));
    expect(await screen.findByText('This helper already works with another team that day. Undo that first.')).toBeTruthy();
  });

  it('lists borrowed and lent-out helpers and undoes a swap on the team that has the helper', async () => {
    serve(day({ borrowed: [santosh], lentOut: [{ ...santosh, lendingId: 'lend-2', name: 'Ravi', toTeamId: 'team-3', toTeamName: 'Team 3' }] }));
    const del = jest.spyOn(api, 'request').mockResolvedValue(day() as never);
    await renderScreen(<DaySwapCard teamId="team-2" teamName="Team 2" />);
    expect(await screen.findByText('lent from Team 1')).toBeTruthy();
    expect(screen.getByText('with Team 3 for the day')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ravi'));
    expect(await screen.findByText('Undo this swap?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Undo'));
    await waitFor(() => expect(del).toHaveBeenCalledWith('DELETE', '/teams/team-3/day-helpers/lend-2'));
  });
});
