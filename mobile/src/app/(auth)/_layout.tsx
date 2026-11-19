import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme/tokens';

export default function AuthLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="phone" options={{ title: t('auth.loginTitle') }} />
      <Stack.Screen name="otp" options={{ title: t('auth.otpTitle') }} />
    </Stack>
  );
}
