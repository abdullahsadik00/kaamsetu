import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabScreenOptions } from '@/components/navigation/tab-options';
import { useLanguage } from '@/localization/i18n';

type IconName = keyof typeof Ionicons.glyphMap;

/** Senior technician: My Work, History, Profile (docs/02 §3, prototype labels). */
const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'my-work', label: 'field.myWork', icon: 'briefcase-outline' },
  { name: 'history', label: 'field.history', icon: 'time-outline' },
  { name: 'profile', label: 'field.profile', icon: 'person-outline' },
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
            tabBarIcon: ({ color }) => <Ionicons name={tab.icon} color={color as string} size={26} />,
          }}
        />
      ))}
    </Tabs>
  );
}
