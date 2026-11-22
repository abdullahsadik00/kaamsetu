import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SyncLabel } from '@/components/ui/sync-label';
import { useLanguage } from '@/localization/i18n';
import type { Language } from '@/localization/languages';
import { colors, radius, space } from '@/theme/tokens';

import { rupees, shortDate, todayIso, useDismissAttention, useLocalState, useMyJobs, useSaveOp, type FieldJob, type SavedUpdate } from './data';
import { FinishForm, type FinishPayload } from './finish-form';
import { jobSummary, slotLabel, StatusBadge } from './parts';
import { HoldSheet, UpdateStatusSheet, type HoldSide } from './status-sheets';
import { AppointmentSheet, NoteSheet, PartSheet, type UpdateKind } from './update-sheets';

type Mode = 'details' | 'finish' | 'done';

/** Technician job page (screens 20/21, 76, 83) with Finish (28) and the confirmation (30). */
export function JobScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const list = useMyJobs();
  const job = list.data?.jobs.find((j) => j.id === id);

  if (!job) {
    return (
      <Screen edges={['top']}>
        <BackBar label={t('field.myWork')} onPress={goMyWork} />
        {list.isPending || !list.data?.ready ? (
          <ActivityIndicator color={colors.teal} />
        ) : (
          <EmptyState title={t('field.noJobs')} body={t('field.noJobsSub')} />
        )}
      </Screen>
    );
  }
  return <JobBody job={job} />;
}

function goMyWork() {
  router.navigate('/my-work');
}

