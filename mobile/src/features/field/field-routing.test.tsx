import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import { migrate } from '@/db/migrations';
import { openNodeDatabase, type NodeSqlDatabase } from '@/db/node-sqlite.testing';
import { api, useSession } from '@/features/auth/session';
import { JobStore } from '@/features/sync/job-store';
import { Outbox } from '@/features/sync/outbox';
import { setupI18n } from '@/testing/render';

import type { FieldJob } from './data';

let mockDb: NodeSqlDatabase;
let mockOutbox: Outbox;
let mockStore: JobStore<FieldJob>;
jest.mock('@/features/sync/sync-engine', () => ({
  currentDb: () => mockDb,
  currentOutbox: () => mockOutbox,
  currentJobStore: () => mockStore,
  notifyLocalSave: jest.fn(),
  syncNow: jest.fn(async () => ({ ok: true })),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-crypto', () => ({ randomUUID: () => '7f1d6f0e-0000-4000-8000-000000000001' }));

const scope = { organizationId: 'o1', memberId: 'm1', role: 'SENIOR_TECHNICIAN' as const };
const job: FieldJob = {
  id: 'job-1',
  jobNumber: 1001,
  type: 'SERVICE',
  status: 'ASSIGNED',
  version: 2,
  scheduledDate: '2026-11-21',
  timeSlot: 'MORNING',
  customer: { name: 'Meera', phone: '+919822011111' },
  locality: 'Kothrud',
  senior: { name: 'Rakesh', phone: '+919000000001' },
  completedAt: null,
  address: 'Flat 1, Kothrud',
  landmark: null,
  complaint: 'Not cooling',
  amountToCollect: 80000,
  equipment: [{ id: 'ac-1', type: 'SPLIT', brand: null, capacityTons: 1.5, locationLabel: 'Bedroom' }],
};

/* eslint-disable @typescript-eslint/no-require-imports -- the real route files, as expo-router loads them */
const routes = () => ({
  '(field)/_layout': require('@/app/(field)/_layout').default,
  '(field)/my-work/_layout': require('@/app/(field)/my-work/_layout').default,
  '(field)/my-work/index': require('@/app/(field)/my-work/index').default,
  '(field)/my-work/[id]': require('@/app/(field)/my-work/[id]').default,
  '(field)/history': require('@/app/(field)/history').default,
  '(field)/profile': () => null,
});
const ownerRoutes = () => ({
  '(owner)/_layout': require('@/app/(owner)/_layout').default,
  '(owner)/home': () => null,
  '(owner)/jobs': () => null,
  '(owner)/customers': () => null,
  '(owner)/billing': () => null,
  '(owner)/more': () => null,
  '(owner)/my-work/_layout': require('@/app/(owner)/my-work/_layout').default,
  '(owner)/my-work/index': require('@/app/(owner)/my-work/index').default,
  '(owner)/my-work/[id]': require('@/app/(owner)/my-work/[id]').default,
});
/* eslint-enable @typescript-eslint/no-require-imports */

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeAll(setupI18n);
beforeEach(async () => {
  mockDb = openNodeDatabase(':memory:');
  await migrate(mockDb);
  mockOutbox = new Outbox(mockDb);
  mockStore = new JobStore<FieldJob>(mockDb);
  useSession.setState({
    status: 'signedIn',
    profile: { user: { id: 'u1', phone: null, email: null, name: 'T', preferredLanguage: 'en' }, membership: scope },
  });
  await mockStore.setScope(scope);
  await mockStore.replaceAll([job]);
  await mockStore.setCursor('10');
});
afterEach(() => mockDb.close());

describe('Senior opens a job from My Work (BUG-15, TP-16)', () => {
  it('tapping the job card opens its page with Call and Directions, and Back returns to My Work', async () => {
    const r = await renderRouter(routes(), { initialUrl: '/my-work', wrapper: Providers });
    await fireEvent.press(await screen.findByText('Meera'));
    // Before the fix the push to the hidden `job/[id]` tab was refused: the path stayed /my-work.
    expect(await screen.findByRole('button', { name: 'Call' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Directions' })).toBeTruthy();
    expect(r.getPathname()).toBe('/my-work/job-1');

    // The "← My Work" bar (the tab bar's "My Work" is a tab, not a button).
    await fireEvent.press(screen.getByRole('button', { name: 'My Work' }));
    expect(await screen.findByText('Meera')).toBeTruthy();
    expect(r.getPathname()).toBe('/my-work');
  });

  it('"Continue · Finish work" on the job in progress opens it too', async () => {
    await mockStore.replaceAll([{ ...job, status: 'IN_PROGRESS' }]);
    const r = await renderRouter(routes(), { initialUrl: '/my-work', wrapper: Providers });
    await fireEvent.press(await screen.findByRole('button', { name: 'Continue · Finish work' }));
    expect(await screen.findByRole('button', { name: 'Call' })).toBeTruthy();
    expect(r.getPathname()).toBe('/my-work/job-1');
  });
});

describe('Owner who does the field work (D-043)', () => {
  const asOwner = async (inTeam: boolean) => {
    await mockStore.setScope({ ...scope, role: 'OWNER' });
    useSession.setState({
      status: 'signedIn',
      profile: { user: { id: 'u1', phone: null, email: null, name: 'O', preferredLanguage: 'en' }, membership: { ...scope, role: 'OWNER' } },
    });
    jest.spyOn(api, 'get').mockResolvedValue({ id: 'o1', name: 'Cool Air', inTeam } as never);
  };

  it('gets My Work when in a team, and opens a job from it', async () => {
    await asOwner(true);
    const r = await renderRouter(ownerRoutes(), { initialUrl: '/home', wrapper: Providers });
    await fireEvent.press(await screen.findByText('My Work'));
    await fireEvent.press(await screen.findByText('Meera'));
    expect(await screen.findByRole('button', { name: 'Call' })).toBeTruthy();
    expect(r.getPathname()).toBe('/my-work/job-1');
  });

  it('has no My Work tab when not in a team', async () => {
    await asOwner(false);
    await renderRouter(ownerRoutes(), { initialUrl: '/home', wrapper: Providers });
    expect(await screen.findByText('Home')).toBeTruthy();
    expect(screen.queryByText('My Work')).toBeNull();
  });
});
