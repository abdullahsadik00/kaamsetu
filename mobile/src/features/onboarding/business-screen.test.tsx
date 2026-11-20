import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { createBusiness } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import { BusinessScreen } from './business-screen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('@/features/auth/session', () => ({
  ...jest.requireActual('@/features/auth/session'),
  createBusiness: jest.fn(),
}));

const mockCreate = createBusiness as jest.MockedFunction<typeof createBusiness>;

beforeAll(setupI18n);
beforeEach(() => mockCreate.mockReset());

describe('Your business (T4.1)', () => {
  it('requires a business name, owner name and a valid mobile', async () => {
    await renderScreen(<BusinessScreen />);
    await fireEvent.press(screen.getByText('Create my business'));

    expect(await screen.findByText('Enter your business name')).toBeTruthy();
    expect(screen.getByText('Enter your name')).toBeTruthy();
    expect(screen.getByText('Number should have 10 digits')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('shows GSTIN only when GST bills are on, and checks its format', async () => {
    await renderScreen(<BusinessScreen />);
    expect(screen.queryByLabelText('GSTIN (optional now)')).toBeNull();

    await fireEvent(screen.getByLabelText('We give GST bills'), 'valueChange', true);
    await fireEvent.changeText(screen.getByLabelText('Business name'), 'Cool Care AC');
    await fireEvent.changeText(screen.getByLabelText('Your name'), 'Sadik');
    await fireEvent.changeText(screen.getByLabelText('Business mobile number'), '9876501234');
    await fireEvent.changeText(await screen.findByLabelText('GSTIN (optional now)'), '27ABC');
    await fireEvent.press(screen.getByText('Create my business'));

    expect(await screen.findByText('GSTIN should look like 27ABCDE1234F1Z5')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('sends a clean payload', async () => {
    mockCreate.mockResolvedValue();
    await renderScreen(<BusinessScreen />);
    await fireEvent.changeText(screen.getByLabelText('Business name'), '  Cool Care AC  ');
    await fireEvent.changeText(screen.getByLabelText('Your name'), 'Sadik');
    await fireEvent.changeText(screen.getByLabelText('Business mobile number'), '098765 01234');
    await fireEvent.changeText(screen.getByLabelText('City'), 'Pune');
    await fireEvent(screen.getByLabelText('We give GST bills'), 'valueChange', true);
    await fireEvent.changeText(await screen.findByLabelText('GSTIN (optional now)'), '27abcde1234f1z5');
    await fireEvent.press(screen.getByText('Create my business'));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        name: 'Cool Care AC',
        ownerName: 'Sadik',
        phone: '+919876501234',
        city: 'Pune',
        gstBills: true,
        gstin: '27ABCDE1234F1Z5',
      }),
    );
  });
});
