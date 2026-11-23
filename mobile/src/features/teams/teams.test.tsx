import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { api } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import { NewTeamScreen } from './teams';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(() => ({})),
}));

const employees = [
  { id: 'o', role: 'OWNER', status: 'ACTIVE', user: { name: 'Owner', phone: null }, loginLinked: true },
  { id: 's1', role: 'SENIOR_TECHNICIAN', status: 'ACTIVE', user: { name: 'Rakesh', phone: null }, loginLinked: true },
  { id: 'h1', role: 'HELPER', status: 'ACTIVE', user: { name: 'Manoj', phone: null }, loginLinked: false },
  { id: 'h2', role: 'HELPER', status: 'INACTIVE', user: { name: 'Gone', phone: null }, loginLinked: false },
];

beforeAll(setupI18n);

describe('Add team (T4.2)', () => {
  it('names it "Team N" by default and sends the chosen senior and helpers', async () => {
    jest.spyOn(api, 'get').mockImplementation(async (path: string) =>
      (path === '/employees' ? employees : [{ id: 't0' }]) as never,
    );
    const post = jest.spyOn(api, 'post').mockResolvedValue({ id: 't1' } as never);

    await renderScreen(<NewTeamScreen />);
    await fireEvent.press(await screen.findByText('Rakesh'));
    await fireEvent.press(screen.getByText('Manoj'));
    expect(screen.queryByText('Gone')).toBeNull(); // removed staff are not offered
    expect(screen.getByPlaceholderText('Team 2')).toBeTruthy();
    await fireEvent.press(screen.getByText('Save team'));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/teams', {
        name: 'Team 2',
        seniorMemberId: 's1',
        helperMemberIds: ['h1'],
      }),
    );
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/teams/[id]', params: { id: 't1' } });
  });

  it('offers the owner as the senior, for a business where the owner does the field work (D-043)', async () => {
    jest.spyOn(api, 'get').mockImplementation(async (path: string) =>
      (path === '/employees' ? employees : []) as never,
    );
    const post = jest.spyOn(api, 'post').mockResolvedValue({ id: 't1' } as never);

    await renderScreen(<NewTeamScreen />);
    await fireEvent.press(await screen.findByText('Owner · Owner'));
    await fireEvent.press(screen.getByText('Save team'));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/teams', { name: 'Team 1', seniorMemberId: 'o', helperMemberIds: [] }),
    );
  });
});
