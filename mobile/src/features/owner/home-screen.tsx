import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/features/auth/session';
import { dayString, useDayLabel, useJobs, type JobRow } from '@/features/jobs/jobs';
import { useEnquiries } from '@/features/enquiries/enquiries';
import { useTeams } from '@/features/teams/teams';
import { useLanguage } from '@/localization/i18n';
import { colors, radius, space, tones, type Tone } from '@/theme/tokens';

/** Today's jobs grouped as on Stitch screen 02. */
const GROUPS: { key: string; tone: Tone; statuses: JobRow['status'][] }[] = [
  { key: 'notStarted', tone: 'teal', statuses: ['NEW', 'ASSIGNED'] },
  { key: 'working', tone: 'warn', statuses: ['IN_PROGRESS'] },
  { key: 'onHold', tone: 'orange', statuses: ['ON_HOLD'] },
  { key: 'done', tone: 'ok', statuses: ['COMPLETED'] },
];

/**
 * Owner Home (Stitch 02 / 75), limited to what exists today: jobs that still
 * need a team, today's jobs by status, and quick actions. A new business
 * without teams also sees the "Get started" card (D-027).
 */
export function OwnerHomeScreen() {
  const { t } = useTranslation();
  const language = useLanguage();
  const name = useSession((s) => s.profile?.user.name ?? null);
  const today = useQuery(useJobs(`date=${dayString(0)}`));
  const open = useQuery(useJobs('status=OPEN'));
  const teams = useQuery(useTeams());
  const enquiries = useQuery(useEnquiries('OPEN'));
  const dayLabel = useDayLabel();

  const hour = new Date().getHours();
  const greeting = t(hour < 12 ? 'uiOwner.goodMorning' : hour < 17 ? 'uiOwner.goodAfternoon' : 'uiOwner.goodEvening');
  const firstName = name?.trim().split(/\s+/)[0];
  const date = new Date().toLocaleDateString(`${language}-IN`, { weekday: 'short', day: 'numeric', month: 'short' });

  const needTeam = (open.data ?? []).filter((j) => !j.teamId);
  const next = needTeam[0];
  const todayJobs = (today.data ?? []).filter((j) => j.status !== 'CANCELLED');

  return (
    <Screen>
      <View>
        <AppText variant="support" color={colors.slate}>
          {date}
        </AppText>
        <AppText variant="title">{firstName ? `${greeting}, ${firstName}` : greeting}</AppText>
      </View>

      {teams.data && teams.data.length === 0 ? (
        <Card tone="warm">
          <AppText variant="section">{t('owner.getStartedTitle')}</AppText>
          <AppText color={colors.slate}>{t('owner.getStartedBody')}</AppText>
          <Button icon="account-plus-outline" label={t('owner.addStaff')} onPress={() => router.push('/employees/new')} />
          <Button variant="text" label={t('owner.employees')} onPress={() => router.push('/employees')} />
        </Card>
      ) : null}

      {enquiries.data?.length ? (
        <Card
          onPress={() => router.navigate({ pathname: '/jobs', params: { show: 'enquiries' } })}
          accessibilityLabel={t('uiEnquiry.openCount', { count: enquiries.data.length })}
        >
          <View style={styles.between}>
            <View style={styles.flex}>
              <AppText weight="semibold">{t('uiEnquiry.openCount', { count: enquiries.data.length })}</AppText>
              <AppText variant="small" color={colors.slate} numberOfLines={1}>
                {t('uiEnquiry.newest', { name: enquiries.data[0].customerName })}
              </AppText>
            </View>
            <AppText weight="semibold" color={colors.teal}>
              {t('uiEnquiry.view')}
            </AppText>
          </View>
        </Card>
      ) : null}

      {next ? (
        <View style={styles.needTeam}>
          <View style={styles.countBox}>
            <AppText weight="bold" color={colors.white}>
              {needTeam.length}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText weight="semibold" color={colors.ink}>
              {t('uiOwner.needTeam', { count: needTeam.length })}
            </AppText>
            <AppText variant="small" color={colors.slate} numberOfLines={1}>
              {t('uiOwner.needTeamNext', { name: next.customerName, day: dayLabel(next.scheduledDate) })}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: next.id } })}
            style={({ pressed }) => [styles.assignBtn, pressed && { opacity: 0.85 }]}
          >
            <AppText variant="support" weight="semibold" color={colors.white}>
              {t('uiOwner.assign')}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      <Card>
        <View style={styles.between}>
          <AppText variant="section">{t('uiOwner.todayCount', { count: todayJobs.length })}</AppText>
          <Pressable accessibilityRole="link" onPress={() => router.navigate('/jobs')} hitSlop={12}>
            <AppText weight="semibold" color={colors.teal}>
              {t('uiOwner.seeAll')}
            </AppText>
          </Pressable>
        </View>
        {today.isPending ? <ActivityIndicator color={colors.teal} /> : null}
        {today.isError ? <AppText color={colors.bad}>{errorMessage(t, today.error)}</AppText> : null}
        {today.data ? (
          <View style={styles.chips}>
            {GROUPS.map((g) => {
              const n = todayJobs.filter((j) => g.statuses.includes(j.status)).length;
              return (
                <View key={g.key} style={[styles.countChip, { backgroundColor: tones[g.tone].fill }]}>
                  <AppText variant="small" weight="semibold" color={tones[g.tone].text} numberOfLines={1}>
                    {n} {t(`uiOwner.${g.key}`)}
                  </AppText>
                </View>
              );
            })}
          </View>
        ) : null}
      </Card>

      <View style={styles.grid}>
        <QuickAction primary icon="plus" label={t('jobs.new')} onPress={() => router.push('/jobs/new')} />
        <QuickAction icon="account-plus-outline" label={t('customers.add')} onPress={() => router.push('/customers/new')} />
      </View>
    </Screen>
  );
}

function QuickAction({ icon, label, onPress, primary }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  const fg = primary ? colors.white : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        primary ? styles.tilePrimary : styles.tilePlain,
        pressed && (primary ? styles.tilePrimaryPressed : styles.tilePlainPressed),
      ]}
    >
      <Icon name={icon} size={28} color={primary ? colors.white : colors.teal} />
      <AppText weight="semibold" color={fg}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  needTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#B9CBF2',
    backgroundColor: colors.infoTint,
  },
  countBox: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.info, alignItems: 'center', justifyContent: 'center' },
  assignBtn: { minHeight: 40, paddingHorizontal: space.lg, borderRadius: radius.md, backgroundColor: colors.info, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  countChip: { flexGrow: 1, borderRadius: radius.md, paddingHorizontal: space.sm, paddingVertical: space.sm, alignItems: 'center' },
  grid: { flexDirection: 'row', gap: space.md },
  tile: { flex: 1, minHeight: 100, borderRadius: radius.md, padding: space.lg, justifyContent: 'space-between', gap: space.md },
  tilePrimary: { backgroundColor: colors.teal },
  tilePrimaryPressed: { backgroundColor: colors.tealDark },
  tilePlain: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  tilePlainPressed: { backgroundColor: colors.tealTint },
});
