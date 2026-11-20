import * as Sentry from '@sentry/node';
import type { ErrorEvent } from '@sentry/node';

/**
 * Server error reporting (docs/11 §6, Sentry). Off unless SENTRY_DSN is
 * set. Only unexpected errors (HTTP 500) are reported, and every event is
 * scrubbed: no request body, headers, cookies, query string or user, so
 * no phone numbers, tokens or OTPs leave the server (docs/10 §4).
 */
let enabled = false;

export function initErrorReporting(env: {
  SENTRY_DSN?: string;
  NODE_ENV: string;
}): void {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Render sets this to the deployed commit.
    release: process.env.RENDER_GIT_COMMIT,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
  });
  enabled = true;
}

/** Removes anything that could hold personal data before an event is sent. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    event.request = { method: event.request.method, url: stripQuery(event.request.url) };
  }
  delete event.user;
  delete event.extra;
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      data: b.data?.url ? { url: stripQuery(String(b.data.url)), method: b.data.method } : undefined,
      message: b.category === 'console' ? undefined : b.message,
    }));
  }
  return event;
}

function stripQuery(url?: string): string | undefined {
  return url?.split('?')[0];
}

/** Reports an unexpected error with the request ID and route only. */
export function reportError(
  error: unknown,
  context: { requestId: string; method: string; route: string },
): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    scope.setTag('requestId', context.requestId);
    scope.setTag('method', context.method);
    scope.setTag('route', context.route);
    Sentry.captureException(error);
  });
}
