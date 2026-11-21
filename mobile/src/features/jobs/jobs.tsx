import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ApiError, errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Badge, STATUS_TONE } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card, Field, SectionLabel } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { api } from '@/features/auth/session';
import { acSummary, displayPhone, useCustomer, useCustomers } from '@/features/customers/api';
import {
  ENQUIRIES_KEY,
  EnquiryList,
  SOURCES,
  useEnquiries,
  useEnquiry,
  type Enquiry,
  type Source,
} from '@/features/enquiries/enquiries';
import { useTeams, type Team } from '@/features/teams/teams';
import { colors, radius, space } from '@/theme/tokens';

import { ConfirmDialog, FilterChips, FormSection, OptionChips, SheetRow } from './parts';

// ---------- API (docs/06 §6, D-030) ----------

type JobType = 'SERVICE' | 'REPAIR' | 'INSTALLATION' | 'UNINSTALLATION' | 'GAS_FILLING' | 'OTHER';
type Slot = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type Status = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

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
  enquiry: { id: string; number: number } | null;
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
/** Job list for a query string (`date=…` or `status=OPEN|COMPLETED`); also used by owner Home. */
export const useJobs = (filter: string) =>
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

/** "20 Nov" for a YYYY-MM-DD date. */
function shortDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  const date = new Date(y, m - 1, day);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function useDayLabel() {
  const { t } = useTranslation();
  return (d: string | null) =>
    !d ? t('jobs.noDate') : d === dayString(0) ? t('jobs.today') : d === dayString(1) ? t('jobs.tomorrow') : shortDate(d);
}

const isOpen = (s: Status) => s !== 'COMPLETED' && s !== 'CANCELLED';

// ---------- Jobs tab (Stitch 05, 80) ----------

export function JobsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ show?: string }>();
  const [segment, setSegment] = useState<'enquiries' | 'jobs'>(params.show === 'enquiries' ? 'enquiries' : 'jobs');
  const [shown, setShown] = useState(params.show);
  // Home's "open enquiries" card navigates here with ?show=enquiries.
  if (params.show !== shown) {
    setShown(params.show);
    if (params.show === 'enquiries') setSegment('enquiries');
  }
  const [view, setView] = useState<'today' | 'tomorrow' | 'open' | 'done'>('today');
  const filter =
    view === 'today' ? `date=${dayString(0)}` : view === 'tomorrow' ? `date=${dayString(1)}` : view === 'open' ? 'status=OPEN' : 'status=COMPLETED';
  const jobs = useQuery({ ...useJobs(filter), enabled: segment === 'jobs' });
  const openEnquiries = useQuery(useEnquiries('OPEN'));

  return (
    <Screen>
      <View style={styles.titleRow}>
        <AppText variant="title">{t('owner.jobs')}</AppText>
        <Button icon="plus" label={t('uiOwner.newShort')} onPress={() => router.push('/jobs/new')} />
      </View>
      <View style={styles.segments} accessibilityRole="tablist">
        {(['enquiries', 'jobs'] as const).map((s) => {
          const on = segment === s;
          const label =
            s === 'enquiries' && openEnquiries.data?.length
              ? t('uiEnquiry.enquiriesCount', { count: openEnquiries.data.length })
              : t(`uiEnquiry.${s}`);
          return (
            <Pressable
              key={s}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setSegment(s)}
              style={[styles.segment, on && styles.segmentOn]}
            >
              <AppText weight={on ? 'semibold' : 'regular'} color={on ? colors.ink : colors.slate}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {segment === 'enquiries' ? <EnquiryList /> : <JobList view={view} setView={setView} jobs={jobs} />}
    </Screen>
  );
}

function JobList({
  view,
  setView,
  jobs,
}: {
  view: 'today' | 'tomorrow' | 'open' | 'done';
  setView: (v: 'today' | 'tomorrow' | 'open' | 'done') => void;
  jobs: ReturnType<typeof useQuery<JobRow[]>>;
}) {
  const { t } = useTranslation();
  return (
    <>
      <FilterChips
        label={t('jobs.show')}
        options={(['today', 'tomorrow', 'open', 'done'] as const).map((v) => ({ value: v, label: t(`jobs.views.${v}`) }))}
        value={view}
        onChange={setView}
      />
      {jobs.isPending ? <ActivityIndicator color={colors.teal} /> : null}
      {jobs.isError ? <AppText color={colors.bad}>{errorMessage(t, jobs.error)}</AppText> : null}
      {jobs.data?.length === 0 ? <EmptyState title={t('jobs.empty')} body={t('uiOwner.emptyJobsBody')} /> : null}
      {jobs.data?.map((j) => <JobCard key={j.id} job={j} />)}
    </>
  );
}

/** One job in a list (Stitch 05): number + when, status badge, customer, type · place · ACs, team. */
export function JobCard({ job: j }: { job: JobRow }) {
  const { t } = useTranslation();
  const dayLabel = useDayLabel();
  const when = [dayLabel(j.scheduledDate), j.timeSlot && t(`jobs.slots.${j.timeSlot}`)].filter(Boolean).join(', ');
  return (
    <Card
      onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: j.id } })}
      accessibilityLabel={`#${j.jobNumber}, ${j.customerName}, ${t(`jobs.status.${j.status}`)}`}
    >
      <View style={styles.between}>
        <AppText variant="support" color={colors.slate} style={styles.flex}>
          #{j.jobNumber} · {when}
        </AppText>
        <Badge label={t(`jobs.status.${j.status}`)} tone={STATUS_TONE[j.status]} />
      </View>
      <AppText variant="section" numberOfLines={1}>
        {j.customerName}
      </AppText>
      <AppText variant="support" color={colors.slate}>
        {[t(`jobs.types.${j.type}`), j.place, j.acCount ? t('customers.acCount', { count: j.acCount }) : null]
          .filter(Boolean)
          .join(' · ')}
      </AppText>
      <AppText variant="support" weight={j.teamName ? 'regular' : 'semibold'} color={j.teamName ? colors.slate : colors.warn}>
        {j.teamName ?? t('uiOwner.noTeamYet')}
      </AppText>
    </Card>
  );
}

