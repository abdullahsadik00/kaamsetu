import { useJsonLogs, validateEnv } from './env.js';

const DB = 'postgresql://u:p@localhost:5432/kaamsetu';

describe('validateEnv', () => {
  it('applies defaults', () => {
    expect(validateEnv({ DATABASE_URL: DB })).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: DB,
    });
  });

  it('coerces PORT from a string', () => {
    expect(validateEnv({ DATABASE_URL: DB, PORT: '4000' }).PORT).toBe(4000);
  });

  it('fails loudly when DATABASE_URL is missing or wrong', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ DATABASE_URL: 'mysql://x' })).toThrow(
      /postgresql/,
    );
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
