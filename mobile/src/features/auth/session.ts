import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { createApiClient, type SessionResponse } from '@/api/client';
import { apiBaseUrl } from '@/api/config';
import { ApiError } from '@/api/errors';
import { secureTokenStore, type Role, type SessionProfile } from '@/api/token-store';

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  profile: SessionProfile | null;
  /** Phone typed on the login screen, kept for the code screen. Not persisted. */
  pendingPhone: string | null;
};

export const useSession = create<SessionState>(() => ({
  status: 'loading',
  profile: null,
  pendingPhone: null,
}));

const signedOut = () => useSession.setState({ status: 'signedOut', profile: null });

export const api = createApiClient({
  baseUrl: apiBaseUrl(),
  tokenStore: secureTokenStore,
  onSessionEnded: signedOut,
});

/** Hooks the app can register to clean up local data on logout (e.g. the SQLite cache). */
const logoutHandlers = new Set<() => Promise<void>>();
export function onLogout(handler: () => Promise<void>): () => void {
  logoutHandlers.add(handler);
  return () => logoutHandlers.delete(handler);
}

/**
 * At app start: a saved session opens the app at once, even offline (field
 * staff are never logged out for having no signal). A refresh then runs in
 * the background to pick up role changes; only a 401 ends the session.
 */
export async function restoreSession(): Promise<void> {
  const [tokens, profile] = await Promise.all([
    secureTokenStore.getTokens(),
    secureTokenStore.getProfile(),
  ]);
  if (!tokens || !profile) return signedOut();
  useSession.setState({ status: 'signedIn', profile });
  try {
    await api.refresh();
    const fresh = await secureTokenStore.getProfile();
    if (fresh) useSession.setState({ profile: fresh });
  } catch {
    // Offline or server down: keep working with the saved session.
  }
}

export async function requestOtp(phone: string): Promise<void> {
  await api.post('/auth/request-otp', { phone }, { auth: false });
  useSession.setState({ pendingPhone: phone });
}

export async function verifyOtp(phone: string, code: string): Promise<void> {
  const session = await api.post<SessionResponse>(
    '/auth/verify-otp',
    {
      phone,
      code,
      device: {
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        ...(Device.modelName ? { label: Device.modelName.slice(0, 60) } : {}),
      },
    },
    { auth: false },
  );
  const profile = await api.saveSession(session);
  useSession.setState({ status: 'signedIn', profile, pendingPhone: null });
}

/** Revokes this phone's session on the server when online, then clears everything local. */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Offline or already revoked: still log out locally.
    if (!(error instanceof ApiError)) throw error;
  }
  for (const handler of logoutHandlers) await handler();
  await secureTokenStore.clear();
  signedOut();
}

export type HomeRoute = '/login' | '/home' | '/my-work' | '/today' | '/setup-business';

/** Where each role lands (docs/02 §3). */
export function homeRoute(state: Pick<SessionState, 'status' | 'profile'>): HomeRoute {
  if (state.status !== 'signedIn' || !state.profile) return '/login';
  const role: Role | undefined = state.profile.membership?.role;
  switch (role) {
    case 'OWNER':
      return '/home';
    case 'SENIOR_TECHNICIAN':
      return '/my-work';
    case 'HELPER':
      return '/today';
    default:
      return '/setup-business';
  }
}
