import { z } from 'zod';

/** Every environment variable the backend reads. Keep in sync with .env.example (docs/11 §7). */
export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .refine(
      (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
      {
        message: 'must be a postgresql:// connection string',
      },
    ),
  /** Signs access tokens (HS256). At least 32 random characters. */
  JWT_ACCESS_SECRET: z.string().min(32),
  /** Peppers OTP hashes so a database leak does not reveal codes. At least 32 random characters. */
  OTP_HASH_SECRET: z.string().min(32),
  /** json in staging/production for log tooling; pretty for local work. */
  LOG_FORMAT: z.enum(['json', 'pretty']).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/** Used by ConfigModule: the app refuses to start with missing or invalid configuration. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration. Check backend/.env:\n${problems}`);
  }
  return result.data;
}

export function useJsonLogs(
  env: Pick<Env, 'NODE_ENV' | 'LOG_FORMAT'>,
): boolean {
  if (env.LOG_FORMAT) return env.LOG_FORMAT === 'json';
  return env.NODE_ENV === 'staging' || env.NODE_ENV === 'production';
}