function JobBody({ job }: { job: FieldJob }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const state = useLocalState(job);
  const [mode, setMode] = useState<Mode>('details');
  const [sheet, setSheet] = useState(false);
  const [hold, setHold] = useState<HoldSide | null>(null);
  const [update, setUpdate] = useState<UpdateKind | null>(null);
  const [finished, setFinished] = useState<FinishPayload | null>(null);
  const save = useSaveOp(job, (op) => {
    setSheet(false);
    setHold(null);
    setUpdate(null);
    if (op === 'job.complete') setMode('done');
  });

  const dismiss = useDismissAttention(job, goMyWork);

  const s = state.data?.status ?? job.status;
  const name = job.customer?.name ?? `#${job.jobNumber}`;
  const sync = state.data?.sync ?? null;
  // Taken off this phone by the server (cancelled, another team): nothing more can be done on it here.
  const closed = s === 'COMPLETED' || s === 'CANCELLED' || !!job.gone;

  if (mode === 'done') return <Confirmation job={job} payload={finished} />;

  if (mode === 'finish') {
    return (
      <Screen edges={['top']}>
        <BackBar label={name} onPress={() => setMode('details')} right={sync ? <SyncLabel state={sync} /> : null} />
        <View style={styles.head}>
          <AppText variant="title">{t('field.finish')}</AppText>
          <AppText color={colors.slate}>{[name, jobSummary(t, job, false)].join(' · ')}</AppText>
        </View>
        <FinishForm
          job={job}
          busy={save.isPending}
          onSave={(payload) => {
            setFinished(payload);
            save.mutate({ op: 'job.complete', payload });
          }}
        />
        {save.error ? <AppText color={colors.bad}>{String(save.error)}</AppText> : null}
      </Screen>
    );
  }

  const when = [
    job.scheduledDate ? (job.scheduledDate === todayIso() ? t('uiField.today') : shortDate(job.scheduledDate, language)) : null,
    slotLabel(t, job),
  ]
    .filter(Boolean)
    .join(' · ');
  const startLabel = s === 'ON_HOLD' ? t('field.startAgain') : t('field.start');

  return (
    <Screen
      edges={['top']}
      footer={
        closed ? undefined : (
          <>
            {s === 'ASSIGNED' || s === 'ON_HOLD' ? (
              <Button
                label={startLabel}
                icon="play"
                size="large"
                onPress={() => save.mutate({ op: 'job.start', payload: {} })}
                loading={save.isPending}
              />
            ) : null}
            {s === 'IN_PROGRESS' ? <Button label={t('field.finish')} icon="check" size="large" onPress={() => setMode('finish')} /> : null}
            <Button variant="soft" icon="sync" label={t('uiField.updateStatus')} onPress={() => setSheet(true)} />
          </>
        )
      }
    >
      <BackBar label={t('field.myWork')} onPress={goMyWork} right={sync ? <SyncLabel state={sync} /> : null} />

      <View style={styles.head}>
        {when ? (
          <AppText weight="semibold" color={colors.teal}>
            {when}
          </AppText>
        ) : null}
        <AppText variant="title">{name}</AppText>
        <AppText color={colors.slate}>
          #{job.jobNumber} · {jobSummary(t, job, false)}
        </AppText>
        <StatusBadge status={s} />
      </View>

      {state.data?.attention ? (
        <Card tone="warm">
          <AppText weight="semibold" color={colors.bad}>
            {t('sync.attention')} · {t('field.callOwner')}
          </AppText>
          <AppText>{refusedMessage(t, state.data.code)}</AppText>
          <Button variant="soft" label={t('sync.gotIt')} onPress={() => dismiss.mutate()} loading={dismiss.isPending} />
        </Card>
      ) : null}

      {job.customer || job.address ? (
        <View style={styles.row}>
          {job.customer ? (
            <View style={styles.flex}>
              <Button variant="soft" icon="phone-outline" label={t('field.call')} onPress={() => Linking.openURL(`tel:${job.customer?.phone}`)} />
            </View>
          ) : null}
          {job.address ? (
            <View style={styles.flex}>
              <Button
                variant="soft"
                icon="navigation-variant-outline"
                label={t('field.dir')}
                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address ?? '')}`)}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {job.address ? (
        <Card>
          <SectionLabel>{t('field.addr')}</SectionLabel>
          <AppText variant="section" weight="regular">
            {job.address}
          </AppText>
          {job.landmark || job.locality ? (
            <AppText variant="support" color={colors.slate}>
              {[job.landmark, job.locality].filter(Boolean).join(' · ')}
            </AppText>
          ) : null}
        </Card>
      ) : null}

      {job.complaint ? (
        <Card tone="warm">
          <SectionLabel color={colors.warn}>{t('field.says')}</SectionLabel>
          <AppText variant="section" weight="regular" style={styles.quote}>
            “{job.complaint}”
          </AppText>
        </Card>
      ) : null}

      {job.equipment?.length ? (
        <Card>
          <SectionLabel>{t('uiField.acsHeader', { count: job.equipment.length })}</SectionLabel>
          {job.equipment.map((e, i) => (
            <View key={e.id} style={[styles.acRow, i < (job.equipment?.length ?? 0) - 1 && styles.divider]}>
              <View style={styles.acIcon}>
                <Icon name="fan" color={colors.teal} />
              </View>
              <View style={styles.flex}>
                <AppText weight="semibold">{e.locationLabel ?? t(`customers.acTypes.${e.type}`)}</AppText>
                <AppText variant="support" color={colors.slate}>
                  {[t(`customers.acTypes.${e.type}`), e.brand, e.capacityTons ? `${e.capacityTons} ton` : null].filter(Boolean).join(' · ')}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {job.amountToCollect ? (
        <Card style={styles.collect}>
          <View style={styles.flex}>
            <SectionLabel color={colors.ink}>{t('uiField.collectFromCustomer')}</SectionLabel>
            <AppText variant="support" color={colors.slate}>
              {t('uiField.setByOwner')}
            </AppText>
          </View>
          <AppText variant="title">₹{rupees(job.amountToCollect)}</AppText>
        </Card>
      ) : null}

      {state.data?.updates.length ? (
        <Card>
          <SectionLabel>{t('uiUpdates.yourUpdates')}</SectionLabel>
          {state.data.updates.map((u) => (
            <View key={u.id} style={styles.updateRow}>
              <AppText style={styles.flex}>{updateLine(t, u, language)}</AppText>
              <SyncLabel state={u.sync} />
            </View>
          ))}
        </Card>
      ) : null}

      {save.error ? <AppText color={colors.bad}>{String(save.error)}</AppText> : null}

      <UpdateStatusSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        subtitle={`${name} · #${job.jobNumber}`}
        status={s}
        onStart={() => save.mutate({ op: 'job.start', payload: {} })}
        onFinish={() => {
          setSheet(false);
          setMode('finish');
        }}
        onHold={(side) => {
          setSheet(false);
          setHold(side);
        }}
        onUpdate={(kind) => {
          setSheet(false);
          setUpdate(kind);
        }}
      />
      <AppointmentSheet
        visible={update === 'appointment'}
        onClose={() => setUpdate(null)}
        name={name}
        busy={save.isPending}
        onSave={(payload) => save.mutate({ op: 'job.appointment', payload })}
      />
      <PartSheet
        visible={update === 'part'}
        onClose={() => setUpdate(null)}
        name={name}
        busy={save.isPending}
        onSave={(payload) => save.mutate({ op: 'job.part', payload })}
      />
      <NoteSheet
        visible={update === 'note'}
        onClose={() => setUpdate(null)}
        name={name}
        busy={save.isPending}
        onSave={(payload) => save.mutate({ op: 'job.note', payload })}
      />
      <HoldSheet
        side={hold}
        onClose={() => setHold(null)}
        name={name}
        busy={save.isPending}
        onSave={(payload) => save.mutate({ op: 'job.hold', payload })}
      />
    </Screen>
  );
}

/** One "Your updates" line: "Appointment fixed: Tomorrow, Morning", "Part needed: 1 Capacitor", "Note: …". */
function updateLine(t: TFunction, u: SavedUpdate, language: Language): string {
  const p = (u.payload ?? {}) as { date?: string; slot?: string; part?: string; qty?: number; text?: string };
  if (u.operation === 'job.appointment') {
    const day = p.date === todayIso() ? t('uiField.today') : p.date ? shortDate(p.date, language) : '';
    return t('uiUpdates.appointmentAt', { when: [day, p.slot ? t(`jobs.slots.${p.slot}`) : null].filter(Boolean).join(', ') });
  }
  if (u.operation === 'job.part') return t('uiUpdates.partAt', { qty: p.qty ?? 1, name: p.part ?? '' });
  return t('uiUpdates.noteAt', { text: p.text ?? '' });
}

const REFUSED = ['JOB_CANCELLED', 'JOB_REASSIGNED', 'JOB_ALREADY_COMPLETED'];

/** Why the server did not take this work (docs/09 §7), in plain words. */
function refusedMessage(t: TFunction, code: string | null): string {
  return code && REFUSED.includes(code) ? t(`sync.refused.${code}`) : t('sync.refused.other');
}

/** "← My Work" row with the sync state on the right (screens 20/21). */
function BackBar({ label, onPress, right }: { label: string; onPress: () => void; right?: ReactNode }) {
  return (
    <View style={styles.backBar}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.back}>
        <Icon name="arrow-left" color={colors.teal} />
        <AppText variant="section" color={colors.teal} numberOfLines={1}>
          {label}
        </AppText>
      </Pressable>
      {right}
    </View>
  );
}

/** Saved confirmation (screen 30). */
function Confirmation({ job, payload }: { job: FieldJob; payload: FinishPayload | null }) {
  const { t } = useTranslation();
  const name = job.customer?.name ?? `#${job.jobNumber}`;
  const title =
    payload?.outcome === 'NOT_COMPLETED' ? t('field.couldnt') : payload?.outcome === 'NEEDS_FOLLOW_UP' ? t('field.again') : t('uiField.workCompleted');
  const n = job.equipment?.length ?? 0;
  return (
    <Screen edges={['top']} footer={<Button label={t('uiField.backToWork')} size="large" onPress={goMyWork} />}>
      <View style={styles.done}>
        <View style={styles.doneIcon}>
          <Icon name="check" size={40} color={colors.tealTintText} />
        </View>
        <AppText variant="title" style={styles.center}>
          {title}
        </AppText>
        <AppText weight="semibold" color={colors.slate} style={styles.center}>
          {[name, n > 0 ? t('uiField.acs', { count: n }) : null].filter(Boolean).join(' · ')}
        </AppText>
        {payload?.collected ? (
          <AppText weight="semibold" color={colors.slate} style={styles.center}>
            {t('uiField.receivedLine', {
              amount: rupees(payload.collected.amount),
              mode: payload.collected.mode === 'UPI' ? t('field.upi') : t('field.cash'),
            })}
          </AppText>
        ) : null}
      </View>
      <Card>
        <View style={styles.doneRow}>
          <View style={[styles.dot, { backgroundColor: colors.tealTint }]}>
            <Icon name="check" size={18} color={colors.tealTintText} />
          </View>
          <AppText weight="semibold" style={styles.flex}>
            {t('uiField.savedSafe')}
          </AppText>
        </View>
        <View style={styles.doneRow}>
          <View style={[styles.dot, { backgroundColor: colors.soft }]}>
            <Icon name="cellphone-arrow-down" size={18} color={colors.slate} />
          </View>
          <AppText style={styles.flex}>{t('uiField.willSend')}</AppText>
        </View>
        <View style={styles.hr} />
        <AppText variant="support" color={colors.muted}>
          {t('uiField.noNeed')}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: space.sm },
  head: { gap: space.xs },
  backBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48, flexShrink: 1 },
  quote: {},
  acRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.rowLine },
  acIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  collect: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  done: { alignItems: 'center', gap: space.xs, paddingTop: space.xxl },
  doneIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hr: { height: 1, backgroundColor: colors.rowLine },
  updateRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
});
