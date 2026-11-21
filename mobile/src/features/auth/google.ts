import Constants, { ExecutionEnvironment } from 'expo-constants';

import { ApiError } from '@/api/errors';

/**
 * Google Sign-In (D-025). The native module exists only in our own app build
 * (EAS / `expo run:android`), not in Expo Go, so it is loaded lazily.
 */
type GoogleModule = typeof import('@react-native-google-signin/google-signin');

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let mod: GoogleModule | null = null;

function google(): GoogleModule {
  if (inExpoGo) throw new ApiError(0, 'GOOGLE_NEEDS_APP_BUILD', 'Not available in Expo Go');
  if (!mod) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must not load in Expo Go
    mod = require('@react-native-google-signin/google-signin') as GoogleModule;
    mod.GoogleSignin.configure({
      // The Web client ID: Google puts it in the ID token's audience, which the backend checks.
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
  }
  return mod;
}

export const googleAvailable = !inExpoGo;

/** Opens Google's account picker. Returns the ID token, or null if the user cancelled. */
export async function googleIdToken(): Promise<string | null> {
  const { GoogleSignin, statusCodes } = google();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success') return null;
    if (!res.data.idToken) throw new ApiError(0, 'GOOGLE_TOKEN_INVALID', 'No ID token');
    return res.data.idToken;
  } catch (error) {
    const code = (error as { code?: string }).code;
    // Google's own code (e.g. DEVELOPER_ERROR = SHA-1/package/client mismatch) shows in the Metro log.
    if (__DEV__) console.warn('Google sign-in error', code, String(error));
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new ApiError(0, 'GOOGLE_PLAY_SERVICES', 'Play services missing');
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'GOOGLE_TOKEN_INVALID', String(error));
  }
}

/**
 * Forget the chosen account, so the next login shows the picker (shared phones).
 * Loads the module if needed: after an app restart the session comes from
 * SecureStore and Google was never touched, but it still remembers the account.
 */
export async function googleSignOut(): Promise<void> {
  if (!googleAvailable) return;
  try {
    await google().GoogleSignin.signOut();
  } catch {
    // Never block logout on Google.
  }
}
