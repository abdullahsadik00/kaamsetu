import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ApiError } from '@/api/errors';
import { renderScreen, setupI18n } from '@/testing/render';

import { AddEmployeeScreen } from './add-employee-screen';
import { addEmployee } from './api';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  addEmployee: jest.fn(),
}));

const mockAdd = addEmployee as jest.MockedFunction<typeof addEmployee>;

beforeAll(setupI18n);
beforeEach(() => {
  mockAdd.mockReset();
  (router.replace as jest.Mock).mockReset();
});

async function fill(name: string, phone: string) {
  await fireEvent.changeText(screen.getByLabelText('Name'), name);
  await fireEvent.changeText(screen.getByLabelText('Mobile number'), phone);
}

describe('Add employee (D-027)', () => {
  it('adds a helper and opens their page for the invite QR', async () => {
    mockAdd.mockResolvedValue({
      id: 'emp-1',
      role: 'HELPER',
      status: 'ACTIVE',
      joinedAt: '2026-11-20T00:00:00Z',
      user: { name: 'Manoj', phone: '+919000002201' },
      loginLinked: false,
    });
    await renderScreen(<AddEmployeeScreen />);
    await fill('Manoj', '9000002201');
    await fireEvent.press(screen.getByText('Helper'));
    await fireEvent.press(screen.getByText('Save and invite'));

    await waitFor(() =>
      expect(mockAdd).toHaveBeenCalledWith({ name: 'Manoj', phone: '+919000002201', role: 'HELPER' }),
    );
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/employees/[id]',
      params: { id: 'emp-1' },
    });
  });

  it('defaults to senior technician', async () => {
    mockAdd.mockRejectedValue(new ApiError(409, 'EMPLOYEE_EXISTS', 'x'));
    await renderScreen(<AddEmployeeScreen />);
    await fill('Rakesh', '9000002101');
    await fireEvent.press(screen.getByText('Save and invite'));

    await waitFor(() =>
      expect(mockAdd).toHaveBeenCalledWith({
        name: 'Rakesh',
        phone: '+919000002101',
        role: 'SENIOR_TECHNICIAN',
      }),
    );
    expect(await screen.findByText('This mobile number is already in your business.')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('refuses an invalid mobile', async () => {
    await renderScreen(<AddEmployeeScreen />);
    await fill('X', '123');
    await fireEvent.press(screen.getByText('Save and invite'));
    expect(await screen.findByText('Number should have 10 digits')).toBeTruthy();
    expect(screen.getByText('Enter a name')).toBeTruthy();
    expect(mockAdd).not.toHaveBeenCalled();
  });
});
