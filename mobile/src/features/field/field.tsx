import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { Avatar } from '@/components/ui/list-row';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { SyncLabel, type SyncState } from '@/components/ui/sync-label';
import { useLanguage } from '@/localization/i18n';
import { colors, space, tones, type Tone } from '@/theme/tokens';

import { doneToday, shortDate, todayIso, useLocalStates, useMyJobs, useRefresh, worstSync, type FieldJob, type LocalState } from './data';
import { jobSummary, slotLabel, StatusBadge } from './parts';

export { toPaise, type FieldJob } from './data';
export { JobScreen } from './job-screen';

function openJob(id: string) {
  router.push({ pathname: '/job/[id]', params: { id } });
}

// ---------- Senior technician: My Work (screens 19, 79) ----------

export function MyWorkScreen() {
  const { t } = useTranslation();
  const language = useLanguage();
  const list = useMyJobs();
  const refresh = useRefresh();
  const states = useLocalStates(list.data?.jobs);
  const today = todayIso();

  const jobs = (list.data?.jobs ?? []).filter((j) => j.status !== 'CANCELLED' || j.gone);
  const statusOf = (j: FieldJob) => states.data?.[j.id]?.status ?? j.status;
  const now = jobs.filter((j) => statusOf(j) === 'IN_PROGRESS');
  const open = jobs.filter((j) => statusOf(j) !== 'IN_PROGRESS' && statusOf(j) !== 'COMPLETED');
  const todays = open.filter((j) => !j.scheduledDate || j.scheduledDate <= today);
  const later = open.filter((j) => j.scheduledDate && j.scheduledDate > today);
  const done = jobs.filter((j) => statusOf(j) === 'COMPLETED' && doneToday(j, today));
  const doneSync = worstSync(done.map((j) => states.data?.[j.id]));

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <OfflineBanner />
      <ScrollView
        testID="my-work"
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} />}
      >
        <View>
          <AppText color={colors.slate}>{shortDate(new Date(), language)}</AppText>
          <AppText variant="title">{t('field.myWork')}</AppText>
        </View>
        <FirstDownload list={list.data} empty={jobs.length === 0} />
        {list.data?.ready && jobs.length === 0 ? <EmptyState title={t('field.noJobs')} body={t('field.noJobsSub')} /> : null}

        {now.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="section">{t('uiField.workingNow')}</AppText>
            {now.map((j) => (
              <JobCard key={j.id} job={j} state={states.data?.[j.id]} active />
            ))}
          </View>
        ) : null}

        {todays.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="section">
              {t('uiField.today')} · {todays.length}
            </AppText>
            {todays.map((j) => (
              <JobCard key={j.id} job={j} state={states.data?.[j.id]} />
            ))}
          </View>
        ) : null}

        {done.length > 0 ? (
          <View style={styles.doneLine}>
            <Icon name="check-circle-outline" size={18} color={colors.ok} />
            <AppText variant="support" color={colors.slate}>
              {t('uiField.doneToday', { count: done.length })}
            </AppText>
            {doneSync ? <SyncLabel state={doneSync} /> : null}
          </View>
        ) : null}

        {later.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="section">
              {t('uiField.later')} · {later.length}
            </AppText>
            {later.map((j) => (
              <JobCard key={j.id} job={j} state={states.data?.[j.id]} showDate />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function JobCard({ job, state, active, showDate }: { job: FieldJob; state?: LocalState; active?: boolean; showDate?: boolean }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const s = state?.status ?? job.status;
  const name = job.customer?.name ?? `#${job.jobNumber}`;
  const when = [showDate && job.scheduledDate ? shortDate(job.scheduledDate, language) : null, slotLabel(t, job)].filter(Boolean).join(' · ');
  return (
    <Card tone={active ? 'active' : 'plain'} onPress={() => openJob(job.id)} accessibilityLabel={`${name}, ${t(`jobs.status.${s}`)}`}>
      <View style={styles.between}>
        <AppText variant="section" weight="bold" color={active ? colors.tealDeep : colors.ink}>
          {when || `#${job.jobNumber}`}
        </AppText>
        <View style={styles.badges}>
          {state?.sync ? <SyncBadge state={state.sync} /> : null}
          <StatusBadge status={s} />
        </View>
      </View>
      <AppText variant="section">{name}</AppText>
      <AppText color={colors.slate}>{jobSummary(t, job)}</AppText>
      {active ? <Button label={t('uiField.continueFinish')} size="large" onPress={() => openJob(job.id)} /> : null}
    </Card>
  );
}

const SYNC_BADGE: Record<SyncState, { tone: Tone; icon: IconName }> = {
  saved: { tone: 'grey', icon: 'cellphone' },
  sending: { tone: 'info', icon: 'arrow-up' },
  sent: { tone: 'ok', icon: 'check-all' },
  attention: { tone: 'bad', icon: 'alert-outline' },
};

/** Saved on phone · Sending… · Sent · Needs attention, on a job card. */
function SyncBadge({ state }: { state: SyncState }) {
  const { t } = useTranslation();
  return <Badge label={t(`sync.${state}`)} {...SYNC_BADGE[state]} />;
}

/** First time on this phone (or after a business switch): the jobs are still on their way. */
function FirstDownload({ list, empty }: { list: { ready: boolean } | undefined; empty: boolean }) {
  const { t } = useTranslation();
  if (list?.ready || !empty) return null;
  return (
    <View style={styles.iconLine}>
      <ActivityIndicator color={colors.teal} />
      <AppText color={colors.slate}>{t('sync.gettingJobs')}</AppText>
    </View>
  );
}

// ---------- Helper: Today's work (screen 48, Q-01): view and call, nothing to fill ----------

export function TodayScreen() {
  const { t } = useTranslation();
  const language = useLanguage();
  const list = useMyJobs();
  const refresh = useRefresh();
  const jobs = (list.data?.jobs ?? []).filter((j) => j.status !== 'CANCELLED' && j.status !== 'COMPLETED' && !j.gone);
  const senior = list.data?.jobs.find((j) => j.senior)?.senior ?? null;
  const call = (phone: string) => Linking.openURL(`tel:${phone}`);

  return (
    <View style={styles.page}>
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} />}
      >
        <SectionLabel>{shortDate(new Date(), language)}</SectionLabel>
        <FirstDownload list={list.data} empty={jobs.length === 0} />

        {senior ? (
          <Card style={styles.seniorCard}>
            <Avatar name={senior.name} size={48} />
            <View style={styles.flex}>
              <AppText variant="small" color={colors.muted}>
                {t('uiField.yourSenior')}
              </AppText>
              <AppText weight="semibold">{senior.name}</AppText>
            </View>
            {senior.phone ? (
              <Button variant="secondary" icon="phone-outline" label={t('field.call')} onPress={() => call(senior.phone ?? '')} testID="call-senior" />
            ) : null}
          </Card>
        ) : null}

        {list.data?.ready && jobs.length === 0 ? <EmptyState title={t('field.noJobs')} body={t('helper.helperNote')} /> : null}

        {jobs.map((j) => {
          const working = j.status === 'IN_PROGRESS';
          return (
            <Card key={j.id} tone={working ? 'active' : 'plain'}>
              <View style={styles.between}>
                <SectionLabel color={working ? tones.warn.text : colors.muted}>
                  {working ? t('uiField.workingNow') : t('uiField.nextJob')}
                </SectionLabel>
                {working ? (
                  <StatusBadge status={j.status} />
                ) : j.timeSlot ? (
                  <AppText weight="bold" color={colors.tealDeep}>
                    {slotLabel(t, j)}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="title">{j.locality ?? `#${j.jobNumber}`}</AppText>
              {j.customer ? (
                <View style={styles.between}>
                  <AppText weight="semibold" style={styles.flex}>
                    {j.customer.name}
                  </AppText>
                  <Button variant="secondary" icon="phone-outline" label={t('field.call')} onPress={() => call(j.customer?.phone ?? '')} testID={`call-customer-${j.id}`} />
                </View>
              ) : null}
              {j.address ? <AppText color={colors.slate}>{[j.address, j.landmark].filter(Boolean).join(' · ')}</AppText> : null}
              <View style={styles.hr} />
              <View style={styles.iconLine}>
                <Icon name="fan" size={20} color={colors.teal} />
                <AppText style={styles.flex}>{jobSummary(t, j, false)}</AppText>
              </View>
              {!working && j.status !== 'ASSIGNED' ? <StatusBadge status={j.status} /> : null}
            </Card>
          );
        })}

        <AppText variant="support" color={colors.muted} style={styles.center}>
          {t('helper.helperNote')}
        </AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  body: { padding: space.lg, gap: space.lg },
  section: { gap: space.md },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: space.xs, flexShrink: 1 },
  doneLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.xs },
  seniorCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  hr: { height: 1, backgroundColor: colors.rowLine },
  iconLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
