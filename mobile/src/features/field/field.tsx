import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { TextField } from '@/components/ui/text-field';
import { api } from '@/features/auth/session';
import { currentDb, currentOutbox, notifyLocalSave } from '@/features/sync/sync-engine';
import { colors, radius, space } from '@/theme/tokens';

// ---------- Data: my team's jobs, cached on the phone (docs/09 §2) ----------

type Status = 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'NEW' | 'CANCELLED';
export type FieldJob = {
  id: string;
  jobNumber: number;
  type: string;
  status: Status;
  version: number;
  scheduledDate: string | null;
  timeSlot: string | null;
  customer: { name: string; phone: string } | null;
  locality: string | null;
  senior: { name: string; phone: string | null } | null;
  address?: string | null;
  landmark?: string | null;
  complaint?: string | null;
  amountToCollect?: number | null;
  equipment?: { id: string; type: string; brand: string | null; capacityTons: number | null; locationLabel: string | null }[];
};

const CACHE_KEY = 'myJobs';
const MY_JOBS = ['my-jobs'] as const;

/** Online: fetch and keep a copy. Offline: the last copy, so field staff can keep working. */
async function loadMyJobs(): Promise<{ jobs: FieldJob[]; offline: boolean }> {
  const db = currentDb();
  try {
    const jobs = await api.get<FieldJob[]>('/my/jobs');
    await db?.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [CACHE_KEY, JSON.stringify(jobs)]);
    return { jobs, offline: false };
  } catch (error) {
    if (!(error instanceof ApiError) || !error.isNetwork) throw error;
    const row = await db?.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [CACHE_KEY]);
    return { jobs: row ? (JSON.parse(row.value) as FieldJob[]) : [], offline: true };
  }
}

type Op = 'job.start' | 'job.hold' | 'job.complete';
const NEXT: Record<Op, Status> = { 'job.start': 'IN_PROGRESS', 'job.hold': 'ON_HOLD', 'job.complete': 'COMPLETED' };

/** Status as the phone knows it: the server's, moved on by operations not sent yet. */
async function localState(job: FieldJob): Promise<{ status: Status; pending: boolean; attention: boolean }> {
  const ops = (await currentOutbox()?.unsentFor('ServiceJob', job.id)) ?? [];
  let status = job.status;
  for (const o of ops) if (o.state !== 'NEEDS_ATTENTION') status = NEXT[o.operation as Op] ?? status;
  return {
    status,
    pending: ops.some((o) => o.state !== 'NEEDS_ATTENTION'),
    attention: ops.some((o) => o.state === 'NEEDS_ATTENTION'),
  };
}

// ---------- Senior technician: My Work ----------

export function MyWorkScreen() {
  const { t } = useTranslation();
  const list = useQuery({ queryKey: MY_JOBS, queryFn: loadMyJobs, refetchInterval: 60_000 });
  return (
    <View style={styles.page}>
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} />}
      >
        {list.isPending ? <ActivityIndicator color={colors.teal} /> : null}
        {list.data?.jobs.length === 0 ? (
          <View style={styles.card}>
            <AppText variant="section">{t('field.noJobs')}</AppText>
            <AppText color={colors.slate}>{t('field.noJobsSub')}</AppText>
          </View>
        ) : null}
        {list.data?.jobs.map((j) => <JobCard key={j.id} job={j} />)}
      </ScrollView>
    </View>
  );
}