// ---------- New job (Stitch 08 / 09) ----------

export function NewJobScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ customerId?: string; enquiryId?: string }>();
  const [customerId, setCustomerId] = useState<string | null>(params.customerId ?? null);
  const [q, setQ] = useState('');
  const found = useQuery({ ...useCustomers(q.trim()), enabled: !customerId && !params.enquiryId });
  const enquiry = useQuery({ ...useEnquiry(params.enquiryId ?? ''), enabled: !!params.enquiryId });

  if (params.enquiryId) {
    // Convert (Stitch 07 → 08): everything comes from the enquiry.
    if (enquiry.isPending) return <ActivityIndicator style={styles.flex} color={colors.teal} />;
    if (enquiry.isError) return <Screen><AppText color={colors.bad}>{errorMessage(t, enquiry.error)}</AppText></Screen>;
    return <JobForm customerId={enquiry.data.customerId} enquiry={enquiry.data} />;
  }

  if (!customerId) {
    return (
      <Screen footer={<Button variant="secondary" icon="account-plus-outline" label={t('customers.add')} onPress={() => router.push('/customers/new')} />}>
        <TextField
          label={t('jobs.whichCustomer')}
          optionalLabel={t('uiOwner.searchByHint')}
          placeholder={t('customers.searchHint')}
          value={q}
          onChangeText={setQ}
        />
        {found.data?.length ? (
          <Card style={styles.listCard}>
            {found.data.map((c, i) => (
              <ListRow
                key={c.id}
                avatar={c.name}
                title={c.name}
                subtitle={[displayPhone(c.phone), c.place].filter(Boolean).join(' · ')}
                onPress={() => setCustomerId(c.id)}
                divider={i < found.data.length - 1}
              />
            ))}
          </Card>
        ) : null}
        {q.trim() && found.data?.length === 0 ? (
          <EmptyState icon="account-search-outline" title={t('customers.noneFound')} />
        ) : null}
      </Screen>
    );
  }
  return <JobForm customerId={customerId} onChangeCustomer={() => setCustomerId(null)} />;
}

