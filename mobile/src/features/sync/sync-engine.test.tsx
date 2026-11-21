import NetInfo from '@react-native-community/netinfo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { deleteUserDatabase } from '@/db/database';
import { migrate } from '@/db/migrations';
import { openNodeDatabase, type NodeSqlDatabase } from '@/db/node-sqlite.testing';
import { api, logout, useSession } from '@/features/auth/session';

import { Outbox } from './outbox';
import { currentJobStore, currentOutbox, SyncEngine } from './sync-engine';

let mockDb: NodeSqlDatabase;
jest.mock('@/db/database', () => ({
  openUserDatabase: jest.fn(async () => mockDb),
  deleteUserDatabase: jest.fn(async () => undefined),
}));
jest.mock('@/features/auth/google', () => ({ googleSignOut: jest.fn(async () => undefined), googleIdToken: jest.fn() }));

const job = { id: 'job-1', jobNumber: 1001, status: 'ASSIGNED', scheduledDate: '2026-11-22', timeSlot: null, completedAt: null };

let calls: string[];
let appStateHandler: ((s: AppStateStatus) => void) | null;

function mockServer() {
  jest.spyOn(api, 'get').mockImplementation(async (path: string) => {
    calls.push(`GET ${path}`);
    if (path === '/sync/bootstrap') return { cursor: '5', jobs: [job] } as never;
    return { cursor: '5', jobs: [], removed: [], more: false, reset: false } as never;
  });
  jest.spyOn(api, 'post').mockImplementation(async (path: string, body?: unknown) => {
    calls.push(`POST ${path}`);
    const ops = (body as { operations?: { id: string }[] } | undefined)?.operations ?? [];
    return { results: ops.map((o) => ({ id: o.id, status: 'applied' })) } as never;
  });
}

async function start() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await render(
    <QueryClientProvider client={client}>
      <SyncEngine userId="u1" />
    </QueryClientProvider>,
  );
  await waitFor(async () => expect(await currentJobStore()?.cursor()).toBe('5'));
}

beforeEach(async () => {
  mockDb = openNodeDatabase(':memory:');
  await migrate(mockDb);
  calls = [];
  appStateHandler = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateHandler = handler as (s: AppStateStatus) => void;
    return { remove: jest.fn() } as never;
  });
  useSession.setState({
    status: 'signedIn',
    profile: {
      user: { id: 'u1', phone: null, email: null, name: 'T', preferredLanguage: 'en' },
      membership: { organizationId: 'o1', memberId: 'm1', role: 'SENIOR_TECHNICIAN' },
    },
  });
  mockServer();
});

afterEach(() => {
  jest.restoreAllMocks();
  (NetInfo.addEventListener as jest.Mock).mockClear();
});

describe('SyncEngine (T4.9)', () => {
  it('on app open sends work saved earlier, then downloads the jobs', async () => {
    await new Outbox(mockDb).enqueue({ id: 'op-1', entityType: 'ServiceJob', entityId: 'job-1', operation: 'job.start', payload: {} });

    await start();

    expect(calls).toEqual(['POST /sync/operations', 'GET /sync/bootstrap']);
    expect((await currentJobStore()?.list())?.map((j) => j.id)).toEqual(['job-1']);
    expect(await currentOutbox()?.unsentCount()).toBe(0);
  });

  it('pulls changes when the internet comes back and when the app returns to the front', async () => {
    await start();
    const listener = (NetInfo.addEventListener as jest.Mock).mock.calls.at(-1)?.[0] as (s: object) => void;

    await act(async () => listener({ isConnected: false, isInternetReachable: false }));
    await act(async () => listener({ isConnected: true, isInternetReachable: true }));
    await waitFor(() => expect(calls.filter((c) => c.startsWith('GET /sync/changes'))).toHaveLength(1));

    await act(async () => appStateHandler?.('active'));
    await waitFor(() => expect(calls.filter((c) => c.startsWith('GET /sync/changes'))).toHaveLength(2));
    expect(calls.at(-1)).toBe('GET /sync/changes?cursor=5');
  });

  it('logout removes the phone database and forgets the store', async () => {
    await start();

    await act(() => logout());

    expect(deleteUserDatabase).toHaveBeenCalledWith('u1');
    expect(currentJobStore()).toBeNull();
    expect(currentOutbox()).toBeNull();
    expect(useSession.getState().status).toBe('signedOut');
  });
});
