import { googleSignOut } from './google';

const mockSignOut = jest.fn(async () => null);
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), signOut: () => mockSignOut() },
  statusCodes: {},
}));

describe('googleSignOut (shared phones)', () => {
  it('forgets the Google account even if sign-in was never opened since the app started', async () => {
    // Session restored from SecureStore: googleIdToken() never ran in this app start.
    await googleSignOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('never blocks logout when Google fails', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('play services gone'));
    await expect(googleSignOut()).resolves.toBeUndefined();
  });
});
