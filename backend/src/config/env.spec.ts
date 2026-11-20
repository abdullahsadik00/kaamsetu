import { useJsonLogs, validateEnv } from './env.js';

const DB = 'postgresql://u:p@localhost:5432/kaamsetu';
const SECRETS = {
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  OTP_HASH_SECRET: 'y'.repeat(32),
};

describe('validateEnv', () => {
  it('applies defaults', () => {
    expect(validateEnv({ DATABASE_URL: DB, ...SECRETS })).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: DB,
      TRUST_PROXY: 0,
      ...SECRETS,
    });
  });

  it('reads TRUST_PROXY as a small hop count', () => {
    expect(
      validateEnv({ DATABASE_URL: DB, ...SECRETS, TRUST_PROXY: '1' }).TRUST_PROXY,
    ).toBe(1);
    expect(() =>
      validateEnv({ DATABASE_URL: DB, ...SECRETS, TRUST_PROXY: 'true' }),
    ).toThrow(/TRUST_PROXY/);
  });

  it('coerces PORT from a string', () => {
    expect(
      validateEnv({ DATABASE_URL: DB, PORT: '4000', ...SECRETS }).PORT,
    ).toBe(4000);
  });

  it('rejects short secrets', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: DB,
        JWT_ACCESS_SECRET: 'short',
        OTP_HASH_SECRET: 'y'.repeat(32),
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('fails loudly when DATABASE_URL is missing or wrong', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
    expect(() =>
      validateEnv({ DATABASE_URL: 'mysql://x', ...SECRETS }),
    ).toThrow(/postgresql/);
  });
});

describe('useJsonLogs', () => {
  it('uses JSON logs in staging and production by default', () => {
    expect(useJsonLogs({ NODE_ENV: 'production' })).toBe(true);
    expect(useJsonLogs({ NODE_ENV: 'development' })).toBe(false);
  });

  it('lets LOG_FORMAT override the default', () => {
    expect(useJsonLogs({ NODE_ENV: 'development', LOG_FORMAT: 'json' })).toBe(
      true,
    );
  });
});