const TAGS = ['tagNotCooling', 'tagWaterLeak', 'tagNoise', 'tagBadSmell'] as const;

/**
 * One form for a new enquiry or a new job (Stitch 08). With `enquiry` it is the
 * convert step: the enquiry's details are filled in and only the job is made.
 */
function JobForm({
  customerId,
  onChangeCustomer,
  enquiry,
}: {
  customerId: string;
  onChangeCustomer?: () => void;
  enquiry?: Enquiry;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const customer = useQuery(useCustomer(customerId));
  const teams = useQuery(useTeams());
  const dayLabel = useDayLabel();
  const [siteId, setSiteId] = useState<string | null>(enquiry?.siteId ?? null);
  const [acs, setAcs] = useState<string[]>(enquiry?.equipment.map((e) => e.id) ?? []);
  const [type, setType] = useState<JobType>((enquiry?.type as JobType | undefined) ?? 'SERVICE');
  const [complaint, setComplaint] = useState(enquiry?.complaint ?? '');
  const [day, setDay] = useState<string>(enquiry ? (enquiry.preferredDate ?? 'none') : dayString(0));
  const [slot, setSlot] = useState<Slot>(enquiry?.preferredSlot ?? 'MORNING');
  const [source, setSource] = useState<Source>('WHATSAPP');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const job = () => ({
    ...(day !== 'none' ? { scheduledDate: day, timeSlot: slot } : {}),
    ...(teamId ? { teamId } : {}),
    ...(amount ? { amountToCollect: Math.round(Number(amount) * 100) } : {}),
  });
  const details = (site: string) => ({
    customerId,
    siteId: site,
    equipmentIds: acs,
    type,
    ...(complaint.trim() ? { complaint: complaint.trim() } : {}),
  });
  const openJob = (created: Job) => {
    void qc.invalidateQueries({ queryKey: JOBS_KEY });
    void qc.invalidateQueries({ queryKey: ENQUIRIES_KEY });
    router.replace({ pathname: '/jobs/[id]', params: { id: created.id } });
  };
  const save = useMutation({
    mutationFn: (site: string) =>
      enquiry
        ? api.post<Job>(`/enquiries/${enquiry.id}/convert`, {
            equipmentIds: acs,
            type,
            complaint: complaint.trim() || null,
            scheduledDate: day !== 'none' ? day : null,
            ...job(),
          })
        : api.post<Job>('/jobs', { ...details(site), ...job() }),
    onSuccess: openJob,
  });
  const saveEnquiry = useMutation({
    mutationFn: (site: string) =>
      api.post<Enquiry>('/enquiries', {
        ...details(site),
        source,
        ...(day !== 'none' ? { preferredDate: day, preferredSlot: slot } : {}),
      }),
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: ENQUIRIES_KEY });
      router.replace({ pathname: '/enquiries/[id]', params: { id: saved.id } });
    },
  });
  const busy = save.isPending || saveEnquiry.isPending;
  const error = save.error ?? saveEnquiry.error;

  if (customer.isPending) return <ActivityIndicator style={styles.flex} color={colors.teal} />;
  if (customer.isError) return <Screen><AppText color={colors.bad}>{errorMessage(t, customer.error)}</AppText></Screen>;
  const c = customer.data;
  const site = c.sites.find((s) => s.id === siteId) ?? c.sites[0];
  const activeTeams = (teams.data ?? []).filter((tm) => tm.active);
  const addTag = (text: string) => setComplaint((v) => (v.trim() ? `${v.trim()}, ${text}` : text));

  return (
    <Screen
      footer={
        <View style={styles.footerRow}>
          {enquiry ? null : (
            <View style={styles.flex}>
              <Button
                variant="secondary"
                size="large"
                label={t('uiEnquiry.saveEnquiry')}
                onPress={() => site && saveEnquiry.mutate(site.id)}
                loading={saveEnquiry.isPending}
                disabled={busy}
              />
            </View>
          )}
          <View style={styles.flex}>
            <Button
              size="large"
              label={t('uiEnquiry.createJob')}
              onPress={() => site && save.mutate(site.id)}
              loading={save.isPending}
              disabled={busy}
            />
          </View>
        </View>
      }
    >
      {enquiry ? <Stack.Screen options={{ title: t('uiEnquiry.convertTitle', { n: enquiry.number }) }} /> : null}
      <FormSection label={t('uiOwner.customer')}>
        <Card style={styles.customerCard}>
          <View style={styles.between}>
            <AppText variant="section" style={styles.flex}>
              {c.name}
            </AppText>
            {onChangeCustomer ? (
              <Pressable accessibilityRole="button" onPress={onChangeCustomer} hitSlop={12}>
                <AppText weight="semibold" color={colors.teal}>
                  {t('uiOwner.change')}
                </AppText>
              </Pressable>
            ) : null}
          </View>
          <AppText variant="support" color={colors.slate}>
            {displayPhone(c.phone)}
          </AppText>
          {site ? (
            <View style={styles.iconLine}>
              <Icon name="map-marker-outline" size={18} color={colors.slate} />
              <AppText variant="support" style={styles.flex}>
                {[site.locality || site.addressLine1, site.label].filter(Boolean).join(' · ')}
              </AppText>
            </View>
          ) : null}
        </Card>
      </FormSection>

      {c.sites.length > 1 ? (
        <FormSection label={t('customers.address')}>
          <OptionChips
            label={t('customers.address')}
            options={c.sites.map((s) => ({ value: s.id, label: s.label || s.locality || s.addressLine1 }))}
            value={site?.id ?? null}
            onChange={(v) => {
              setSiteId(v);
              setAcs([]);
            }}
          />
        </FormSection>
      ) : null}

      <FormSection label={t('uiOwner.whichAc')} hint={t('uiOwner.tickAll')}>
        {site?.equipment.length ? (
          <OptionChips
            multi
            label={t('uiOwner.whichAc')}
            options={site.equipment.map((e) => ({
              value: e.id,
              label: e.locationLabel || acSummary(e, t(`customers.acTypes.${e.type}`)),
            }))}
            value={acs}
            onChange={setAcs}
          />
        ) : (
          <Card tone="recessed">
            <AppText variant="support" color={colors.slate}>
              {t('uiOwner.noAcsHere')}
            </AppText>
            {site ? (
              <Button
                variant="dashed"
                icon="plus"
                label={t('customers.addAc')}
                onPress={() => router.push({ pathname: '/customers/[id]/ac', params: { id: c.id, siteId: site.id } })}
              />
            ) : null}
          </Card>
        )}
      </FormSection>

      <FormSection label={t('uiOwner.service')}>
        <OptionChips label={t('jobs.type')} options={TYPES.map((v) => ({ value: v, label: t(`jobs.types.${v}`) }))} value={type} onChange={setType} />
      </FormSection>

      <View style={styles.section}>
        <TextField
          label={t('uiOwner.problem')}
          optionalLabel={t('uiOwner.optional')}
          placeholder={t('uiOwner.problemHint')}
          value={complaint}
          onChangeText={setComplaint}
          multiline
        />
        <View style={styles.tags}>
          {TAGS.map((k) => (
            <Pressable key={k} accessibilityRole="button" onPress={() => addTag(t(`uiOwner.${k}`))} style={styles.tag}>
              <AppText variant="small" weight="semibold" color={colors.slate}>
                + {t(`uiOwner.${k}`)}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <FormSection label={t('uiOwner.when')} hint={enquiry ? undefined : t('uiEnquiry.preferredHint')}>
        <OptionChips
          grid
          label={t('jobs.day')}
          options={[
            { value: dayString(0), label: t('jobs.today') },
            { value: dayString(1), label: t('jobs.tomorrow') },
            { value: dayString(2), label: t('jobs.dayAfter') },
            // The enquiry's preferred day when it is none of the above.
            ...(enquiry?.preferredDate && ![0, 1, 2].some((n) => dayString(n) === enquiry.preferredDate)
              ? [{ value: enquiry.preferredDate, label: dayLabel(enquiry.preferredDate) }]
              : []),
            { value: 'none', label: t('jobs.noDate') },
          ]}
          value={day}
          onChange={setDay}
        />
        {day !== 'none' ? (
          <OptionChips grid label={t('jobs.slot')} options={SLOTS.map((v) => ({ value: v, label: t(`jobs.slots.${v}`) }))} value={slot} onChange={setSlot} />
        ) : null}
      </FormSection>

      <FormSection label={t('jobs.team')} hint={t('uiOwner.optional')}>
        {activeTeams.length ? (
          <OptionChips
            label={t('jobs.team')}
            options={activeTeams.map((tm) => ({ value: tm.id, label: tm.name }))}
            value={teamId}
            onChange={setTeamId}
          />
        ) : (
          <AppText variant="support" color={colors.slate}>{t('jobs.noTeams')}</AppText>
        )}
      </FormSection>

      <TextField
        label={t('jobs.amount')}
        prefix="₹"
        keyboardType="number-pad"
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/\D/g, ''))}
      />

      {enquiry ? null : (
        <FormSection label={t('uiEnquiry.cameFrom')}>
          <OptionChips
            label={t('uiEnquiry.cameFrom')}
            options={SOURCES.map((v) => ({ value: v, label: t(`uiEnquiry.src_${v}`) }))}
            value={source}
            onChange={setSource}
          />
        </FormSection>
      )}
      {error ? <AppText color={colors.bad} accessibilityLiveRegion="polite">{errorMessage(t, error)}</AppText> : null}
    </Screen>
  );
}

