// Test-only helpers: render a screen with the providers the app gives it.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configure, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { i18n, initI18n } from '@/localization/i18n';

// Slow CI machines: give findBy*/waitFor 5 s instead of 1 s before failing.
configure({ asyncUtilTimeout: 5000 });

/** Initialise translations once, in English, for readable assertions. */
export async function setupI18n(): Promise<void> {
  await initI18n();
  await i18n.changeLanguage('en');
}

/** Testing Library 14 renders asynchronously: always `await` it. */
export async function renderScreen(ui: ReactElement) {
  const client = new QueryClient({
    // gcTime Infinity: no 5-minute cleanup timers keeping Jest alive after the tests.
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      // As in the app (_layout): saves run at once, online or not.
      mutations: { retry: false, gcTime: Infinity, networkMode: 'always' },
    },
  });
  return await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
