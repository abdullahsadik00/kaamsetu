import { createApiClient } from './client';
import { ApiError } from './errors';
import type { SessionProfile, StoredTokens, TokenStore } from './token-store';

/** In-memory stand-in for SecureStore. */
function memoryStore(tokens: StoredTokens | null): TokenStore & { tokens: StoredTokens | null } {
  let profile: SessionProfile | null = null;
  return {
    tokens,
    async getTokens() {
      return this.tokens;
    },
    async setTokens(t) {
      this.tokens = t;
    },
    async getProfile() {
      return profile;
    },
    async setProfile(p) {
      profile = p;
    },
    async clear() {
      this.tokens = null;
      profile = null;
    },
  };
}

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, statusText: '', json: async () => body }) as Response;

const session = (access: string, refresh: string) => ({
  data: {
    accessToken: access,
    accessTokenExpiresIn: 900,
    refreshToken: refresh,
    user: { id: 'u1', phone: null, email: null, name: 'A', preferredLanguage: 'en' },
    membership: null,
  },
});

const NOW = 1_800_000_000_000;
const fresh = { accessToken: 'a1', refreshToken: 'r1', accessExpiresAt: NOW + 600_000 };

describe('API client', () => {
  it('unwraps { data } and sends the access token', async () => {
    const fetch = jest.fn(async () => json(200, { data: { ok: 1 }, meta: {} }));
    const api = createApiClient({ baseUrl: 'http://x', tokenStore: memoryStore(fresh), fetch, now: () => NOW });
    await expect(api.get('/thing')).resolves.toEqual({ ok: 1 });
    expect(fetch).toHaveBeenCalledWith(
      'http://x/api/v1/thing',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer a1' }) }),
    );
  });

  it('turns { error } into ApiError with the code', async () => {
    const fetch = jest.fn(async () => json(409, { error: { code: 'EMPLOYEE_EXISTS', message: 'm' } }));
    const api = createApiClient({ baseUrl: 'http://x', tokenStore: memoryStore(fresh), fetch, now: () => NOW });
    await expect(api.post('/employees', {})).rejects.toMatchObject({ status: 409, code: 'EMPLOYEE_EXISTS' });
  });

  it('refreshes once on a rejected access token and retries', async () => {
    const store = memoryStore(fresh);
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHENTICATED', message: '' } }))
      .mockResolvedValueOnce(json(200, session('a2', 'r2')))
      .mockResolvedValueOnce(json(200, { data: 'ok' }));
    const api = createApiClient({ baseUrl: 'http://x', tokenStore: store, fetch, now: () => NOW });
    await expect(api.get('/me')).resolves.toBe('ok');
    expect(store.tokens?.refreshToken).toBe('r2');
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer a2');
  });

  it('ends the session when the refresh token is rejected', async () => {
    const store = memoryStore({ ...fresh, accessExpiresAt: NOW - 1 });
    const ended = jest.fn();
    const fetch = jest.fn(async () => json(401, { error: { code: 'REFRESH_REUSED', message: '' } }));
    const api = createApiClient({
      baseUrl: 'http://x',
      tokenStore: store,
      fetch,
      now: () => NOW,
      onSessionEnded: ended,
    });
    await expect(api.get('/me')).rejects.toBeInstanceOf(ApiError);
    expect(ended).toHaveBeenCalled();
    expect(store.tokens).toBeNull();
  });

  it('keeps the session when refreshing fails for lack of network (field staff offline)', async () => {
    const store = memoryStore({ ...fresh, accessExpiresAt: NOW - 1 });
    const ended = jest.fn();
    const fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const api = createApiClient({
      baseUrl: 'http://x',
      tokenStore: store,
      fetch,
      now: () => NOW,
      onSessionEnded: ended,
    });
    await expect(api.get('/me')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(ended).not.toHaveBeenCalled();
    expect(store.tokens?.refreshToken).toBe('r1');
  });

  it('shares one refresh between concurrent requests', async () => {
    const store = memoryStore({ ...fresh, accessExpiresAt: NOW - 1 });
    const fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return url.endsWith('/auth/refresh')
        ? json(200, session('a2', 'r2'))
        : json(200, { data: url });
    });
    const api = createApiClient({ baseUrl: 'http://x', tokenStore: store, fetch, now: () => NOW });
    await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);
    expect(fetch.mock.calls.filter(([u]) => String(u).endsWith('/auth/refresh'))).toHaveLength(1);
  });
});
