import * as Sentry from '@sentry/react-native';
import type { ComponentType } from 'react';

/**
 * App crash and error reporting (docs/11 §6). On only in release builds
 * with EXPO_PUBLIC_SENTRY_DSN set. Nothing personal is sent: no user, no
 * request data, no query strings, no console messages (docs/10 §4).
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const reportingEnabled = Boolean(dsn) && !__DEV__;

const stripQuery = (url: unknown) => (typeof url === 'string' ? url.split('?')[0] : url);

export function initErrorReporting(): void {
  if (!reportingEnabled) return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    attachScreenshot: false,
    beforeSend(event) {
      delete event.user;
      delete event.request;
      delete event.extra;
      return event;
    },
    beforeBreadcrumb(crumb) {
      if (crumb.category === 'console') return null;
      if (crumb.data?.url) crumb.data = { ...crumb.data, url: stripQuery(crumb.data.url) };
      return crumb;
    },
  });
}

/** Wraps the root component so render crashes are reported. */
export function withErrorReporting(
  Root: ComponentType<Record<string, unknown>>,
): ComponentType<Record<string, unknown>> {
  return reportingEnabled ? Sentry.wrap(Root) : Root;
}
