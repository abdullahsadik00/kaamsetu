import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { colors, touch } from '@/theme/tokens';

/** Helper: one simple "Today's work" screen, no tabs (docs/02 §3). */
export default function HelperLayout() {
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
      <Stack.Screen
        name="today"
        options={{
          title: t('helper.todaysWork'),
          headerRight: () => (
            <Link href="/account" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('profile.title')}
                style={{ minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="person-circle-outline" size={30} color={colors.teal} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Stack.Screen name="account" options={{ title: t('profile.title') }} />
    </Stack>
  );
}
