import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, Field } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { api } from '@/features/auth/session';
import { acSummary, displayPhone } from '@/features/customers/api';
import { dayString, useDayLabel } from '@/features/jobs/jobs';
import { ConfirmDialog, FilterChips } from '@/features/jobs/parts';
import type { Tone } from '@/theme/tokens';
import { colors, space } from '@/theme/tokens';

// ---------- API (docs/06 §5a, T4.5, D-033) ----------

export const SOURCES = ['WHATSAPP', 'PHONE', 'SERVICE_CENTRE', 'B2B', 'OTHER'] as const;
export type Source = (typeof SOURCES)[number] | 'WALK_IN';
type EnquiryStatus = 'OPEN' | 'CONVERTED' | 'CLOSED';

export type EnquiryRow = {
  id: string;
  number: number;
  status: EnquiryStatus;
  source: Source;
  type: string;
  complaint: string | null;
  preferredDate: string | null;
  preferredSlot: 'MORNING' | 'AFTERNOON' | 'EVENING' | null;
  customerId: string;
  customerName: string;
  siteId: string;
  place: string | null;
  acCount: number;
  createdAt: string;
  jobId: string | null;
  jobNumber: number | null;
};
export type Enquiry = EnquiryRow & {
  closeReason: string | null;
  version: number;
  customer: { id: string; name: string; phone: string } | null;
  site: { addressLine1: string; locality: string | null; city: string | null } | null;
  equipment: { id: string; type: string; brand: string | null; capacityTons: number | null; locationLabel: string | null }[];
  job: { id: string; number: number } | null;
};

export const ENQUIRIES_KEY = ['enquiries'] as const;
export const useEnquiries = (status: 'OPEN' | 'CLOSED') =>
  queryOptions({
    queryKey: [...ENQUIRIES_KEY, 'list', status],
    queryFn: () => api.get<EnquiryRow[]>(`/enquiries?status=${status}`),
  });
export const useEnquiry = (id: string) =>
  queryOptions({ queryKey: [...ENQUIRIES_KEY, id], queryFn: () => api.get<Enquiry>(`/enquiries/${id}`) });

const BADGE: Record<EnquiryStatus, { key: string; tone: Tone }> = {
  OPEN: { key: 'uiEnquiry.open', tone: 'grey' },
  CONVERTED: { key: 'uiEnquiry.jobMadeBadge', tone: 'ok' },
  CLOSED: { key: 'uiEnquiry.closed', tone: 'grey' },
};

