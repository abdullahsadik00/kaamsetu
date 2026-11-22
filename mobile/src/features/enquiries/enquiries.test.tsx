import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { api } from '@/features/auth/session';
import { NewJobScreen } from '@/features/jobs/jobs';
import { renderScreen, setupI18n } from '@/testing/render';

import { EnquiryList, EnquiryScreen } from './enquiries';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    replace: (...a: unknown[]) => mockReplace(...a),
    navigate: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
}));

const row = {
  id: 'enq-1',
  number: 215,
  status: 'OPEN',
  source: 'WHATSAPP',
  type: 'REPAIR',
  complaint: 'Hall AC makes noise at night',
  preferredDate: null,
  preferredSlot: null,
  customerId: 'cust-1',
  customerName: 'Rohan Kulkarni',
  siteId: 'site-1',
  place: 'Kothrud',
  acCount: 1,
  createdAt: '2026-11-21T04:45:00.000Z',
  jobId: null,
  jobNumber: null,
};
const enquiry = {
  ...row,
  closeReason: null,
  version: 1,
  customer: { id: 'cust-1', name: 'Rohan Kulkarni', phone: '+919822012345' },
  site: { addressLine1: 'Flat 12', locality: 'Kothrud', city: 'Pune' },
  equipment: [{ id: 'ac-1', type: 'SPLIT', brand: 'Voltas', capacityTons: 1.5, locationLabel: 'Hall' }],
  job: null,
};
const customer = {
  id: 'cust-1',
  name: 'Rohan Kulkarni',
  phone: '+919822012345',
  sites: [{ id: 'site-1', label: null, addressLine1: 'Flat 12', locality: 'Kothrud', equipment: enquiry.equipment }],
};

beforeAll(setupI18n);
beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockParams = {};
});
afterEach(() => jest.restoreAllMocks());

