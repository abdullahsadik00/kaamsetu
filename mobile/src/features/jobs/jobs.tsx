import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ApiError, errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { api } from '@/features/auth/session';
import { acSummary, displayPhone, useCustomer, useCustomers } from '@/features/customers/api';
import { useTeams } from '@/features/teams/teams';
import { colors, radius, space, touch } from '@/theme/tokens';

// ---------- API (docs/06 §6, D-030) ----------

type JobType = 'SERVICE' | 'REPAIR' | 'INSTALLATION' | 'UNINSTALLATION' | 'GAS_FILLING' | 'OTHER';
type Slot = 'MORNING' | 'AFTERNOON' | 'EVENING';
type Status = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export type JobRow = {
  id: string;
  jobNumber: number;
  type: JobType;
  status: Status;
  scheduledDate: string | null;
  timeSlot: Slot | null;
  amountToCollect: number | null;
  customerId: string;
  customerName: string;
  place: string | null;
  teamId: string | null;
  teamName: string | null;
  acCount: number;
};
type Job = JobRow & {
  complaint: string | null;
  cancelReason: string | null;
  version: number;
  customer: { id: string; name: string; phone: string } | null;
  site: { addressLine1: string; locality: string | null; city: string | null; landmark: string | null } | null;
  equipment: { id: string; type: string; brand: string | null; capacityTons: number | null; locationLabel: string | null }[];
  report: {
    outcome: 'COMPLETED' | 'NEEDS_FOLLOW_UP' | 'NOT_COMPLETED';
    note: string | null;
    work: { equipmentId: string; work: string[] }[];
    parts: { name: string; qty: number }[];
  } | null;
  collections: { id: string; amount: number; mode: 'CASH' | 'UPI'; status: 'WITH_TEAM' | 'CONFIRMED' }[];
};

const JOBS_KEY = ['jobs'] as const;
const useJobs = (filter: string) =>
  queryOptions({ queryKey: [...JOBS_KEY, 'list', filter], queryFn: () => api.get<JobRow[]>(`/jobs?${filter}`) });
const useJob = (id: string) =>
  queryOptions({ queryKey: [...JOBS_KEY, id], queryFn: () => api.get<Job>(`/jobs/${id}`) });

const TYPES: JobType[] = ['SERVICE', 'REPAIR', 'INSTALLATION', 'UNINSTALLATION', 'GAS_FILLING', 'OTHER'];
const SLOTS: Slot[] = ['MORNING', 'AFTERNOON'];

/** Local calendar date as YYYY-MM-DD, `offset` days from today. */
export function dayString(offset: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const rupees = (paise: number | null) => (paise === null ? null : `₹${(paise / 100).toLocaleString('en-IN')}`);

function useDayLabel() {
  const { t } = useTranslation();
  return (d: string | null) =>
    !d ? t('jobs.noDate') : d === dayString(0) ? t('jobs.today') : d === dayString(1) ? t('jobs.tomorrow') : d;
}

// ---------- Jobs tab ----------

export function JobsScreen() {
  const { t } = useTranslation();
  const [view, setView] = useState<'today' | 'tomorrow' | 'open' | 'done'>('today');
  const filter =
    view === 'today' ? `date=${dayString(0)}` : view === 'tomorrow' ? `date=${dayString(1)}` : view === 'open' ? 'status=OPEN' : 'status=COMPLETED';
  const jobs = useQuery(useJobs(filter));
  const dayLabel = useDayLabel();

  return (
    <Screen footer={<Button label={t('jobs.new')} onPress={() => router.push('/jobs/new')} />}>
      <ChoiceChips
        label={t('jobs.show')}
        options={(['today', 'tomorrow', 'open', 'done'] as const).map((v) => ({ value: v, label: t(`jobs.views.${v}`) }))}
        value={view}
        onChange={setView}
      />
      {jobs.isPending ? <ActivityIndicator color={colors.teal} /> : null}
      {jobs.isError ? <AppText color={colors.bad}>{errorMessage(t, jobs.error)}</AppText> : null}
      {jobs.data?.length === 0 ? <AppText color={colors.slate}>{t('jobs.empty')}</AppText> : null}
      {jobs.data?.map((j) => (
        <Pressable
          key={j.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: j.id } })}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
        >
          <View style={styles.between}>
            <AppText weight="semibold">
              #{j.jobNumber} · {j.customerName}
            </AppText>
            <AppText variant="small" weight="semibold" color={STATUS_COLOR[j.status]}>
              {t(`jobs.status.${j.status}`)}
            </AppText>
          </View>
          <AppText variant="support" color={colors.slate}>
            {[t(`jobs.types.${j.type}`), j.place, dayLabel(j.scheduledDate), j.timeSlot && t(`jobs.slots.${j.timeSlot}`)]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
          <AppText variant="support" color={j.teamName ? colors.ink : colors.warn}>
            {j.teamName ?? t('jobs.notAssigned')}
          </AppText>
        </Pressable>
      ))}
    </Screen>
  );
}

