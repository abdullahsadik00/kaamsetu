import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { api } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import { JobScreen } from './jobs';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'job-1' }),
  Stack: { Screen: () => null },
}));

const cancelled = {
  id: 'job-1',
  jobNumber: 12,
  type: 'SERVICE',
  status: 'CANCELLED',
  scheduledDate: '2026-11-22',
  timeSlot: 'MORNING',
  amountToCollect: null,
  customerId: 'cust-1',
  customerName: 'Rohan Kulkarni',
  place: 'Kothrud',
  teamId: null,
  teamName: null,
  acCount: 0,
  complaint: null,
  cancelReason: 'Customer not home',
  version: 2,
  enquiry: null,
  customer: { id: 'cust-1', name: 'Rohan Kulkarni', phone: '+919822012345' },
  site: { addressLine1: 'Flat 12', locality: 'Kothrud', city: 'Pune', landmark: null },
  equipment: [],
  report: null,
  collections: [],
  updates: [],
};

beforeAll(setupI18n);
afterEach(() => jest.restoreAllMocks());

const cellOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).parent?.props.style);

describe('Owner job page (BUG-10)', () => {
  it('a cancelled job shows Call | WhatsApp 50/50 and Customer on its own full-width line', async () => {
    jest.spyOn(api, 'get').mockImplementation(((path: string) => Promise.resolve(path.startsWith('/jobs') ? cancelled : [])) as never);
    await renderScreen(<JobScreen />);
    expect(await screen.findByRole('button', { name: 'WhatsApp' })).toBeTruthy();
    expect(cellOf('Call')).toMatchObject({ flex: 1 });
    expect(cellOf('WhatsApp')).toMatchObject({ flex: 1 });
    expect(cellOf('Customer')).not.toMatchObject({ flex: 1 });
    for (const name of ['Call', 'WhatsApp', 'Customer']) {
      expect(screen.getByText(name).props.numberOfLines).toBe(1);
    }
  });
});
