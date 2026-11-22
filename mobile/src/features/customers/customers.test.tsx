import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ApiError } from '@/api/errors';
import { api } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import { AcFormScreen } from './ac-form-screen';
import { addEquipment, createCustomer, type Customer } from './api';
import { CustomerFormScreen } from './customer-form-screen';
import { CustomersScreen } from './customers-screen';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: 'c1', siteId: 's1' })),
}));
jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  createCustomer: jest.fn(),
  addEquipment: jest.fn(),
}));

const mockCreate = createCustomer as jest.MockedFunction<typeof createCustomer>;
const mockAddAc = addEquipment as jest.MockedFunction<typeof addEquipment>;
const { useLocalSearchParams } = jest.requireMock('expo-router') as {
  useLocalSearchParams: jest.Mock;
};

beforeAll(setupI18n);
beforeEach(() => {
  mockCreate.mockReset();
  mockAddAc.mockReset();
  (router.replace as jest.Mock).mockReset();
});

async function fillCustomer() {
  await fireEvent.changeText(screen.getByLabelText('Name'), ' Meera Joshi ');
  await fireEvent.changeText(screen.getByLabelText('Mobile number'), '98220 45001');
  await fireEvent.changeText(screen.getByLabelText('Address'), 'Flat 12, Sai Heights');
  await fireEvent.changeText(screen.getByLabelText('Area / locality'), 'Kothrud');
}

describe('Add customer (T4.3)', () => {
  beforeEach(() => useLocalSearchParams.mockReturnValue({}));

  it('sends the customer with the first address and opens them', async () => {
    mockCreate.mockResolvedValue({ id: 'new-1' } as Customer);
    await renderScreen(<CustomerFormScreen />);
    await fillCustomer();
    await fireEvent.press(screen.getByText('Save customer'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate.mock.calls[0][0]).toEqual({
      type: 'INDIVIDUAL',
      name: 'Meera Joshi',
      phone: '+919822045001',
      gstBills: false,
      allowDuplicatePhone: false,
      site: { addressLine1: 'Flat 12, Sai Heights', locality: 'Kothrud' },
    });
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/customers/[id]', params: { id: 'new-1' } });
  });

  it('warns about a saved number and can add anyway', async () => {
    mockCreate
      .mockRejectedValueOnce(
        new ApiError(409, 'CUSTOMER_PHONE_EXISTS', 'x', { customerId: 'old-1', name: 'Meera Joshi' }),
      )
      .mockResolvedValueOnce({ id: 'new-2' } as Customer);
    await renderScreen(<CustomerFormScreen />);
    await fillCustomer();
    await fireEvent.press(screen.getByText('Save customer'));

    expect(await screen.findByText('This number is already saved for Meera Joshi.')).toBeTruthy();
    expect(screen.getByText('Open Meera Joshi')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add as a new customer anyway'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
    expect(mockCreate.mock.calls[1][0]).toMatchObject({ allowDuplicatePhone: true });
  });
});

describe('Add AC (T4.4)', () => {
  beforeEach(() => useLocalSearchParams.mockReturnValue({ id: 'c1', siteId: 's1' }));

  it('saves room, type, brand and capacity; extra details stay hidden', async () => {
    mockAddAc.mockResolvedValue({} as never);
    await renderScreen(<AcFormScreen />);
    expect(screen.queryByLabelText('Model (optional)')).toBeNull();

    await fireEvent.press(screen.getByText('Bedroom'));
    await fireEvent.press(screen.getByText('Window'));
    await fireEvent.press(screen.getByText('LG'));
    await fireEvent.press(screen.getByText('1 ton'));
    await fireEvent.press(screen.getByText('Save AC'));

    await waitFor(() =>
      expect(mockAddAc).toHaveBeenCalledWith({
        customerId: 'c1',
        siteId: 's1',
        type: 'WINDOW',
        brand: 'LG',
        capacityTons: 1,
        locationLabel: 'Bedroom',
      }),
    );
  });
});

describe('Archived customers (T4.3, TP-11)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('Show archived customers lists them so one can be brought back', async () => {
    const row = { id: 'c9', name: 'Shreeji Clinic', phone: '+919000004002', place: 'Shivajinagar', acCount: 0 };
    const get = jest.spyOn(api, 'get').mockImplementation(((path: string) =>
      Promise.resolve(path.includes('archived=true') ? [{ ...row, archivedAt: '2026-11-22T10:00:00.000Z' }] : [])) as never);
    await renderScreen(<CustomersScreen />);
    await fireEvent.press(await screen.findByText('Show archived customers'));
    expect(await screen.findByText('Shreeji Clinic')).toBeTruthy();
    expect(get).toHaveBeenCalledWith('/customers?archived=true');
    expect(screen.getByText('Archived customers')).toBeTruthy();
    await fireEvent.press(screen.getByText('Shreeji Clinic'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/customers/[id]', params: { id: 'c9' } });
    await fireEvent.press(screen.getByText('Back to all customers'));
    await waitFor(() => expect(screen.queryByText('Shreeji Clinic')).toBeNull());
  });
});