const STATUS_COLOR: Record<Status, string> = {
  NEW: colors.warn,
  ASSIGNED: colors.assigned,
  IN_PROGRESS: colors.info,
  ON_HOLD: colors.warn,
  COMPLETED: colors.ok,
  CANCELLED: colors.muted,
};

// ---------- New job ----------

export function NewJobScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ customerId?: string }>();
  const [customerId, setCustomerId] = useState<string | null>(params.customerId ?? null);
  const [q, setQ] = useState('');
  const found = useQuery({ ...useCustomers(q.trim()), enabled: !customerId });

  if (!customerId) {
    return (
      <Screen footer={<Button variant="secondary" label={t('customers.add')} onPress={() => router.push('/customers/new')} />}>
        <TextField label={t('jobs.whichCustomer')} placeholder={t('customers.searchHint')} value={q} onChangeText={setQ} />
        {found.data?.map((c) => (
          <Pressable key={c.id} accessibilityRole="button" onPress={() => setCustomerId(c.id)} style={styles.row}>
            <AppText weight="semibold">{c.name}</AppText>
            <AppText variant="support" color={colors.slate}>
              {[displayPhone(c.phone), c.place].filter(Boolean).join(' · ')}
            </AppText>
          </Pressable>
        ))}
      </Screen>
    );
  }
  return <JobForm customerId={customerId} />;
}

