import { onlineManager, QueryClient } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { migrate } from '@/db/migrations';
import { openNodeDatabase, type NodeSqlDatabase } from '@/db/node-sqlite.testing';
import { api } from '@/features/auth/session';
import { CustomerFormScreen } from '@/features/customers/customer-form-screen';
import { renderScreen, setupI18n } from '@/testing/render';

import { Outbox } from './outbox';
import { saveOffline } from './owner-offline';
import { PendingSaves } from './pending-saves';

let mockDb: NodeSqlDatabase;
let mockOutbox: Outbox;
const mockNotify = jest.fn();
jest.mock('./sync-engine', () => ({
  currentOutbox: () => mockOutbox,
  notifyLocalSave: () => mockNotify(),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  Stack: { Screen: () => null },
}));

beforeAll(setupI18n);
beforeEach(async () => {
  mockDb = openNodeDatabase(':memory:');
  await migrate(mockDb);
  mockOutbox = new Outbox(mockDb);
  mockNotify.mockClear();
  onlineManager.setOnline(false);
});
afterEach(() => {
  onlineManager.setOnline(true);
  mockDb.close();
});

describe('Owner saves without internet (D-021)', () => {
  it('a new customer waits on the phone with its own ids and opens at once', async () => {
    const post = jest.spyOn(api, 'post');
    await renderScreen(<CustomerFormScreen />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Meera Joshi');
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '98220 45001');
    await fireEvent.changeText(screen.getByLabelText('Address'), 'Flat 12, Sai Heights');
    await fireEvent.press(screen.getByText('Save customer'));

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(post).not.toHaveBeenCalled();
    const [op] = await mockOutbox.unsentOf(['customer.create']);
    expect(op).toMatchObject({ entityType: 'Customer', payload: { name: 'Meera Joshi', phone: '+919822045001', site: { addressLine1: 'Flat 12, Sai Heights' } } });
    expect((op.payload as { siteId: string }).siteId).toEqual(expect.any(String));
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/customers/[id]', params: { id: op.entityId } });
    expect(mockNotify).toHaveBeenCalled();
  });

  it('a job for a customer still waiting is refused with it (dependsOn)', async () => {
    const qc = new QueryClient();
    await saveOffline(qc, 'customer.create', 'cust-1', { name: 'Meera' });
    await saveOffline(qc, 'job.create', 'job-1', { customerId: 'cust-1' }, [{ type: 'Customer', id: 'cust-1' }, { type: 'Equipment', id: 'saved-online' }]);
    const [customer, job] = await mockOutbox.unsentOf(['customer.create', 'job.create']);
    expect(job).toMatchObject({ entityType: 'ServiceJob', entityId: 'job-1', dependsOn: customer.id });
  });

  it('Waiting to send lists them; a refused one shows why and can be let go', async () => {
    const qc = new QueryClient();
    await saveOffline(qc, 'customer.create', 'cust-1', { name: 'Meera' });
    await saveOffline(qc, 'enquiry.create', 'enq-1', { customerId: 'cust-1' });
    const [, enquiry] = await mockOutbox.unsentOf(['customer.create', 'enquiry.create']);
    await mockOutbox.markNeedsAttention(enquiry.id, 'SITE_NOT_FOUND');

    await renderScreen(<PendingSaves />);
    expect(await screen.findByText('Waiting to send (2)')).toBeTruthy();
    expect(screen.getByText('New customer · Meera')).toBeTruthy();
    expect(screen.getByText('Not accepted. Check and add it again. This address was not found.')).toBeTruthy();
    await fireEvent.press(screen.getByText('OK, got it'));
    await waitFor(async () => expect(await mockOutbox.unsentOf(['enquiry.create'])).toEqual([]));
  });
});
