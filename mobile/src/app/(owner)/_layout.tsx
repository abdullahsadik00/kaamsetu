import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabScreenOptions } from '@/components/navigation/tab-options';
import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { useBusiness } from '@/features/employees/api';
import { useLanguage } from '@/localization/i18n';
import { colors, radius, space } from '@/theme/tokens';

/**
 * Owner: Home, Jobs, Customers, Billing + More (docs/02 §3, Stitch 02). An
 * owner who is in a team does its field work too and also gets My work (D-043).
 */
const TABS: { name: string; label: string; icon: IconName; iconOn: IconName; brand?: boolean; field?: boolean }[] = [
  { name: 'home', label: 'owner.home', icon: 'home-outline', iconOn: 'home', brand: true },
  { name: 'jobs', label: 'owner.jobs', icon: 'tools', iconOn: 'tools', brand: true },
  { name: 'my-work', label: 'field.myWork', icon: 'briefcase-outline', iconOn: 'briefcase', field: true },
  { name: 'customers', label: 'owner.customers', icon: 'account-group-outline', iconOn: 'account-group' },
  { name: 'billing', label: 'owner.billing', icon: 'receipt-text-outline', iconOn: 'receipt-text' },
  { name: 'more', label: 'owner.more', icon: 'menu', iconOn: 'menu' },
];

/** "KaamSetu [OWNER]" app bar title (Stitch 02 / 05). */
function BrandTitle() {
  const { t } = useTranslation();
  return (
    <View style={styles.brand}>
      <AppText variant="section" weight="bold" color={colors.tealDeep}>
        {t('common.appName')}
      </AppText>
      <View style={styles.tag}>
        <AppText variant="label" color={colors.info}>
          {t('uiOwner.ownerTag')}
        </AppText>
      </View>
    </View>
  );
}

export default function OwnerLayout() {
  const { t } = useTranslation();
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const inTeam = useQuery(useBusiness()).data?.inTeam ?? false;
  return (
    <Tabs screenOptions={tabScreenOptions(language, { bottomInset: insets.bottom })}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.label),
            ...(tab.brand ? { headerTitle: () => <BrandTitle /> } : null),
            ...(tab.field ? { headerShown: false, href: inTeam ? undefined : null } : null),
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.pill, focused && styles.pillOn]}>
                <Icon name={focused ? tab.iconOn : tab.icon} color={color as string} size={22} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tag: { backgroundColor: colors.infoTint, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  pill: { width: 52, height: 28, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.tealTint },
});
