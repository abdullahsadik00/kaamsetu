import { ApiError, NETWORK_ERROR } from './errors';
import type { SessionProfile, TokenStore } from './token-store';

/** Body of `verify-otp` and `refresh` (backend `AuthController.session`). */
export type SessionResponse = SessionProfile & {
  accessToken: string;
  /** Seconds. */
  accessTokenExpiresIn: number;
  refreshToken: string;
};

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
  body?: unknown;
  /** Send the access token (default true). Public routes pass false. */
  auth?: boolean;
  headers?: Record<string, string>;
};

export type ApiClientDeps = {
  baseUrl: string;
  tokenStore: TokenStore;
  fetch?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  /** Called when the server ends the session (refresh token invalid, reused or revoked). */
  onSessionEnded?: () => void;
};

/** Refresh a little before the access token expires, to allow for clock drift. */
const EXPIRY_MARGIN_MS = 30_000;

export function createApiClient(deps: ApiClientDeps) {
  const doFetch = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  const timeoutMs = deps.timeoutMs ?? 20_000;
  let refreshing: Promise<string> | null = null;

  async function send(method: Method, path: string, opts: RequestOptions, accessToken?: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await doFetch(`${deps.baseUrl}/api/v1${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...opts.headers,
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch {
      throw new ApiError(0, NETWORK_ERROR, 'Network request failed');
    } finally {
      clearTimeout(timer);
    }

    const json: unknown = await response.json().catch(() => null);
    if (response.ok) {
      // Success: `{ data, meta }`.
      return (json as { data: unknown } | null)?.data;
    }
    const err = (json as { error?: { code?: string; message?: string; details?: unknown } } | null)
      ?.error;
    throw new ApiError(
      response.status,
      err?.code ?? `HTTP_${response.status}`,
      err?.message ?? response.statusText,
      err?.details,
    );
  }

  /** Stores tokens and profile from a login or refresh response. */
  async function saveSession(session: SessionResponse): Promise<SessionProfile> {
    const profile: SessionProfile = { user: session.user, membership: session.membership };
    await deps.tokenStore.setTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      accessExpiresAt: now() + session.accessTokenExpiresIn * 1000,
    });
    await deps.tokenStore.setProfile(profile);
    return profile;
  }

  /**
   * Rotates the refresh token (one request at a time, shared by concurrent
   * callers). A network failure keeps the session: field staff are never
   * logged out for being offline (docs/10 §1). A 401 ends it.
   */
  function refresh(): Promise<string> {
    refreshing ??= (async () => {
      try {
        const tokens = await deps.tokenStore.getTokens();
        if (!tokens) throw new ApiError(401, 'UNAUTHENTICATED', 'Not logged in');
        const session = (await send(
          'POST',
          '/auth/refresh',
          { body: { refreshToken: tokens.refreshToken } },
        )) as SessionResponse;
        await saveSession(session);
        return session.accessToken;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await deps.tokenStore.clear();
          deps.onSessionEnded?.();
        }
        throw error;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  async function request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
    if (opts.auth === false) return (await send(method, path, opts)) as T;

    const tokens = await deps.tokenStore.getTokens();
    if (!tokens) throw new ApiError(401, 'UNAUTHENTICATED', 'Not logged in');
    let access =
      tokens.accessExpiresAt - EXPIRY_MARGIN_MS <= now() ? await refresh() : tokens.accessToken;
    try {
      return (await send(method, path, opts, access)) as T;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || error.code !== 'UNAUTHENTICATED') {
        throw error;
      }
      // Access token rejected (expired early, server restarted with new keys…): refresh once.
      access = await refresh();
      return (await send(method, path, opts, access)) as T;
    }
  }

  return {
    request,
    get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
    post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
      request<T>('POST', path, { ...opts, body }),
    saveSession,
    refresh,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