/** "Today, 10:15 am" for when the enquiry was saved. */
function useSavedAt() {
  const dayLabel = useDayLabel();
  return (iso: string) => {
    const d = new Date(iso);
    return `${dayLabel(dayString(0, d))}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
  };
}

// ---------- List (Stitch 06) ----------

/** The Enquiries side of the Jobs tab: Open / Closed and the cards. */
export function EnquiryList() {
  const { t } = useTranslation();
  const [view, setView] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const list = useQuery(useEnquiries(view));
  return (
    <>
      <FilterChips
        label={t('uiEnquiry.enquiries')}
        options={[
          { value: 'OPEN' as const, label: t('uiEnquiry.open') },
          { value: 'CLOSED' as const, label: t('uiEnquiry.closed') },
        ]}
        value={view}
        onChange={setView}
      />
      {list.isPending ? <ActivityIndicator color={colors.teal} /> : null}
      {list.isError ? <AppText color={colors.bad}>{errorMessage(t, list.error)}</AppText> : null}
      {list.data?.length === 0 ? (
        view === 'OPEN' ? (
          <EmptyState icon="message-text-outline" title={t('uiEnquiry.emptyOpen')} body={t('uiEnquiry.emptyOpenBody')} />
        ) : (
          <EmptyState title={t('uiEnquiry.emptyClosed')} />
        )
      ) : null}
      {list.data?.map((e) => <EnquiryCard key={e.id} enquiry={e} />)}
    </>
  );
}

/** One enquiry: number + when saved, status, customer, type · place · source, what they said. */
export function EnquiryCard({ enquiry: e }: { enquiry: EnquiryRow }) {
  const { t } = useTranslation();
  const savedAt = useSavedAt();
  const badge = BADGE[e.status];
  return (
    <Card
      onPress={() => router.push({ pathname: '/enquiries/[id]', params: { id: e.id } })}
      accessibilityLabel={`${t('uiEnquiry.number', { n: e.number })}, ${e.customerName}, ${t(badge.key)}`}
    >
      <View style={styles.between}>
        <AppText variant="support" color={colors.slate} style={styles.flex}>
          {t('uiEnquiry.number', { n: e.number })} · {savedAt(e.createdAt)}
        </AppText>
        <Badge label={t(badge.key)} tone={badge.tone} />
      </View>
      <AppText variant="section" numberOfLines={1}>
        {e.customerName}
      </AppText>
      <AppText variant="support" color={colors.slate}>
        {[t(`jobs.types.${e.type}`), e.place, t('uiEnquiry.via', { source: t(`uiEnquiry.src_${e.source}`) })]
          .filter(Boolean)
          .join(' · ')}
      </AppText>
      {e.complaint ? <AppText numberOfLines={2}>“{e.complaint}”</AppText> : null}
    </Card>
  );
}

// ---------- Enquiry page (Stitch 07) ----------

export function EnquiryScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const enquiry = useQuery(useEnquiry(id));
  const savedAt = useSavedAt();
  const dayLabel = useDayLabel();
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState('');
  const close = useMutation({
    mutationFn: () => api.post<Enquiry>(`/enquiries/${id}/close`, { reason: reason.trim() }),
    onSuccess: () => {
      setClosing(false);
      void qc.invalidateQueries({ queryKey: ENQUIRIES_KEY });
    },
  });

  if (enquiry.isPending) return <ActivityIndicator style={styles.flex} color={colors.teal} />;
  if (enquiry.isError) return <Screen><AppText color={colors.bad}>{errorMessage(t, enquiry.error)}</AppText></Screen>;
  const e = enquiry.data;
  const open = e.status === 'OPEN';
  const address = e.site ? [e.site.addressLine1, e.site.locality].filter(Boolean).join(', ') : null;
  const phoneDigits = e.customer?.phone.replace(/\D/g, '') ?? '';
  const when = e.preferredDate
    ? [dayLabel(e.preferredDate), e.preferredSlot && t(`jobs.slots.${e.preferredSlot}`)].filter(Boolean).join(', ')
    : t('uiEnquiry.notDecided');

  return (
    <>
      <Stack.Screen options={{ title: t('uiEnquiry.title', { n: e.number }) }} />
      <Screen
        footer={
          open ? (
            <View style={styles.footer}>
              <Button
                size="large"
                icon="briefcase-outline"
                label={t('uiEnquiry.convert')}
                onPress={() => router.push({ pathname: '/jobs/new', params: { enquiryId: e.id } })}
              />
              <Button variant="text" label={t('uiEnquiry.closeEnquiry')} onPress={() => setClosing(true)} />
            </View>
          ) : e.job ? (
            <Button
              size="large"
              icon="arrow-right"
              label={t('uiEnquiry.openJob', { n: e.job.number })}
              onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: e.job!.id } })}
            />
          ) : undefined
        }
      >
        <View style={styles.between}>
          <AppText variant="support" color={colors.slate} style={styles.flex}>
            {savedAt(e.createdAt)} · {t('uiEnquiry.via', { source: t(`uiEnquiry.src_${e.source}`) })}
          </AppText>
          <Badge label={t(BADGE[e.status].key)} tone={BADGE[e.status].tone} />
        </View>

        <Card>
          <AppText variant="section">{e.customerName}</AppText>
          <AppText variant="support" color={colors.slate}>
            {[e.customer ? displayPhone(e.customer.phone) : null, address].filter(Boolean).join(' · ')}
          </AppText>
          {e.customer ? (
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button variant="soft" icon="phone-outline" label={t('customers.call')} onPress={() => Linking.openURL(`tel:${e.customer?.phone}`)} />
              </View>
              <View style={styles.flex}>
                <Button variant="soft" icon="whatsapp" label={t('uiOwner.whatsapp')} onPress={() => Linking.openURL(`https://wa.me/${phoneDigits}`)} />
              </View>
            </View>
          ) : null}
        </Card>

        <Card>
          <AppText variant="label" color={colors.slate}>
            {t('uiEnquiry.whatTheyAsked')}
          </AppText>
          <AppText variant="section" weight="regular" color={e.complaint ? colors.ink : colors.muted}>
            {e.complaint ? `“${e.complaint}”` : t('uiEnquiry.nothingWritten')}
          </AppText>
          <Field label={t('uiOwner.service')} value={t(`jobs.types.${e.type}`)} />
          <Field
            label={t('uiEnquiry.acs')}
            value={
              e.equipment.length
                ? e.equipment.map((x) => x.locationLabel || acSummary(x as never, t(`customers.acTypes.${x.type}`))).join(', ')
                : '—'
            }
          />
          <Field label={t('uiEnquiry.when')} value={when} />
          {e.closeReason ? <Field label={t('uiEnquiry.closedBecause')} value={e.closeReason} /> : null}
        </Card>

        {open ? (
          <AppText variant="support" color={colors.slate} style={styles.center}>
            {t('uiEnquiry.convertHint')}
          </AppText>
        ) : e.job ? (
          <AppText variant="support" color={colors.slate} style={styles.center}>
            {t('uiEnquiry.jobMade', { n: e.job.number })}
          </AppText>
        ) : null}
      </Screen>

      <ConfirmDialog
        visible={closing}
        title={t('uiEnquiry.closeTitle', { n: e.number })}
        body={t('uiEnquiry.closeBody')}
        keepLabel={t('uiEnquiry.keepOpen')}
        confirmLabel={t('uiEnquiry.closeEnquiry')}
        onKeep={() => setClosing(false)}
        onConfirm={() => close.mutate()}
        confirmDisabled={reason.trim().length < 2}
        busy={close.isPending}
      >
        <TextField label={t('uiEnquiry.closeReason')} value={reason} onChangeText={setReason} />
        {close.error ? <AppText color={colors.bad}>{errorMessage(t, close.error)}</AppText> : null}
      </ConfirmDialog>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  footer: { gap: space.xs },
  center: { textAlign: 'center' },
});
