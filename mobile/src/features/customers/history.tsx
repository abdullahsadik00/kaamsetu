import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Badge, STATUS_TONE } from '@/components/ui/badge';
import { Card, SectionLabel } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { shortDate } from '@/features/field/data';
import { useLanguage } from '@/localization/i18n';
import { colors, radius, space } from '@/theme/tokens';

import { acSummary, useAcHistory, useCustomerHistory, type HistoryJob } from './api';

/** One job in a history list: date, type, status, team, and what was done (T4.4). Tap opens the job. */
function HistoryRow({ job }: { job: HistoryJob }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const date = job.scheduledDate ? shortDate(job.scheduledDate, language) : t('uiPeople.noDate');
  const done = [...(job.work ?? []).map((w) => t(`field.work.${w}`)), ...job.parts.map((p) => `${p.name} × ${p.qty}`)];
  const note = job.workNote ?? job.reportNote;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`#${job.jobNumber}, ${date}, ${t(`jobs.types.${job.type}`)}, ${t(`jobs.status.${job.status}`)}`}
      onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: job.id } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.tealTint }]}
    >
      <View style={styles.icon}>
        <Icon name="clipboard-text-outline" size={20} color={colors.teal} />
      </View>
      <View style={styles.flex}>
        <View style={styles.between}>
          <AppText weight="semibold" style={styles.flex}>
            {date} · {t(`jobs.types.${job.type}`)}
          </AppText>
          <Badge label={t(`jobs.status.${job.status}`)} tone={STATUS_TONE[job.status]} />
        </View>
        <AppText variant="small" color={colors.slate}>
          {[`#${job.jobNumber}`, job.team, job.outcome ? t(`jobs.outcome.${job.outcome}`) : null].filter(Boolean).join(' · ')}
        </AppText>
        {done.length ? <AppText variant="small">{done.join(', ')}</AppText> : null}
        {note ? (
          <AppText variant="small" color={colors.slate}>
            {note}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

function HistoryList({ jobs, empty }: { jobs: HistoryJob[]; empty: string }) {
  if (jobs.length === 0) {
    return (
      <AppText variant="support" color={colors.muted}>
        {empty}
      </AppText>
    );
  }
  return jobs.map((j) => <HistoryRow key={j.id} job={j} />);
}

/** Past jobs card on the customer page (T4.4). */
export function CustomerHistoryCard({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const history = useQuery(useCustomerHistory(customerId));
  return (
    <Card>
      <SectionLabel>{t('uiPeople.pastJobs')}</SectionLabel>
      {history.isPending ? <ActivityIndicator color={colors.teal} /> : null}
      {history.isError ? <AppText color={colors.bad}>{errorMessage(t, history.error)}</AppText> : null}
      {history.data ? <HistoryList jobs={history.data} empty={t('uiPeople.noPastJobs')} /> : null}
    </Card>
  );
}

/** AC page (T4.4): the AC's details and every job it was part of, with the work done on it. */
export function AcHistoryScreen() {
  const { t } = useTranslation();
  const { acId } = useLocalSearchParams<{ acId: string }>();
  const history = useQuery(useAcHistory(acId));

  if (history.isPending) return <ActivityIndicator style={styles.flex} color={colors.teal} />;
  if (history.isError) {
    return (
      <Screen>
        <AppText color={colors.bad}>{errorMessage(t, history.error)}</AppText>
      </Screen>
    );
  }
  const { equipment: e, jobs } = history.data;
  const name = e.locationLabel || t('customers.ac');
  const extra = [e.model, e.serialNumber, e.refrigerant].filter(Boolean);
  return (
    <Screen>
      <Stack.Screen options={{ title: name }} />
      <Card>
        <AppText variant="title">{name}</AppText>
        <AppText color={colors.slate}>{acSummary(e, t(`customers.acTypes.${e.type}`))}</AppText>
        {extra.length ? (
          <AppText variant="small" color={colors.slate}>
            {extra.join(' · ')}
          </AppText>
        ) : null}
      </Card>
      <Card>
        <SectionLabel>{t('uiPeople.acHistory')}</SectionLabel>
        <HistoryList jobs={jobs} empty={t('uiPeople.acNoJobs')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
