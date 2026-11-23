import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderScreen, setupI18n } from '@/testing/render';

import { useOnboardingChoice } from './choice';
import { HowYouWorkScreen, WalkthroughScreen, WelcomeScreen } from './intro';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const push = router.push as jest.Mock;

beforeAll(setupI18n);
beforeEach(() => {
  push.mockReset();
  useOnboardingChoice.setState({ businessType: null });
});

describe('Welcome and walkthrough (screens 51, 52, D-044)', () => {
  it('welcome: Get started asks how you work; an existing user goes to log in', async () => {
    await renderScreen(<WelcomeScreen />);
    await fireEvent.press(screen.getByText('Get started'));
    expect(push).toHaveBeenLastCalledWith('/how-you-work');
    await fireEvent.press(screen.getByText('I already use KaamSetu'));
    expect(push).toHaveBeenLastCalledWith('/login');
  });

  it('how you work: needs a choice, then remembers it', async () => {
    await renderScreen(<HowYouWorkScreen />);
    await fireEvent.press(screen.getByText('Next'));
    expect(await screen.findByText('Choose how you work')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Alone' }));
    await fireEvent.press(screen.getByText('Next'));
    expect(push).toHaveBeenCalledWith('/walkthrough');
    expect(useOnboardingChoice.getState().businessType).toBe('SOLO');
  });

  it('walkthrough: the middle step follows the type, the last goes to log in', async () => {
    useOnboardingChoice.setState({ businessType: 'SOLO' });
    await renderScreen(<WalkthroughScreen />);
    expect(screen.getByText('Every enquiry in one place')).toBeTruthy();
    expect(screen.queryByText('Back')).toBeNull();

    await fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('All your jobs in one list')).toBeTruthy();
    expect(screen.queryByText('Every team knows its work')).toBeNull();
    await fireEvent.press(screen.getByText('Back'));
    expect(screen.getByText('1 of 3')).toBeTruthy();

    await fireEvent.press(screen.getByText('Next'));
    await fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Bills and payments made easy')).toBeTruthy();
    await fireEvent.press(screen.getByText('Continue'));
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('walkthrough: several teams see the team step; Skip goes to log in', async () => {
    useOnboardingChoice.setState({ businessType: 'VENDOR' });
    await renderScreen(<WalkthroughScreen />);
    await fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Every team knows its work')).toBeTruthy();
    await fireEvent.press(screen.getByText('Skip'));
    expect(push).toHaveBeenCalledWith('/login');
  });
});
