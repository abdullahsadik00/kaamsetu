import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import { api } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import { PlanBanner, PlanScreen } from './plan-screen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const DAY = 86_400_000;
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const PLANS = {
  plans: [
    { id: 'SOLO', monthly: 29_900, yearly: 299_000, types: ['SOLO'], maxTeams: null },
    { id: 'CREW', monthly: 49_900, yearly: 499_000, types: ['SOLO', 'CREW'], maxTeams: null },
    { id: 'BUSINESS', monthly: 149_900, yearly: 1_499_000, types: ['SOLO', 'CREW', 'VENDOR'], maxTeams: 10 },
  ],
  suggested: 'CREW',
  graceDays: 7,
};

function mockServer(plan: object, opts: { businessType?: string; whatsapp?: string | null } = {}) {
  jest.spyOn(api, 'get').mockImplementation(async (path: string) => {
    if (path === '/plans') return PLANS as never;
    if (path === '/support') return { whatsapp: opts.whatsapp === undefined ? '+919800000000' : opts.whatsapp, email: null } as never;
    return { name: 'Cool Care', phone: '+919876501234', businessType: opts.businessType ?? 'CREW', features: ['EMPLOYEES'], plan } as never;
  });
}

beforeAll(setupI18n);
afterEach(() => jest.restoreAllMocks());

describe('Plan & payment (screen 72, D-045)', () => {
  it('trial: days left, the plan that fits is picked, a solo plan is too small for a crew', async () => {
    mockServer({ plan: 'TRIAL', status: 'TRIALING', endsAt: at(22.5), graceEndsAt: at(29.5), access: 'FULL' });
    await renderScreen(<PlanScreen />);
    expect(await screen.findByText('FREE TRIAL')).toBeTruthy();
    expect(screen.getByText('23 days left')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Crew, ₹499 / month' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText('Fits how you work')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Solo, ₹299 / month' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('yearly prices, then pay sends the choice on WhatsApp', async () => {
    mockServer({ plan: 'TRIAL', status: 'TRIALING', endsAt: at(5), graceEndsAt: at(12), access: 'FULL' });
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderScreen(<PlanScreen />);
    await fireEvent.press(await screen.findByText('Yearly · 2 months free'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Business, ₹14,990 / year' }));
    await fireEvent.press(screen.getByText('Pay on WhatsApp'));
    const url = decodeURIComponent(open.mock.calls[0][0]);
    expect(url).toMatch(/^https:\/\/wa\.me\/919800000000\?text=/);
    expect(url).toContain('Business plan for one year (₹14,990) for "Cool Care", business phone +919876501234');
  });

  it('grace days and view-only say what happens', async () => {
    mockServer({ plan: 'CREW', status: 'ACTIVE', endsAt: at(-2), graceEndsAt: at(4.5), access: 'GRACE' });
    await renderScreen(<PlanScreen />);
    expect(await screen.findByText('PAY NOW')).toBeTruthy();
    expect(screen.getByText('Pay within 5 days')).toBeTruthy();
  });

  it('a paid plan shows its end date and is marked as yours', async () => {
    mockServer({ plan: 'BUSINESS', status: 'ACTIVE', endsAt: at(40), graceEndsAt: at(47), access: 'FULL' }, { businessType: 'VENDOR' });
    await renderScreen(<PlanScreen />);
    expect(await screen.findByText('Business plan')).toBeTruthy();
    expect(screen.getByText('Your plan')).toBeTruthy();
  });

  it('says so when no payment contact is set', async () => {
    mockServer({ plan: 'TRIAL', status: 'TRIALING', endsAt: at(5), graceEndsAt: at(12), access: 'FULL' }, { whatsapp: null });
    await renderScreen(<PlanScreen />);
    await screen.findByText('FREE TRIAL');
    await fireEvent.press(screen.getByText('Pay on WhatsApp'));
    expect(await screen.findByText('The payment contact is not set up yet. Please try again later.')).toBeTruthy();
  });
});

describe('Home plan banner (D-045)', () => {
  it('shows nothing while the plan runs', async () => {
    await renderScreen(<PlanBanner plan={{ plan: 'TRIAL', status: 'TRIALING', endsAt: at(3), graceEndsAt: at(10), access: 'FULL' }} />);
    expect(screen.queryByText('Choose plan')).toBeNull();
  });

  it('grace: days to pay; view-only: says so; both open the plan screen', async () => {
    await renderScreen(<PlanBanner plan={{ plan: 'TRIAL', status: 'TRIALING', endsAt: at(-1), graceEndsAt: at(5.5), access: 'GRACE' }} />);
    expect(screen.getByText('Your plan has ended. Pay within 6 days to keep adding work.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Choose plan'));
    expect(router.push).toHaveBeenCalledWith('/plan');

    await renderScreen(<PlanBanner plan={{ plan: 'TRIAL', status: 'TRIALING', endsAt: at(-9), graceEndsAt: at(-2), access: 'READ_ONLY' }} />);
    expect(screen.getByText('View-only: your plan has ended. Choose a plan to add new work.')).toBeTruthy();
  });
});
