import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { restoreSession, useSession } from '@/features/auth/session';
import { SyncEngine } from '@/features/sync/sync-engine';
import { initErrorReporting, withErrorReporting } from '@/monitoring/error-reporting';
import { i18n, initI18n } from '@/localization/i18n';
import { fontFamily, fontFiles } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

initErrorReporting();
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  const [i18nReady, setI18nReady] = useState(false);
  // No suspending: this runs before i18n is initialised; `ready` gates the UI instead.
  const { t } = useTranslation(undefined, { i18n, useSuspense: false });
  const status = useSession((s) => s.status);
  const role = useSession((s) => s.profile?.membership?.role ?? null);
  const userId = useSession((s) => s.profile?.user.id ?? null);

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
    restoreSession();
  }, []);

  const ready = (fontsLoaded || fontError !== null) && i18nReady && status !== 'loading';
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const signedIn = status === 'signedIn';
  /** Screens opened on top of a home, with a back arrow. */
  const pushed = {
    headerShown: true,
    headerStyle: { backgroundColor: colors.paper },
    headerTintColor: colors.ink,
    headerShadowVisible: false,
  };
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      {signedIn && userId ? <SyncEngine userId={userId} /> : null}
      {/* Each role only has its own screens; index.tsx sends people to their home. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          // Stitch app bar: paper background, ink title, no shadow.
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerTitleStyle: { fontFamily: fontFamily(i18n.language === 'en' ? 'en' : 'hi', 'semibold'), fontSize: 18 },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Screen name="join" />
        <Stack.Protected guard={signedIn && role === 'OWNER'}>
          <Stack.Screen name="(owner)" />
          <Stack.Screen name="employees/index" options={{ ...pushed, title: t('employees.title') }} />
          <Stack.Screen name="employees/[id]" options={{ ...pushed, title: '' }} />
          <Stack.Screen name="employees/new" options={{ ...pushed, title: t('employees.addTitle') }} />
          <Stack.Screen name="business" options={{ ...pushed, title: t('business.title') }} />
          <Stack.Screen name="jobs/new" options={{ ...pushed, title: t('jobs.new') }} />
          <Stack.Screen name="jobs/[id]" options={{ ...pushed, title: '' }} />
          <Stack.Screen name="teams/index" options={{ ...pushed, title: t('teams.title') }} />
          <Stack.Screen name="teams/new" options={{ ...pushed, title: t('teams.add') }} />
          <Stack.Screen name="teams/[id]" options={{ ...pushed, title: '' }} />
          <Stack.Screen name="customers/new" options={{ ...pushed, title: t('customers.addTitle') }} />
          <Stack.Screen name="customers/[id]/index" options={{ ...pushed, title: '' }} />
          <Stack.Screen name="customers/[id]/edit" options={{ ...pushed, title: t('customers.edit') }} />
          <Stack.Screen name="customers/[id]/site" options={{ ...pushed, title: t('customers.addAddress') }} />
          <Stack.Screen name="customers/[id]/ac" options={{ ...pushed, title: t('customers.addAc') }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && role === 'SENIOR_TECHNICIAN'}>
          <Stack.Screen name="(field)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && role === 'HELPER'}>
          <Stack.Screen name="(helper)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && role === null}>
          <Stack.Screen name="join-business" />
          <Stack.Screen name="scan" options={{ ...pushed, title: t('join.scanTitle') }} />
          <Stack.Screen name="setup-business" options={{ ...pushed, title: t('onboarding.title') }} />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}

export default withErrorReporting(RootLayout);
