import type { TFunction } from 'i18next';

/** Error shape from the backend: `{ error: { code, message, details? } }` (docs/06, docs/11 §4). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** No response at all (offline, DNS, timeout). Safe to retry later. */
  get isNetwork(): boolean {
    return this.status === 0;
  }

  /** Worth retrying automatically: network failure, rate limit or server error. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

export const NETWORK_ERROR = 'NETWORK_ERROR';

/** Plain-language, translated message for an error (docs/08 §7). */
export function errorMessage(t: TFunction, error: unknown): string {
  if (error instanceof ApiError) {
    const key = `errors.${error.code}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return t('errors.generic');
}