// ---------- Job page (Stitch 13–18) ----------

/** Senior first, then helpers. */
function teamLines(tm: Team | undefined) {
  const members = tm?.members ?? [];
  const senior = members.find((m) => m.position === 'SENIOR_TECHNICIAN' && m.isPrimary) ?? members.find((m) => m.position === 'SENIOR_TECHNICIAN');
  const helpers = members.filter((m) => m.position === 'HELPER');
  const phone = senior?.phone ?? members.find((m) => m.phone)?.phone ?? null;
  return { senior, helpers, phone };
}

export function JobScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const job = useQuery(useJob(id));
  const teams = useQuery(useTeams());
  const dayLabel = useDayLabel();
  const [panel, setPanel] = useState<'none' | 'more' | 'assign' | 'cancel'>('none');
  const [sheetTeam, setSheetTeam] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot>('MORNING');
  const [reason, setReason] = useState('');
  const done = (j: Job) => {
    qc.setQueryData([...JOBS_KEY, id], j);
    void qc.invalidateQueries({ queryKey: JOBS_KEY });
    setPanel('none');
  };
  /** Assign the team and/or change the day, using the existing endpoints one after the other. */
  const apply = useMutation({
    mutationFn: async ({ j, teamId, newDay, newSlot }: { j: Job; teamId: string | null; newDay: string | null; newSlot: Slot }) => {
      let cur = j;
      if (teamId && teamId !== j.teamId) cur = await api.post<Job>(`/jobs/${id}/assign-team`, { teamId });
      if (newDay && (newDay !== j.scheduledDate || newSlot !== j.timeSlot)) {
        cur = await api.request<Job>('PATCH', `/jobs/${id}`, { body: { version: cur.version, scheduledDate: newDay, timeSlot: newSlot } });
      }
      return cur;
    },
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

  if (job.isPending) return <ActivityIndicator style={styles.flex} color={colors.teal} />;
  if (job.isError) return <Screen><AppText color={colors.bad}>{errorMessage(t, job.error)}</AppText></Screen>;
  const j = job.data;
  const open = isOpen(j.status);
  const error = apply.error ?? cancel.error ?? followUp.error;
  const activeTeams = (teams.data ?? []).filter((tm) => tm.active);
  const team = (teams.data ?? []).find((tm) => tm.id === j.teamId);
  const { helpers, phone: teamPhone } = teamLines(team);
  const phoneDigits = j.customer?.phone.replace(/\D/g, '') ?? '';
  const address = j.site ? [j.site.addressLine1, j.site.locality, j.site.city].filter(Boolean).join(', ') : null;

  const openAssign = () => {
    setSheetTeam(j.teamId);
    setDay(j.scheduledDate);
    setSlot(j.timeSlot ?? 'MORNING');
    apply.reset();
    setPanel('assign');
  };

  // Assign sheet choices
  const dayOptions = [0, 1, 2, 3].map((n) => ({
    value: dayString(n),
    label: n === 0 ? t('jobs.today') : n === 1 ? t('jobs.tomorrow') : shortDate(dayString(n)),
  }));
  if (j.scheduledDate && !dayOptions.some((o) => o.value === j.scheduledDate)) {
    dayOptions.unshift({ value: j.scheduledDate, label: shortDate(j.scheduledDate) });
  }
  const slotOptions = (j.timeSlot && !SLOTS.includes(j.timeSlot) ? [...SLOTS, j.timeSlot] : SLOTS).map((v) => ({
    value: v,
    label: t(`jobs.slots.${v}`),
  }));
  const teamChanged = !!sheetTeam && sheetTeam !== j.teamId;
  const schedChanged = !!day && (day !== j.scheduledDate || slot !== j.timeSlot);
  const sheetTeamName = activeTeams.find((tm) => tm.id === sheetTeam)?.name ?? '';

  return (
    <>
      <Stack.Screen
        options={{
          title: `#${j.jobNumber}`,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('uiOwner.more')}
              onPress={() => setPanel('more')}
              hitSlop={8}
              style={styles.headerMore}
            >
              <AppText weight="semibold">{t('uiOwner.more')}</AppText>
              <Icon name="dots-vertical" />
            </Pressable>
          ),
        }}
      />
      <Screen
        footer={
          open ? (
            j.teamId ? (
              <View style={styles.footerRow}>
                <View style={styles.flex}>
                  <Button variant="soft" label={t('uiOwner.changeTeamTime')} onPress={openAssign} />
                </View>
                {teamPhone ? (
                  <View style={styles.flex}>
                    <Button variant="tonal" icon="phone-outline" label={t('uiOwner.callTeam')} onPress={() => Linking.openURL(`tel:${teamPhone}`)} />
                  </View>
                ) : null}
              </View>
            ) : (
              <Button size="large" icon="account-group-outline" label={t('uiOwner.assignTeam')} onPress={openAssign} />
            )
          ) : j.status === 'COMPLETED' ? (
            // The bill form opens the existing bill instead when this job already has one.
            <Button
              size="large"
              icon="receipt-text-outline"
              label={t('uiBilling.makeBill')}
              onPress={() => router.push({ pathname: '/bills/new', params: { jobId: j.id } })}
            />
          ) : undefined
        }
      >
        <Badge label={t(`jobs.status.${j.status}`)} tone={STATUS_TONE[j.status]} />

        <Card>
          <AppText variant="section">{j.customerName}</AppText>
          <AppText variant="support" color={colors.slate}>
            {[j.customer ? displayPhone(j.customer.phone) : null, address].filter(Boolean).join(' · ')}
          </AppText>
          <View style={styles.actions}>
            {j.customer ? (
              <>
                <View style={styles.flex}>
                  <Button variant="soft" icon="phone-outline" label={t('customers.call')} onPress={() => Linking.openURL(`tel:${j.customer?.phone}`)} />
                </View>
                <View style={styles.flex}>
                  <Button variant="soft" icon="whatsapp" label={t('uiOwner.whatsapp')} onPress={() => Linking.openURL(`https://wa.me/${phoneDigits}`)} />
                </View>
              </>
            ) : null}
            <View style={styles.flex}>
              <Button
                variant="soft"
                icon="account-outline"
                label={t('uiOwner.customer')}
                onPress={() => router.push({ pathname: '/customers/[id]', params: { id: j.customerId } })}
              />
            </View>
          </View>
        </Card>

        <Card>
          <SectionLabel>{t('uiOwner.jobSection')}</SectionLabel>
          <Field label={t('uiOwner.service')} value={t(`jobs.types.${j.type}`)} />
          {j.equipment.length ? (
            <Field
              label={t('uiOwner.ac')}
              value={j.equipment
                .map((e) => [e.locationLabel, acSummary(e as never, t(`customers.acTypes.${e.type}`))].filter(Boolean).join(' · '))
                .join('\n')}
            />
          ) : null}
          {j.complaint ? <Field label={t('uiOwner.problem')} value={j.complaint} /> : null}
          {j.enquiry ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/enquiries/[id]', params: { id: j.enquiry!.id } })}
            >
              <Field label={t('uiEnquiry.fromEnquiry')} value={t('uiEnquiry.number', { n: j.enquiry.number })} valueColor={colors.teal} />
            </Pressable>
          ) : null}
          <Field
            label={t('uiOwner.team')}
            value={j.teamName ?? t('uiOwner.noTeamYet')}
            valueColor={j.teamName ? undefined : colors.info}
            hint={helpers.length ? t('uiOwner.helperLine', { name: helpers.map((h) => h.name).join(', ') }) : undefined}
          />
          <Field
            label={t('uiOwner.appointment')}
            value={
              j.scheduledDate
                ? [dayLabel(j.scheduledDate), j.timeSlot && t(`jobs.slots.${j.timeSlot}`)].filter(Boolean).join(', ')
                : t('uiOwner.notFixed')
            }
            valueColor={j.scheduledDate ? undefined : colors.info}
          />
          <Field
            label={t('uiOwner.toCollect')}
            value={rupees(j.amountToCollect) ?? t('uiOwner.nothing')}
            valueColor={j.amountToCollect ? colors.tealTintText : undefined}
          />
          {j.cancelReason ? <Field label={t('jobs.cancelled')} value={j.cancelReason} valueColor={colors.bad} /> : null}
        </Card>

        {j.report ? (
          <Card>
            <View style={styles.between}>
              <AppText variant="section">{t('jobs.report')}</AppText>
              <Badge label={t(`jobs.outcome.${j.report.outcome}`)} tone={j.report.outcome === 'COMPLETED' ? 'ok' : 'warn'} />
            </View>
            {j.report.note ? <AppText>{j.report.note}</AppText> : null}
            {j.report.work.map((w) => {
              const e = j.equipment.find((x) => x.id === w.equipmentId);
              return (
                <Field
                  key={w.equipmentId}
                  label={[e?.locationLabel, e && t(`customers.acTypes.${e.type}`)].filter(Boolean).join(' · ') || t('uiOwner.ac')}
                  value={w.work.map((code) => t(`field.work.${code}`)).join(', ')}
                />
              );
            })}
            {j.report.parts.length ? (
              <Field label={t('jobs.parts')} value={j.report.parts.map((p) => `${p.name} × ${p.qty}`).join(', ')} />
            ) : null}
            {j.collections.map((c) => (
              <Field
                key={c.id}
                label={t('jobs.taken')}
                value={`${rupees(c.amount)} · ${t(c.mode === 'CASH' ? 'field.cash' : 'field.upi')}`}
                valueColor={colors.tealTintText}
                hint={t(c.status === 'WITH_TEAM' ? 'jobs.withTeam' : 'jobs.confirmed')}
              />
            ))}
          </Card>
        ) : null}

        {followUp.isPending ? <ActivityIndicator color={colors.teal} /> : null}
        {error && panel === 'none' ? <AppText color={colors.bad} accessibilityLiveRegion="polite">{errorMessage(t, error)}</AppText> : null}
      </Screen>

      {/* Stitch 17: more options */}
      <BottomSheet visible={panel === 'more'} onClose={() => setPanel('none')} title={t('uiOwner.jobTitle', { n: j.jobNumber })}>
        <View style={styles.sheetList}>
          {open ? <SheetRow icon="account-group-outline" label={t('uiOwner.changeTeamTime')} onPress={openAssign} /> : null}
          <SheetRow
            icon="calendar-refresh-outline"
            label={t('jobs.followUp')}
            onPress={() => {
              setPanel('none');
              followUp.mutate();
            }}
          />
          {open ? (
            <SheetRow
              danger
              icon="close-circle-outline"
              label={t('jobs.cancelJob')}
              onPress={() => {
                cancel.reset();
                setPanel('cancel');
              }}
            />
          ) : null}
        </View>
      </BottomSheet>

      {/* Stitch 12: assign team / change day and time */}
      <BottomSheet
        visible={panel === 'assign'}
        onClose={() => setPanel('none')}
        title={j.teamId ? t('uiOwner.changeTeamTime') : t('uiOwner.assignTeam')}
        subtitle={[t(`jobs.types.${j.type}`), j.acCount ? t('customers.acCount', { count: j.acCount }) : null, j.place].filter(Boolean).join(' · ')}
        footer={
          <>
            {apply.error ? <AppText color={colors.bad}>{errorMessage(t, apply.error)}</AppText> : null}
            <Button
              size="large"
              label={teamChanged ? t('uiOwner.assignCta', { team: sheetTeamName }) : t('jobs.saveDay')}
              onPress={() => apply.mutate({ j, teamId: sheetTeam, newDay: day, newSlot: slot })}
              loading={apply.isPending}
              disabled={!teamChanged && !schedChanged}
            />
          </>
        }
      >
        <FormSection label={t('uiOwner.dayAndTime')}>
          <OptionChips label={t('jobs.day')} options={dayOptions} value={day} onChange={setDay} />
          {day ? <OptionChips label={t('jobs.slot')} options={slotOptions} value={slot} onChange={setSlot} /> : null}
        </FormSection>
        <FormSection label={t('uiOwner.team')}>
          {activeTeams.length ? (
            activeTeams.map((tm) => (
              <TeamOption key={tm.id} team={tm} selected={sheetTeam === tm.id} onPress={() => setSheetTeam(tm.id)} />
            ))
          ) : (
            <AppText variant="support" color={colors.slate}>{t('jobs.noTeams')}</AppText>
          )}
        </FormSection>
      </BottomSheet>

      {/* Stitch 18: cancel dialog */}
      <ConfirmDialog
        visible={panel === 'cancel'}
        title={t('uiOwner.cancelTitle', { n: j.jobNumber })}
        body={t('uiOwner.cancelBody')}
        keepLabel={t('uiOwner.keepJob')}
        confirmLabel={t('jobs.cancelJob')}
        onKeep={() => setPanel('none')}
        onConfirm={() => cancel.mutate()}
        confirmDisabled={reason.trim().length < 2}
        busy={cancel.isPending}
      >
        <TextField label={t('jobs.cancelReason')} value={reason} onChangeText={setReason} />
        {cancel.error ? <AppText color={colors.bad}>{errorMessage(t, cancel.error)}</AppText> : null}
      </ConfirmDialog>
    </>
  );
}

