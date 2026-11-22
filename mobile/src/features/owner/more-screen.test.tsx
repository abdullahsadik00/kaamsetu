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