describe('Enquiries (T4.5)', () => {
  it('lists open enquiries with source and problem, and opens one', async () => {
    const get = jest.spyOn(api, 'get').mockResolvedValue([row] as never);
    await renderScreen(<EnquiryList />);
    expect(await screen.findByText('Rohan Kulkarni')).toBeTruthy();
    expect(screen.getByText('Repair · Kothrud · via WhatsApp')).toBeTruthy();
    expect(screen.getByText('“Hall AC makes noise at night”')).toBeTruthy();
    expect(get).toHaveBeenCalledWith('/enquiries?status=OPEN');
    await fireEvent.press(screen.getByText('Rohan Kulkarni'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/enquiries/[id]', params: { id: 'enq-1' } });
  });

  it('enquiry page converts and closes with a reason', async () => {
    mockParams = { id: 'enq-1' };
    jest.spyOn(api, 'get').mockResolvedValue(enquiry as never);
    const post = jest.spyOn(api, 'post').mockResolvedValue({ ...enquiry, status: 'CLOSED' } as never);
    await renderScreen(<EnquiryScreen />);
    expect(await screen.findByText('Hall')).toBeTruthy();
    await fireEvent.press(screen.getByText('Convert to job'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/jobs/new', params: { enquiryId: 'enq-1' } });

    await fireEvent.press(screen.getByText('Close enquiry'));
    await fireEvent.changeText(screen.getByLabelText('Why is it closed?'), 'Customer found someone else');
    await fireEvent.press(screen.getAllByText('Close enquiry').at(-1)!);
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/enquiries/enq-1/close', { reason: 'Customer found someone else' }),
    );
  });

  it('the form saves an enquiry with where it came from', async () => {
    mockParams = { customerId: 'cust-1' };
    jest.spyOn(api, 'get').mockImplementation(((path: string) =>
      Promise.resolve(path.startsWith('/customers') ? customer : [])) as never);
    const post = jest.spyOn(api, 'post').mockResolvedValue(enquiry as never);
    await renderScreen(<NewJobScreen />);
    await fireEvent.press(await screen.findByText('Call'));
    await fireEvent.press(screen.getByText('Save enquiry'));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/enquiries',
        expect.objectContaining({ customerId: 'cust-1', siteId: 'site-1', source: 'PHONE', type: 'SERVICE' }),
      ),
    );
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/enquiries/[id]', params: { id: 'enq-1' } });
  });

  it('converting fills the form from the enquiry and makes the job', async () => {
    mockParams = { enquiryId: 'enq-1' };
    jest.spyOn(api, 'get').mockImplementation(((path: string) =>
      Promise.resolve(path.startsWith('/enquiries') ? enquiry : path.startsWith('/customers') ? customer : [])) as never);
    const post = jest.spyOn(api, 'post').mockResolvedValue({ id: 'job-9' } as never);
    await renderScreen(<NewJobScreen />);
    expect(await screen.findByDisplayValue('Hall AC makes noise at night')).toBeTruthy();
    expect(screen.queryByText('Save enquiry')).toBeNull();
    await fireEvent.press(screen.getByText('Save job'));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/enquiries/enq-1/convert',
        expect.objectContaining({ equipmentIds: ['ac-1'], type: 'REPAIR', complaint: 'Hall AC makes noise at night', scheduledDate: null }),
      ),
    );
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/jobs/[id]', params: { id: 'job-9' } });
  });

  it('the job button says "Create job & assign" only once a team is picked (BUG-04)', async () => {
    mockParams = { customerId: 'cust-1' };
    jest.spyOn(api, 'get').mockImplementation(((path: string) =>
      Promise.resolve(
        path.startsWith('/customers') ? customer : path === '/teams' ? [{ id: 'team-1', name: 'Team Ravi', active: true }] : [],
      )) as never);
    await renderScreen(<NewJobScreen />);
    expect(await screen.findByRole('button', { name: 'Save job' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save enquiry' })).toBeTruthy();
    await fireEvent.press(await screen.findByText('Team Ravi'));
    expect(screen.getByRole('button', { name: 'Create job & assign' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save job' })).toBeNull();
  });

  it('while saving, both buttons are off, the tapped one says what it is doing, and a second tap does nothing (BUG-06)', async () => {
    mockParams = { customerId: 'cust-1' };
    jest.spyOn(api, 'get').mockImplementation(((path: string) =>
      Promise.resolve(path.startsWith('/customers') ? customer : [])) as never);
    const post = jest.spyOn(api, 'post').mockReturnValue(new Promise(() => {}) as never);
    await renderScreen(<NewJobScreen />);
    const job = await screen.findByRole('button', { name: 'Save job' });
    await fireEvent.press(job);
    await fireEvent.press(job);
    const saving = await screen.findByRole('button', { name: 'Saving job…' });
    expect(screen.getByText('Saving job…')).toBeTruthy();
    expect(saving.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    expect(screen.getByRole('button', { name: 'Save enquiry' }).props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByRole('button', { name: 'Save enquiry' }));
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/jobs', expect.objectContaining({ customerId: 'cust-1' }));
  });

  it('a converted enquiry shows a compact "Job made" chip on its own line at the top (BUG-12)', async () => {
    mockParams = { id: 'enq-1' };
    jest.spyOn(api, 'get').mockResolvedValue({ ...enquiry, status: 'CONVERTED', jobId: 'job-9', jobNumber: 9, job: { id: 'job-9', number: 9 } } as never);
    await renderScreen(<EnquiryScreen />);
    const chip = (await screen.findByText('Job made')).parent;
    expect(StyleSheet.flatten(chip?.props.style)).toMatchObject({ alignSelf: 'flex-start', flexShrink: 0 });
    // Not squeezed into a row beside the saved-at line any more.
    expect(StyleSheet.flatten(chip?.parent?.props.style) ?? {}).not.toMatchObject({ flexDirection: 'row' });
    expect(screen.getByRole('button', { name: 'Open job #9' })).toBeTruthy();
  });
});
