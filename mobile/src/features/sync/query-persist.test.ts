import { QueryClient } from '@tanstack/react-query';

import { migrate } from '@/db/migrations';
import { openNodeDatabase, type NodeSqlDatabase } from '@/db/node-sqlite.testing';

import { keepQueries } from './query-persist';

jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => jest.fn()) }));

const OWNER = 'org-1:m-1:OWNER';
let db: NodeSqlDatabase;
const settle = () => new Promise((r) => setTimeout(r, 20));
const client = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

beforeEach(async () => {
  db = openNodeDatabase(':memory:');
  await migrate(db);
});
afterEach(() => db.close());

describe('Owner screens kept on the phone (D-021)', () => {
  it('what was loaded comes back after a restart, without field jobs', async () => {
    const before = client();
    const stop = await keepQueries(before, db, OWNER, 0);
    before.setQueryData(['customers', 'list', ''], [{ id: 'c1', name: 'Meera' }]);
    before.setQueryData(['my-jobs'], { jobs: [], ready: true });
    await settle();
    stop();

    const after = client();
    const stop2 = await keepQueries(after, db, OWNER, 0);
    expect(after.getQueryData(['customers', 'list', ''])).toEqual([{ id: 'c1', name: 'Meera' }]);
    expect(after.getQueryData(['my-jobs'])).toBeUndefined();
    stop2();
  });

  it("another business or role never sees what was kept", async () => {
    const before = client();
    const stop = await keepQueries(before, db, OWNER, 0);
    before.setQueryData(['billing', 'summary'], { toCollect: 5000 });
    await settle();
    stop();

    const other = client();
    const stop2 = await keepQueries(other, db, 'org-2:m-9:OWNER', 0);
    expect(other.getQueryData(['billing', 'summary'])).toBeUndefined();
    stop2();
    await settle();
    // The old business's copy is gone, not just hidden.
    const back = client();
    (await keepQueries(back, db, OWNER, 0))();
    expect(back.getQueryData(['billing', 'summary'])).toBeUndefined();
  });

  it('failed loads are not kept', async () => {
    const before = client();
    const stop = await keepQueries(before, db, OWNER, 0);
    await before.fetchQuery({ queryKey: ['jobs', 'x'], queryFn: () => Promise.reject(new Error('offline')), retry: false }).catch(() => undefined);
    await settle();
    stop();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', ['queryCache']);
    expect(row?.value ?? '').not.toContain('"jobs","x"');
  });
});
