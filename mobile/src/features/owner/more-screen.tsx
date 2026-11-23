import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { initials, ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/features/auth/session';
import { useBusiness, useFeatures } from '@/features/employees/api';
import { ProfileSection } from '@/features/profile/profile-section';
import { colors, radius, space } from '@/theme/tokens';

import { shareBusinessData } from './export-data';
import { planLine } from './plan-screen';

/**
 * Owner More (Stitch 59), limited to what exists: Teams, Employees, Business
 * details (D-027), then account, language and log out.
 */
export function OwnerMoreScreen() {
  const { t } = useTranslation();
  const business = useQuery(useBusiness());
  const features = useFeatures();
  const ownerName = useSession((s) => s.profile?.user.name ?? null);
  const name = business.data?.name;
  const plan = business.data?.plan;
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    setExportFailed(false);
    try {
      await shareBusinessData(t);
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen>
      <AppText variant="title">{t('owner.more')}</AppText>
      {name ? (
        <Card style={styles.bizCard}>
          <View style={styles.logo}>
            <AppText variant="section" color={colors.white}>
              {initials(name)}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="section" numberOfLines={2}>
              {name}
            </AppText>
            <AppText variant="support" color={colors.slate}>
              {[ownerName, t('roles.OWNER'), business.data?.city].filter(Boolean).join(' · ')}
            </AppText>
            {plan ? (
              <AppText variant="small" color={plan.access === 'FULL' ? colors.slate : colors.bad} testID="trial">
                {planLine(t, plan)}
              </AppText>
            ) : null}
          </View>
        </Card>
      ) : null}
      <Card style={styles.listCard}>
        {features.has('TEAMS') ? (
          <ListRow icon="account-group-outline" title={t('teams.title')} subtitle={t('uiOwner.teamsHint')} onPress={() => router.push('/teams')} divider />
        ) : null}
        {features.has('EMPLOYEES') ? (
          <ListRow
            icon="card-account-details-outline"
            title={t('owner.employees')}
            subtitle={t('uiOwner.employeesHint')}
            onPress={() => router.push('/employees')}
            divider
          />
        ) : null}
        <ListRow icon="tag-outline" title={t('uiBilling.rateList')} subtitle={t('uiBilling.rateListHint')} onPress={() => router.push('/rates')} divider />
        <ListRow icon="store-outline" title={t('business.title')} subtitle={t('uiOwner.businessHint')} onPress={() => router.push('/business')} divider />
        {plan ? (
          <ListRow icon="credit-card-outline" title={t('uiPlan.title')} subtitle={planLine(t, plan)} onPress={() => router.push('/plan')} divider />
        ) : null}
        <ListRow
          icon="download-outline"
          title={t('uiOwner.exportData')}
          subtitle={exporting ? t('uiOwner.exportBusy') : t('uiOwner.exportHint')}
          onPress={() => void exportData()}
        />
      </Card>
      {exportFailed ? <AppText color={colors.bad}>{t('uiOwner.exportFailed')}</AppText> : null}
      <ProfileSection />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bizCard: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  logo: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.tealDeep, alignItems: 'center', justifyContent: 'center' },
  listCard: { paddingVertical: space.xs },
});