function JobForm({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const customer = useQuery(useCustomer(customerId));
  const teams = useQuery(useTeams());
  const [siteId, setSiteId] = useState<string | null>(null);
  const [acs, setAcs] = useState<string[]>([]);
  const [type, setType] = useState<JobType>('SERVICE');
  const [complaint, setComplaint] = useState('');
  const [day, setDay] = useState<string>(dayString(0));
  const [slot, setSlot] = useState<Slot>('MORNING');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const save = useMutation({
    mutationFn: (site: string) =>
      api.post<Job>('/jobs', {
        customerId,
        siteId: site,
        equipmentIds: acs,
        type,
        ...(complaint.trim() ? { complaint: complaint.trim() } : {}),
        ...(day !== 'none' ? { scheduledDate: day, timeSlot: slot } : {}),
        ...(teamId ? { teamId } : {}),
        ...(amount ? { amountToCollect: Math.round(Number(amount) * 100) } : {}),
      }),
    onSuccess: (job) => {
      void qc.invalidateQueries({ queryKey: JOBS_KEY });
      router.replace({ pathname: '/jobs/[id]', params: { id: job.id } });
    },
  });

  if (customer.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;
  if (customer.isError) return <Screen><AppText color={colors.bad}>{errorMessage(t, customer.error)}</AppText></Screen>;
  const c = customer.data;
  const site = c.sites.find((s) => s.id === siteId) ?? c.sites[0];
  const activeTeams = (teams.data ?? []).filter((tm) => tm.active);

  return (
    <Screen footer={<Button label={t('jobs.save')} onPress={() => site && save.mutate(site.id)} loading={save.isPending} />}>
      <AppText variant="section">{c.name}</AppText>
      {c.sites.length > 1 ? (
        <ChoiceChips
          label={t('customers.address')}
          options={c.sites.map((s) => ({ value: s.id, label: s.label || s.locality || s.addressLine1 }))}
          value={site?.id ?? null}
          onChange={(v) => {
            setSiteId(v);
            setAcs([]);
          }}
        />
      ) : null}
      {site?.equipment.length ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="support" weight="semibold" color={colors.slate}>{t('jobs.whichAcs')}</AppText>
          <View style={styles.chips}>
            {site.equipment.map((e) => {
              const on = acs.includes(e.id);
              return (
                <Pressable
                  key={e.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => setAcs((a) => (on ? a.filter((x) => x !== e.id) : [...a, e.id]))}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <AppText weight="semibold" color={on ? colors.white : colors.ink}>
                    {e.locationLabel || acSummary(e, t(`customers.acTypes.${e.type}`))}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <ChoiceChips label={t('jobs.type')} options={TYPES.map((v) => ({ value: v, label: t(`jobs.types.${v}`) }))} value={type} onChange={setType} />
      <TextField label={t('jobs.complaint')} value={complaint} onChangeText={setComplaint} multiline />
      <ChoiceChips
        label={t('jobs.day')}
        options={[
          { value: dayString(0), label: t('jobs.today') },
          { value: dayString(1), label: t('jobs.tomorrow') },
          { value: dayString(2), label: t('jobs.dayAfter') },
          { value: 'none', label: t('jobs.noDate') },
        ]}
        value={day}
        onChange={setDay}
      />
      {day !== 'none' ? (
        <ChoiceChips label={t('jobs.slot')} options={SLOTS.map((v) => ({ value: v, label: t(`jobs.slots.${v}`) }))} value={slot} onChange={setSlot} />
      ) : null}
      {activeTeams.length ? (
        <ChoiceChips
          label={t('jobs.team')}
          options={activeTeams.map((tm) => ({ value: tm.id, label: tm.name }))}
          value={teamId}
          onChange={setTeamId}
        />
      ) : (
        <AppText variant="support" color={colors.slate}>{t('jobs.noTeams')}</AppText>
      )}
      <TextField label={t('jobs.amount')} prefix="₹" keyboardType="number-pad" value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} />
      {save.error ? <AppText color={colors.bad}>{errorMessage(t, save.error)}</AppText> : null}
    </Screen>
  );
}

// ---------- Job page ----------

export function JobScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const job = useQuery(useJob(id));
  const teams = useQuery(useTeams());
  const dayLabel = useDayLabel();
  const [panel, setPanel] = useState<'none' | 'team' | 'reschedule' | 'cancel'>('none');
  const [day, setDay] = useState(dayString(0));
  const [slot, setSlot] = useState<Slot>('MORNING');
  const [reason, setReason] = useState('');
  const done = (j: Job) => {
    qc.setQueryData([...JOBS_KEY, id], j);
    void qc.invalidateQueries({ queryKey: JOBS_KEY });
    setPanel('none');
  };
  const assign = useMutation({ mutationFn: (teamId: string) => api.post<Job>(`/jobs/${id}/assign-team`, { teamId }), onSuccess: done });
  const reschedule = useMutation({
    mutationFn: (version: number) =>
      api.request<Job>('PATCH', `/jobs/${id}`, { body: { version, scheduledDate: day, timeSlot: slot } }),
    onSuccess: done,
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') void job.refetch();
    },
  });
  const cancel = useMutation({ mutationFn: () => api.post<Job>(`/jobs/${id}/cancel`, { reason: reason.trim() }), onSuccess: done });
  const followUp = useMutation({
    mutationFn: () => api.post<Job>(`/jobs/${id}/follow-up`),
    onSuccess: (j) => {
      void qc.invalidateQueries({ queryKey: JOBS_KEY });
      router.push({ pathname: '/jobs/[id]', params: { id: j.id } });
    },
  });

  if (job.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;
  if (job.isError) return <Screen><AppText color={colors.bad}>{errorMessage(t, job.error)}</AppText></Screen>;
  const j = job.data;
  const open = j.status !== 'COMPLETED' && j.status !== 'CANCELLED';
  const error = assign.error ?? reschedule.error ?? cancel.error ?? followUp.error;

  return (
    <Screen>
      <Stack.Screen options={{ title: `#${j.jobNumber}` }} />
      <View style={styles.card}>
        <View style={styles.between}>
          <AppText variant="section">{j.customerName}</AppText>
          <AppText weight="semibold" color={STATUS_COLOR[j.status]}>{t(`jobs.status.${j.status}`)}</AppText>
        </View>
        {j.site ? (
          <AppText color={colors.slate}>{[j.site.addressLine1, j.site.locality, j.site.city].filter(Boolean).join(', ')}</AppText>
        ) : null}
        <AppText>
          {[t(`jobs.types.${j.type}`), dayLabel(j.scheduledDate), j.timeSlot && t(`jobs.slots.${j.timeSlot}`)].filter(Boolean).join(' · ')}
        </AppText>
        {j.complaint ? <AppText color={colors.slate}>{t('jobs.says')}: {j.complaint}</AppText> : null}
        {j.equipment.map((e) => (
          <AppText key={e.id} variant="support">
            • {[e.locationLabel, acSummary(e as never, t(`customers.acTypes.${e.type}`))].filter(Boolean).join(' · ')}
          </AppText>
        ))}
        {rupees(j.amountToCollect) ? <AppText weight="semibold">{t('jobs.collect')}: {rupees(j.amountToCollect)}</AppText> : null}
        <AppText weight="semibold" color={j.teamName ? colors.ink : colors.warn}>{j.teamName ?? t('jobs.notAssigned')}</AppText>
        {j.cancelReason ? <AppText color={colors.muted}>{t('jobs.cancelled')}: {j.cancelReason}</AppText> : null}
        {j.customer ? (
          <Button variant="secondary" label={t('customers.call')} onPress={() => Linking.openURL(`tel:${j.customer?.phone}`)} />
        ) : null}
      </View>

      {j.report ? (
        <View style={styles.card}>
          <AppText variant="section">{t('jobs.report')}</AppText>
          <AppText weight="semibold" color={j.report.outcome === 'COMPLETED' ? colors.ok : colors.warn}>
            {t(`jobs.outcome.${j.report.outcome}`)}
          </AppText>
          {j.report.note ? <AppText>{j.report.note}</AppText> : null}
          {j.report.work.map((w) => {
            const e = j.equipment.find((x) => x.id === w.equipmentId);
            return (
              <AppText key={w.equipmentId} variant="support">
                • {[e?.locationLabel, e && t(`customers.acTypes.${e.type}`)].filter(Boolean).join(' · ')}:{' '}
                {w.work.map((code) => t(`field.work.${code}`)).join(', ')}
              </AppText>
            );
          })}
          {j.report.parts.length ? (
            <AppText variant="support">
              {t('jobs.parts')}: {j.report.parts.map((p) => `${p.name} × ${p.qty}`).join(', ')}
            </AppText>
          ) : null}
          {j.collections.map((c) => (
            <AppText key={c.id} weight="semibold">
              {t('jobs.taken')}: {rupees(c.amount)} · {t(c.mode === 'CASH' ? 'field.cash' : 'field.upi')} ·{' '}
              {t(c.status === 'WITH_TEAM' ? 'jobs.withTeam' : 'jobs.confirmed')}
            </AppText>
          ))}
        </View>
      ) : null}

      {open && panel === 'team' ? (
        <ChoiceChips
          label={t('jobs.team')}
          options={(teams.data ?? []).filter((tm) => tm.active).map((tm) => ({ value: tm.id, label: tm.name }))}
          value={j.teamId}
          onChange={(v) => assign.mutate(v)}
        />
      ) : null}
      {open && panel === 'reschedule' ? (
        <View style={styles.card}>
          <ChoiceChips
            label={t('jobs.day')}
            options={[0, 1, 2, 3].map((n) => ({ value: dayString(n), label: n === 0 ? t('jobs.today') : n === 1 ? t('jobs.tomorrow') : dayString(n) }))}
            value={day}
            onChange={setDay}
          />
          <ChoiceChips label={t('jobs.slot')} options={SLOTS.map((v) => ({ value: v, label: t(`jobs.slots.${v}`) }))} value={slot} onChange={setSlot} />
          <Button label={t('jobs.saveDay')} onPress={() => reschedule.mutate(j.version)} loading={reschedule.isPending} />
        </View>
      ) : null}
      {open && panel === 'cancel' ? (
        <View style={styles.card}>
          <TextField label={t('jobs.cancelReason')} value={reason} onChangeText={setReason} />
          <Button label={t('jobs.cancelJob')} onPress={() => cancel.mutate()} loading={cancel.isPending} disabled={reason.trim().length < 2} />
        </View>
      ) : null}

      {open ? (
        <>
          <Button label={j.teamId ? t('jobs.changeTeam') : t('jobs.assign')} onPress={() => setPanel(panel === 'team' ? 'none' : 'team')} />
          <Button variant="secondary" label={t('jobs.reschedule')} onPress={() => setPanel(panel === 'reschedule' ? 'none' : 'reschedule')} />
          <Button variant="text" label={t('jobs.cancelJob')} onPress={() => setPanel(panel === 'cancel' ? 'none' : 'cancel')} />
        </>
      ) : null}
      <Button variant="text" label={t('jobs.followUp')} onPress={() => followUp.mutate()} loading={followUp.isPending} />
      {error ? <AppText color={colors.bad}>{errorMessage(t, error)}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.action + 8,
    padding: space.md,
    gap: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: touch.min,
    paddingHorizontal: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.teal, borderColor: colors.teal },
});
