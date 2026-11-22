import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { api } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import { HelpCard } from './help-card';

beforeAll(setupI18n);
afterEach(() => jest.restoreAllMocks());

const stubSupport = (data: { whatsapp: string | null; email: string | null }) =>
  jest.spyOn(api, 'get').mockImplementation(async () => data as never);

describe('Help (T7.3)', () => {
  it('opens WhatsApp to the support number with the app version in the message', async () => {
    stubSupport({ whatsapp: '+919822070001', email: 'help@example.test' });
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    await renderScreen(<HelpCard />);

    await fireEvent.press(await screen.findByText('Message us on WhatsApp'));
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/919822070001\?text=KaamSetu%20help%20\(version%20/));
    await fireEvent.press(screen.getByText('Email us'));
    expect(open).toHaveBeenLastCalledWith(expect.stringMatching(/^mailto:help@example\.test\?subject=/));
  });

  it('hides contacts that are not set but always offers the privacy policy and terms', async () => {
    stubSupport({ whatsapp: null, email: null });
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    await renderScreen(<HelpCard />);

    await fireEvent.press(await screen.findByText('Privacy policy'));
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/\/privacy$/));
    expect(screen.getByText('Terms of use')).toBeTruthy();
    expect(screen.queryByText('Message us on WhatsApp')).toBeNull();
    expect(screen.queryByText('Email us')).toBeNull();
  });
});
