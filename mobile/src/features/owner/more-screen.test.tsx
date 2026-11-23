import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { api, useSession } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import { OwnerMoreScreen } from './more-screen';

const mockWrite = jest.fn(async (_text: string) => undefined);
const mockShare = jest.fn(async (_uri: string, _o?: object) => undefined);
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class {
    uri: string;
    constructor(dir: string, name: string) {
      this.uri = `${dir}/${name}`;
    }
    create() {}
    write(text: string) {
      return mockWrite(text);
    }
  },
}));
jest.mock('expo-sharing', () => ({ shareAsync: (u: string, o?: object) => mockShare(u, o) }));
jest.mock('@/features/sync/sync-engine', () => ({ unsentCount: jest.fn(async () => 0) }));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const exported = { format: 'kaamsetu-business-export', version: 1, exportedAt: '2026-11-22T10:00:00.000Z', customers: [{ name: 'Meera' }] };

beforeAll(setupI18n);
beforeEach(() => {
  mockWrite.mockClear();
  mockShare.mockClear();
  useSession.setState({
    status: 'signedIn',
    profile: {
      user: { id: 'u1', phone: '+919000002201', email: null, name: 'Owner', preferredLanguage: 'en' },
      membership: { organizationId: 'o1', memberId: 'm1', role: 'OWNER' },
    },
  });
});
afterEach(() => jest.restoreAllMocks());

describe('Download business data (doc 10 §4)', () => {
  it('downloads the export into a file and opens the share sheet', async () => {
    const get = jest.spyOn(api, 'get').mockImplementation(async (path: string) =>
      (path === '/organization/export' ? exported : { name: 'Cool Care' }) as never,
    );
    await renderScreen(<OwnerMoreScreen />);
    await fireEvent.press(screen.getByText('Download business data'));

    await waitFor(() => expect(mockShare).toHaveBeenCalled());
    expect(get).toHaveBeenCalledWith('/organization/export');
    expect(JSON.parse(mockWrite.mock.calls[0][0])).toEqual(exported);
    expect(mockShare).toHaveBeenCalledWith('file:///cache/kaamsetu-data-2026-11-22.json', expect.objectContaining({ mimeType: 'application/json' }));
  });

  it('says so when it cannot download (no internet)', async () => {
    jest.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path === '/organization/export') throw new ApiError(0, 'NETWORK_ERROR', 'offline');
      return { name: 'Cool Care' } as never;
    });
    await renderScreen(<OwnerMoreScreen />);
    await fireEvent.press(screen.getByText('Download business data'));

    expect(await screen.findByText('Could not download. Check the internet and try again.')).toBeTruthy();
    expect(mockShare).not.toHaveBeenCalled();
  });
});

describe('Plan line and row (T7.1, D-045)', () => {
  const DAY = 86_400_000;
  const withPlan = (plan: object | null) =>
    jest.spyOn(api, 'get').mockImplementation(async () => ({ name: 'Cool Care', city: 'Pune', plan }) as never);
  const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

  it('shows the trial days left and opens Plan & payment', async () => {
    withPlan({ plan: 'TRIAL', status: 'TRIALING', endsAt: at(11.5), graceEndsAt: at(18.5), access: 'FULL' });
    await renderScreen(<OwnerMoreScreen />);
    expect((await screen.findByTestId('trial')).props.children).toBe('Free trial · 12 days left');
    expect(screen.getByText('Plan & payment')).toBeTruthy();
  });

  it('a paid plan shows its end date', async () => {
    withPlan({ plan: 'CREW', status: 'ACTIVE', endsAt: at(20), graceEndsAt: at(27), access: 'FULL' });
    await renderScreen(<OwnerMoreScreen />);
    expect((await screen.findByTestId('trial')).props.children).toMatch(/^Crew plan · till /);
  });

  it('view-only says so; data download stays', async () => {
    withPlan({ plan: 'TRIAL', status: 'TRIALING', endsAt: at(-9), graceEndsAt: at(-2), access: 'READ_ONLY' });
    await renderScreen(<OwnerMoreScreen />);
    expect((await screen.findByTestId('trial')).props.children).toBe('View-only · choose a plan');
    expect(screen.getByText('Download business data')).toBeTruthy();
  });

  it('shows nothing for a server without plans', async () => {
    withPlan(null);
    await renderScreen(<OwnerMoreScreen />);
    await screen.findByText('Cool Care');
    expect(screen.queryByTestId('trial')).toBeNull();
    expect(screen.queryByText('Plan & payment')).toBeNull();
  });
});

describe('More by business type (D-044)', () => {
  const as = (businessType: string, features: string[]) =>
    jest.spyOn(api, 'get').mockImplementation(async () => ({ name: 'Cool Care', city: 'Pune', businessType, features }) as never);

  it('a solo technician sees no Teams or Employees', async () => {
    as('SOLO', []);
    await renderScreen(<OwnerMoreScreen />);
    await screen.findByText('Cool Care');
    expect(screen.queryByText('Teams')).toBeNull();
    expect(screen.queryByText('Employees')).toBeNull();
  });

  it('a crew sees Employees but not Teams', async () => {
    as('CREW', ['EMPLOYEES']);
    await renderScreen(<OwnerMoreScreen />);
    expect(await screen.findByText('Employees')).toBeTruthy();
    expect(screen.queryByText('Teams')).toBeNull();
  });

  it('a vendor sees both', async () => {
    as('VENDOR', ['TEAMS', 'EMPLOYEES', 'STAFF_UPDATES']);
    await renderScreen(<OwnerMoreScreen />);
    expect(await screen.findByText('Teams')).toBeTruthy();
    expect(screen.getByText('Employees')).toBeTruthy();
  });
});
