import { useNetInfo } from '@react-native-community/netinfo';
import { screen } from '@testing-library/react-native';

import { useSession } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import { OfflineBanner } from './offline-banner';

const mockNet = useNetInfo as jest.MockedFunction<typeof useNetInfo>;
const TEXT = 'No internet. Keep working. All saved on phone.';

function net(isConnected: boolean | null, isInternetReachable: boolean | null) {
  mockNet.mockReturnValue({ isConnected, isInternetReachable } as ReturnType<typeof useNetInfo>);
}

beforeAll(setupI18n);
beforeEach(() => {
  useSession.setState({
    status: 'signedIn',
    profile: {
      user: { id: 'u1', phone: null, email: null, name: 'T', preferredLanguage: 'en' },
      membership: { organizationId: 'o1', memberId: 'm1', role: 'SENIOR_TECHNICIAN' },
    },
  });
});

describe('OfflineBanner (docs/02 §6, docs/09)', () => {
  it('tells staff to keep working when the phone is offline', async () => {
    net(false, false);
    await renderScreen(<OfflineBanner />);
    expect(screen.getByText(TEXT)).toBeTruthy();
  });

  it('also shows when Wi-Fi is connected but the internet is not reachable', async () => {
    net(true, false);
    await renderScreen(<OfflineBanner />);
    expect(screen.getByText(TEXT)).toBeTruthy();
  });

  it('stays hidden online and while the state is still unknown', async () => {
    net(true, true);
    await renderScreen(<OfflineBanner />);
    expect(screen.queryByText(TEXT)).toBeNull();
    net(null, null);
    await renderScreen(<OfflineBanner />);
    expect(screen.queryByText(TEXT)).toBeNull();
  });

  it('is hidden on the login screens', async () => {
    useSession.setState({ status: 'signedOut', profile: null });
    net(false, false);
    await renderScreen(<OfflineBanner />);
    expect(screen.queryByText(TEXT)).toBeNull();
  });
});
