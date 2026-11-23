import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { api } from '@/features/auth/session';
import { renderScreen, setupI18n } from '@/testing/render';

import { BusinessDetailsScreen } from './business-details-screen';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const business = { id: 'o1', name: 'Cool Care', phone: '+919876501234', city: 'Pune', gstBills: false, gstin: null, businessType: 'SOLO', features: [] };

beforeAll(setupI18n);
afterEach(() => jest.restoreAllMocks());

describe('Business type in Business details (D-044)', () => {
  it('shows the type and changes it', async () => {
    jest.spyOn(api, 'get').mockResolvedValue(business as never);
    const post = jest.spyOn(api, 'post').mockResolvedValue({ businessType: 'CREW', features: ['EMPLOYEES'] } as never);
    await renderScreen(<BusinessDetailsScreen />);
    expect(await screen.findByText('Alone')).toBeTruthy();

    await fireEvent.press(screen.getByText('Change business type'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Me + one helper or partner' }));
    await fireEvent.press(screen.getByText('Save changes'));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/organization/business-type', { businessType: 'CREW' }));
    expect(await screen.findByText('Business type changed.')).toBeTruthy();
  });

  it('explains why the server refused', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ ...business, businessType: 'CREW', features: ['EMPLOYEES'] } as never);
    jest.spyOn(api, 'post').mockRejectedValue(new ApiError(409, 'TOO_MANY_EMPLOYEES', 'x'));
    await renderScreen(<BusinessDetailsScreen />);
    await fireEvent.press(await screen.findByText('Change business type'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Alone' }));
    await fireEvent.press(screen.getByText('Save changes'));
    expect(await screen.findByText('Remove employees first: this business type has fewer.')).toBeTruthy();
  });
});
