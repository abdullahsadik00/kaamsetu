import Constants from 'expo-constants';

/**
 * Backend base URL (without `/api/v1`).
 *
 * Set `EXPO_PUBLIC_API_URL` (e.g. in `mobile/.env.local`) for staging or a
 * fixed address. In development without it, use the computer that runs Metro
 * on port 3000: Expo Go on a phone and the Android emulator both reach it on
 * the address in `hostUri`.
 */
export function apiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? '10.0.2.2'}:3000`;
}