/** Radio card for one team (Stitch 12): name, senior, helpers. */
function TeamOption({ team, selected, onPress }: { team: Team; selected: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const { senior, helpers } = teamLines(team);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.teamOption, selected && styles.teamOptionOn]}
    >
      <Icon name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={selected ? colors.teal : colors.line2} />
      <View style={styles.flex}>
        <AppText weight="semibold">{team.name}</AppText>
        {senior ? (
          <AppText variant="support">
            {senior.name} · {t('uiOwner.senior')}
          </AppText>
        ) : (
          <AppText variant="support" color={colors.muted}>{t('teams.noSenior')}</AppText>
        )}
        {helpers.map((h) => (
          <AppText key={h.memberId} variant="small" color={colors.slate}>
            {h.name} · {t('uiOwner.helper')}
          </AppText>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: space.sm },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  listCard: { paddingVertical: space.xs },
  customerCard: { borderColor: colors.ink },
  iconLine: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: { minHeight: 36, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.full, backgroundColor: colors.soft },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  footerRow: { flexDirection: 'row', gap: space.sm },
  headerMore: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingLeft: space.sm },
  sheetList: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  teamOption: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  teamOptionOn: { borderColor: colors.teal, backgroundColor: colors.soft },
  segments: { flexDirection: 'row', padding: space.xs, borderRadius: radius.md, backgroundColor: colors.soft },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentOn: { backgroundColor: colors.surface },
});
