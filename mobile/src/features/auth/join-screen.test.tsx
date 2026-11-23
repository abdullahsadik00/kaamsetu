import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ApiError } from '@/api/errors';
import { useOnboardingChoice } from '@/features/onboarding/choice';
import { renderScreen, setupI18n } from '@/testing/render';

import { JoinScreen } from './join-screen';
import { acceptInvite } from './session';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock('@/features/sync/sync-engine', () => ({ unsentCount: jest.fn(async () => 0) }));
jest.mock('./session', () => ({
  ...jest.requireActual('./session'),
  acceptInvite: jest.fn(),
}));

const mockAccept = acceptInvite as jest.MockedFunction<typeof acceptInvite>;

beforeAll(setupI18n);
beforeEach(() => mockAccept.mockReset());

async function openCodeForm() {
  await renderScreen(<JoinScreen />);
  await fireEvent.press(screen.getByText('Enter code instead'));
}

describe('After Get started (D-044)', () => {
  afterEach(() => useOnboardingChoice.setState({ businessType: null }));

  it('a new owner goes straight to Your business', async () => {
    useOnboardingChoice.setState({ businessType: 'SOLO' });
    await renderScreen(<JoinScreen />);
    expect(router.push).toHaveBeenCalledWith('/setup-business');
  });
});

describe('Join your business (phone + code)', () => {
  it('checks the number and code before sending anything', async () => {
    await openCodeForm();
    await fireEvent.changeText(screen.getByLabelText('Your mobile number'), '12345');
    await fireEvent.changeText(screen.getByLabelText('6-digit code from the owner'), '12');
    await fireEvent.press(screen.getByText('Join'));

    expect(await screen.findByText('Number should have 10 digits')).toBeTruthy();
    expect(screen.getByText('The code has 6 digits')).toBeTruthy();
    expect(mockAccept).not.toHaveBeenCalled();
  });

  it('sends the number in +91 form with the code', async () => {
    mockAccept.mockResolvedValue();
    await openCodeForm();
    await fireEvent.changeText(screen.getByLabelText('Your mobile number'), '90000 02101');
    await fireEvent.changeText(screen.getByLabelText('6-digit code from the owner'), '123456');
    await fireEvent.press(screen.getByText('Join'));

    // TanStack Query also passes a context argument; check what we send.
    await waitFor(() => expect(mockAccept).toHaveBeenCalled());
    expect(mockAccept.mock.calls[0][0]).toEqual({ phone: '+919000002101', code: '123456' });
  });

  it('explains a mistyped number in plain words (T3.13)', async () => {
    mockAccept.mockRejectedValue(new ApiError(400, 'INVITE_NOT_FOR_THIS_PHONE', 'x'));
    await openCodeForm();
    await fireEvent.changeText(screen.getByLabelText('Your mobile number'), '9000002109');
    await fireEvent.changeText(screen.getByLabelText('6-digit code from the owner'), '123456');
    await fireEvent.press(screen.getByText('Join'));

    expect(
      await screen.findByText(
        'There is no invite for this mobile number. Check the number, or ask the owner for a new code.',
      ),
    ).toBeTruthy();
  });
});
