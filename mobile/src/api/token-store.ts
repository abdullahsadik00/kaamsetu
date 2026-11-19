import * as SecureStore from 'expo-secure-store';

/** What the app needs to know about the logged-in user, as `verify-otp` and `refresh` return it. */
export type Role = 'OWNER' | 'SENIOR_TECHNICIAN' | 'HELPER';

export type SessionProfile = {
  /** `phone` is null for a Google user who has not joined a business yet (D-025). */
  user: {
    id: string;
    phone: string | null;
    email: string | null;
    name: string | null;
    preferredLanguage: string;
  };
  membership: { organizationId: string; memberId: string; role: Role } | null;
};

export type StoredTokens = {
  accessToken: string;
  /** Epoch milliseconds. */
  accessExpiresAt: number;
  refreshToken: string;
};

/** Storage for tokens. The app uses SecureStore; tests pass an in-memory one. */
export interface TokenStore {
  getTokens(): Promise<StoredTokens | null>;
  setTokens(tokens: StoredTokens): Promise<void>;
  getProfile(): Promise<SessionProfile | null>;
  setProfile(profile: SessionProfile): Promise<void>;
  clear(): Promise<void>;
}

const KEYS = {
  access: 'ks.accessToken',
  accessExpiresAt: 'ks.accessExpiresAt',
  refresh: 'ks.refreshToken',
  profile: 'ks.session',
} as const;

/** Tokens live only in SecureStore (Android Keystore), never in SQLite or AsyncStorage (docs/10 §1). */
export const secureTokenStore: TokenStore = {
  async getTokens() {
    const [accessToken, expires, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(KEYS.access),
      SecureStore.getItemAsync(KEYS.accessExpiresAt),
      SecureStore.getItemAsync(KEYS.refresh),
    ]);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken, accessExpiresAt: Number(expires) || 0 };
  },
  async setTokens(tokens) {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.access, tokens.accessToken),
      SecureStore.setItemAsync(KEYS.accessExpiresAt, String(tokens.accessExpiresAt)),
      SecureStore.setItemAsync(KEYS.refresh, tokens.refreshToken),
    ]);
  },
  async getProfile() {
    const raw = await SecureStore.getItemAsync(KEYS.profile);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionProfile;
    } catch {
      return null;
    }
  },
  async setProfile(profile) {
    await SecureStore.setItemAsync(KEYS.profile, JSON.stringify(profile));
  },
  async clear() {
    await Promise.all(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key)));
  },
};
