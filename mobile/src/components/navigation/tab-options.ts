import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import type { Language } from '@/localization/languages';
import { fontFamily } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

type TabOptions = NonNullable<ComponentProps<typeof Tabs>['screenOptions']>;

/** Bottom tabs for owner and technician. Technicians get taller tabs and bigger labels. */
export function tabScreenOptions(
  language: Language,
  { large = false }: { large?: boolean } = {},
): TabOptions {
  return {
    headerStyle: { backgroundColor: colors.paper },
    headerTintColor: colors.ink,
    headerShadowVisible: false,
    headerTitleStyle: { fontFamily: fontFamily(language, 'bold'), fontSize: 20 },
    sceneStyle: { backgroundColor: colors.paper },
    tabBarActiveTintColor: colors.teal,
    tabBarInactiveTintColor: colors.slate,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.line,
      height: large ? 72 : 64,
    },
    tabBarLabelStyle: { fontFamily: fontFamily(language, 'semibold'), fontSize: large ? 14 : 12 },
  };
}
