import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { tabScreenOptions } from '@/components/navigation/tab-options';
import { useLanguage } from '@/localization/i18n';

type IconName = keyof typeof Ionicons.glyphMap;

/** Owner: Home, Jobs, Customers, Billing + More (docs/02 §3). */
const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'home', label: 'owner.home', icon: 'home-outline' },
  { name: 'jobs', label: 'owner.jobs', icon: 'briefcase-outline' },
  { name: 'customers', label: 'owner.customers', icon: 'people-outline' },
  { name: 'billing', label: 'owner.billing', icon: 'receipt-outline' },
  { name: 'more', label: 'owner.more', icon: 'menu-outline' },
];

export default function OwnerLayout() {
  const { t } = useTranslation();
  const language = useLanguage();
  return (
    <Tabs screenOptions={tabScreenOptions(language)}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.label),
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} color={color as string} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