function JobCard({ job }: { job: FieldJob }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const state = useQuery({ queryKey: ['job-local', job.id, job.status], queryFn: () => localState(job), refetchInterval: 3000 });
  const [panel, setPanel] = useState<'none' | 'hold' | 'finish'>('none');
  const [side, setSide] = useState<'CUSTOMER' | 'OURS'>('CUSTOMER');
  const [outcome, setOutcome] = useState<'COMPLETED' | 'NEEDS_FOLLOW_UP' | 'NOT_COMPLETED'>('COMPLETED');
  const [text, setText] = useState('');
  const save = useMutation({
    mutationFn: async ({ op, payload }: { op: Op; payload: object }) => {
      const outbox = currentOutbox();
      if (!outbox) throw new Error('Phone storage not ready');
      // Saved on the phone first (docs/09 §5); the sender delivers it when online.
      await outbox.enqueue({ id: randomUUID(), entityType: 'ServiceJob', entityId: job.id, operation: op, payload, baseVersion: job.version });
      notifyLocalSave();
    },
    onSuccess: () => {
      setPanel('none');
      setText('');
      void qc.invalidateQueries({ queryKey: ['job-local', job.id] });
    },
  });
  const s = state.data?.status ?? job.status;

  return (
    <View style={styles.card}>
      <View style={styles.between}>
        <AppText variant="section">{job.customer?.name ?? `#${job.jobNumber}`}</AppText>
        <AppText weight="semibold" color={s === 'IN_PROGRESS' ? colors.info : s === 'ON_HOLD' ? colors.warn : s === 'COMPLETED' ? colors.ok : colors.assigned}>
          {t(`jobs.status.${s}`)}
        </AppText>
      </View>
      <AppText color={colors.slate}>
        #{job.jobNumber} · {t(`jobs.types.${job.type}`)}
        {job.timeSlot ? ` · ${t(`jobs.slots.${job.timeSlot}`)}` : ''}
      </AppText>
      {job.address ? <AppText>{t('field.addr')}: {job.address}</AppText> : null}
      {job.landmark ? <AppText color={colors.slate}>{job.landmark}</AppText> : null}
      {job.complaint ? <AppText>{t('field.says')}: {job.complaint}</AppText> : null}
      {job.equipment?.map((e) => (
        <AppText key={e.id} variant="support">
          • {[e.locationLabel, e.capacityTons ? `${e.capacityTons} ton` : null, t(`customers.acTypes.${e.type}`), e.brand].filter(Boolean).join(' · ')}
        </AppText>
      ))}
      {job.amountToCollect ? (
        <AppText weight="semibold">{t('field.collect')}: ₹{(job.amountToCollect / 100).toLocaleString('en-IN')}</AppText>
      ) : null}
      {state.data?.pending ? <AppText weight="semibold" color={colors.warn}>{t('sync.saved')}</AppText> : null}
      {state.data?.attention ? <AppText weight="semibold" color={colors.bad}>{t('sync.attention')} · {t('field.callOwner')}</AppText> : null}
      <View style={styles.row}>
        {job.customer ? (
          <View style={{ flex: 1 }}>
            <Button variant="secondary" label={t('field.call')} onPress={() => Linking.openURL(`tel:${job.customer?.phone}`)} />
          </View>
        ) : null}
        {job.address ? (
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              label={t('field.dir')}
              onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address ?? '')}`)}
            />
          </View>
        ) : null}
      </View>

      {panel === 'hold' ? (
        <View style={styles.panel}>
          <ChoiceChips
            label={t('field.why')}
            options={[
              { value: 'CUSTOMER', label: t('field.custHold') },
              { value: 'OURS', label: t('field.ourHold') },
            ]}
            value={side}
            onChange={setSide}
          />
          <TextField label={t('field.note')} value={text} onChangeText={setText} />
          <Button label={t('field.save')} onPress={() => save.mutate({ op: 'job.hold', payload: { side, ...(text.trim() ? { reason: text.trim() } : {}) } })} />
        </View>
      ) : null}
      {panel === 'finish' ? (
        <View style={styles.panel}>
          <ChoiceChips
            label={t('field.result')}
            options={[
              { value: 'COMPLETED', label: t('field.done') },
              { value: 'NEEDS_FOLLOW_UP', label: t('field.again') },
              { value: 'NOT_COMPLETED', label: t('field.couldnt') },
            ]}
            value={outcome}
            onChange={setOutcome}
          />
          <TextField label={t('field.note')} value={text} onChangeText={setText} multiline />
          <Button label={t('field.finish')} onPress={() => save.mutate({ op: 'job.complete', payload: { outcome, ...(text.trim() ? { note: text.trim() } : {}) } })} />
        </View>
      ) : null}

      {s === 'ASSIGNED' || s === 'ON_HOLD' ? (
        <Button label={s === 'ON_HOLD' ? t('field.startAgain') : t('field.start')} onPress={() => save.mutate({ op: 'job.start', payload: {} })} loading={save.isPending} />
      ) : null}
      {s === 'IN_PROGRESS' ? (
        <>
          <Button label={t('field.finish')} onPress={() => setPanel(panel === 'finish' ? 'none' : 'finish')} />
          <Button variant="text" label={t('field.hold')} onPress={() => setPanel(panel === 'hold' ? 'none' : 'hold')} />
        </>
      ) : null}
      {save.error ? <AppText color={colors.bad}>{String(save.error)}</AppText> : null}
    </View>
  );
}

// ---------- Helper: Today's work (Q-01) ----------

export function TodayScreen() {
  const { t } = useTranslation();
  const list = useQuery({ queryKey: MY_JOBS, queryFn: loadMyJobs, refetchInterval: 60_000 });
  return (
    <View style={styles.page}>
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} />}
      >
        {list.isPending ? <ActivityIndicator color={colors.teal} /> : null}
        {list.data?.jobs.length === 0 ? (
          <View style={styles.card}>
            <AppText variant="section">{t('field.noJobs')}</AppText>
            <AppText color={colors.slate}>{t('helper.helperNote')}</AppText>
          </View>
        ) : null}
        {list.data?.jobs.map((j) => (
          <View key={j.id} style={styles.card}>
            <AppText variant="section">{t(`jobs.types.${j.type}`)} · {j.locality ?? ''}</AppText>
            <AppText color={colors.slate}>
              {t(`jobs.status.${j.status}`)}
              {j.timeSlot ? ` · ${t(`jobs.slots.${j.timeSlot}`)}` : ''}
            </AppText>
            {j.customer ? (
              <Button variant="secondary" label={`${t('field.call')} ${j.customer.name}`} onPress={() => Linking.openURL(`tel:${j.customer?.phone}`)} />
            ) : null}
            {j.senior?.phone ? (
              <Button variant="secondary" label={`${t('field.call')} ${j.senior.name} (${t('helper.senior')})`} onPress={() => Linking.openURL(`tel:${j.senior?.phone}`)} />
            ) : null}
            <AppText variant="support" color={colors.slate}>{t('helper.helperNote')}</AppText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  body: { padding: space.lg, gap: space.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.sm },
  panel: { gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.line },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
});
