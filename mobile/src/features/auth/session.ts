import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { createApiClient, type SessionResponse } from '@/api/client';
import { apiBaseUrl } from '@/api/config';
import { ApiError } from '@/api/errors';
import { secureTokenStore, type Role, type SessionProfile } from '@/api/token-store';

import { googleIdToken, googleSignOut } from './google';

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  profile: SessionProfile | null;
  /** Phone typed on the login screen, kept for the code screen. Not persisted. */
  pendingPhone: string | null;
  /** Invite token from a `kaamsetu://join` link opened before joining. Not persisted. */
  pendingInvite: string | null;
};

export const useSession = create<SessionState>(() => ({
  status: 'loading',
  profile: null,
  pendingPhone: null,
  pendingInvite: null,
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
      device: device(),
    },
    { auth: false },
  );
  const profile = await api.saveSession(session);
  useSession.setState({ status: 'signedIn', profile, pendingPhone: null });
}

function device() {
  return {
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    ...(Device.modelName ? { label: Device.modelName.slice(0, 60) } : {}),
  };
}

/**
 * Pilot login (D-025). Returns false if the user closed Google's picker.
 * A new Google account arrives without a business and sees "Join your business".
 */
export async function googleLogin(): Promise<boolean> {
  const idToken = await googleIdToken();
  if (!idToken) return false;
  const session = await api.post<SessionResponse>(
    '/auth/google',
    { idToken, device: device() },
    { auth: false },
  );
  const profile = await api.saveSession(session);
  useSession.setState({ status: 'signedIn', profile });
  return true;
}

export type InviteAnswer = { token: string } | { phone: string; code: string };

/** Links this Google login to the employee the owner invited; the app then opens that role's home. */
export async function acceptInvite(answer: InviteAnswer): Promise<void> {
  const session = await api.post<SessionResponse>('/auth/accept-invite', answer);
  const profile = await api.saveSession(session);
  useSession.setState({ status: 'signedIn', profile, pendingInvite: null });
}

export type NewBusiness = {
  name: string;
  ownerName: string;
  /** E.164, e.g. +919876501234. */
  phone: string;
  city?: string;
  gstBills: boolean;
  gstin?: string;
  /** How the business works (D-044). */
  businessType: 'SOLO' | 'CREW' | 'VENDOR';
};

/**
 * "Your business" (T4.1, D-027): creates the business with this user as
 * owner, then refreshes the token so the session carries the OWNER role.
 */
export async function createBusiness(input: NewBusiness): Promise<void> {
  await api.post('/organizations', input);
  await api.refresh();
  const profile = await secureTokenStore.getProfile();
  if (profile) useSession.setState({ status: 'signedIn', profile });
}

/** Reads the invite token from a scanned QR (`kaamsetu://join?t=…`) or a bare token. */
export function inviteTokenFrom(text: string): string | null {
  const trimmed = text.trim();
  const m = trimmed.match(/^kaamsetu:\/\/join\?(?:.*&)?t=([A-Za-z0-9_-]{20,100})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{30,100}$/.test(trimmed) ? trimmed : null;
}

/** Revokes this phone's session on the server when online, then clears everything local. */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Offline or already revoked: still log out locally.
    if (!(error instanceof ApiError)) throw error;
  }
  await clearLocalSession();
}

/** Removes everything this account left on the phone (database, tokens, Google choice). */
async function clearLocalSession(): Promise<void> {
  for (const handler of logoutHandlers) await handler();
  await googleSignOut();
  await secureTokenStore.clear();
  signedOut();
}

/**
 * "Delete my account": the server wipes the person's details (and closes
 * the business for an owner); then the phone is cleared like a logout.
 * Needs internet; on failure nothing local is removed.
 */
export async function deleteAccount(): Promise<void> {
  await api.post('/auth/delete-account', { confirm: true });
  await clearLocalSession();
}

export type HomeRoute = '/welcome' | '/home' | '/my-work' | '/today' | '/join-business';

/** Where each role lands (docs/02 §3). */
export function homeRoute(state: Pick<SessionState, 'status' | 'profile'>): HomeRoute {
  // Signed out: the welcome (screen 51); "I already use KaamSetu" goes to log in.
  if (state.status !== 'signedIn' || !state.profile) return '/welcome';
  const role: Role | undefined = state.profile.membership?.role;
  switch (role) {
    case 'OWNER':
      return '/home';
    case 'SENIOR_TECHNICIAN':
      return '/my-work';
    case 'HELPER':
      return '/today';
    default:
      return '/join-business';
  }
}
