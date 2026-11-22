import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabScreenOptions } from '@/components/navigation/tab-options';
import { useLanguage } from '@/localization/i18n';

type IconName = keyof typeof Ionicons.glyphMap;

/** Senior technician: My Work, History, Profile (docs/02 §3, screens 19/31/32). */
const TABS: { name: string; label: string; icon: IconName; header: boolean }[] = [
  { name: 'my-work', label: 'field.myWork', icon: 'briefcase-outline', header: false },
  { name: 'history', label: 'field.history', icon: 'time-outline', header: true },
  { name: 'profile', label: 'field.profile', icon: 'person-outline', header: true },
];

export default function FieldLayout() {
  const { t } = useTranslation();
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={tabScreenOptions(language, { large: true, bottomInset: insets.bottom })}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.label),
            headerShown: tab.header,
            tabBarIcon: ({ color }) => <Ionicons name={tab.icon} color={color as string} size={26} />,
          }}
        />
      ))}
    </Tabs>
  );
}
