import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { api, deleteAccount, useSession } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import { ProfileSection } from './profile-section';

jest.mock('@/features/sync/sync-engine', () => ({ unsentCount: jest.fn(async () => 0) }));
jest.mock('@/features/auth/session', () => ({
  ...jest.requireActual('@/features/auth/session'),
  deleteAccount: jest.fn(),
}));

const mockDelete = deleteAccount as jest.MockedFunction<typeof deleteAccount>;

function signIn(role: 'OWNER' | 'HELPER') {
  useSession.setState({
    status: 'signedIn',
    profile: {
      user: { id: 'u1', phone: '+919000002201', email: null, name: 'Test', preferredLanguage: 'en' },
      membership: { organizationId: 'o1', memberId: 'm1', role },
    },
  });
}

/** Presses the dialog's destructive button, as the user would. */
function confirmAlert(spy: jest.SpyInstance) {
  const buttons = spy.mock.calls[0][2] as AlertButton[];
  buttons.find((b) => b.style === 'destructive')?.onPress?.();
}

beforeAll(setupI18n);
beforeEach(() => {
  mockDelete.mockReset();
  // Help asks the server for the support contacts.
  jest.spyOn(api, 'get').mockImplementation(async () => ({ whatsapp: null, email: null }) as never);
});

describe('Delete my account', () => {
  it('asks first, then deletes', async () => {
    mockDelete.mockResolvedValue();
    signIn('HELPER');
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderScreen(<ProfileSection />);
    await fireEvent.press(screen.getByText('Delete my account'));

    expect(spy.mock.calls[0][1]).toContain('Work you did stays with the business');
    expect(mockDelete).not.toHaveBeenCalled();
    confirmAlert(spy);
    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
    spy.mockRestore();
  });

  it('warns an owner that the business closes for everyone', async () => {
    signIn('OWNER');
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderScreen(<ProfileSection />);
    await fireEvent.press(screen.getByText('Delete my account'));

    expect(spy.mock.calls[0][1]).toContain('Your business will be closed for everyone');
    spy.mockRestore();
  });
});
