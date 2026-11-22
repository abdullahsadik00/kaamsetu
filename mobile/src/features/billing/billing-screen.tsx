import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useDayLabel } from '@/features/jobs/jobs';
import { ConfirmDialog, FilterChips } from '@/features/jobs/parts';
import { colors, radius, space } from '@/theme/tokens';

import {
  BILLING_KEY,
  confirmCash,
  rejectCash,
  rupees,
  useBills,
  useQuotations,
  useSummary,
  type BillFilter,
  type CashRow,
  type ReadyToBill,
} from './api';
import { billingError, InvoiceCard } from './parts';

const FILTERS: BillFilter[] = ['TO_COLLECT', 'NOT_PAID', 'PARTLY_PAID', 'PAID', 'ALL'];

/** Billing tab (Stitch 33, 42): money to collect, jobs to bill, cash with teams, bills | quotations. */
export function BillingScreen() {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<'bills' | 'quotations'>('bills');
  const [filter, setFilter] = useState<BillFilter>('TO_COLLECT');
  const summary = useQuery(useSummary());
  const bills = useQuery({ ...useBills(filter), enabled: segment === 'bills' });
  const quotes = useQuery({ ...useQuotations('ALL'), enabled: segment === 'quotations' });
  const list = segment === 'bills' ? bills : quotes;
  const s = summary.data;

  return (
    <Screen>
      <View style={styles.titleRow}>
        <AppText variant="title">{t('owner.billing')}</AppText>
        <Button
          icon="plus"
          label={segment === 'bills' ? t('uiBilling.newBill') : t('uiBilling.newQuote')}
          onPress={() => router.push(segment === 'bills' ? '/bills/new' : '/quotations/new')}
        />
      </View>

      <Card>
        <AppText variant="support" color={colors.slate}>
          {t('uiBilling.toCollect')}
        </AppText>
        {summary.isPending ? <ActivityIndicator color={colors.teal} /> : null}
        {s ? (
          <>
            <AppText variant="title" color={colors.tealTintText} testID="to-collect">
              {rupees(s.toCollect)}
            </AppText>
            {s.cashWithTeams ? (
              <AppText variant="support" color={colors.warn} weight="semibold">
                {t('uiBilling.cashWithTeamsAmount', { amount: rupees(s.cashWithTeams) })}
              </AppText>
            ) : null}
          </>
        ) : null}
        {summary.isError ? <AppText color={colors.bad}>{billingError(t, summary.error)}</AppText> : null}
      </Card>

      {s?.readyToBill.length ? <ReadyToBillCard rows={s.readyToBill} /> : null}
      {s?.cash.length ? <CashWithTeams rows={s.cash} /> : null}

      <View style={styles.segments} accessibilityRole="tablist">
        {(['bills', 'quotations'] as const).map((k) => {
          const on = segment === k;
          return (
            <Pressable
              key={k}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setSegment(k)}
              style={[styles.segment, on && styles.segmentOn]}
            >
              <AppText weight={on ? 'semibold' : 'regular'} color={on ? colors.ink : colors.slate}>
                {t(`uiBilling.${k}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {segment === 'bills' ? (
        <FilterChips
          label={t('uiBilling.show')}
          options={FILTERS.map((f) => ({ value: f, label: t(`uiBilling.f_${f}`) }))}
          value={filter}
          onChange={setFilter}
        />
      ) : null}
      {list.isPending ? <ActivityIndicator color={colors.teal} /> : null}
      {list.isError ? <AppText color={colors.bad}>{billingError(t, list.error)}</AppText> : null}
      {list.data?.length === 0 ? (
        segment === 'bills' ? (
          <EmptyState icon="receipt-text-outline" title={t('uiBilling.emptyBills')} body={t('uiBilling.emptyBillsBody')} />
        ) : (
          <EmptyState icon="file-document-outline" title={t('uiBilling.emptyQuotes')} body={t('uiBilling.emptyQuotesBody')} />
        )
      ) : null}
      {list.data?.map((r) => <InvoiceCard key={r.id} row={r} />)}
    </Screen>
  );
}

/** Completed jobs with no bill yet, each with "Make bill". */
function ReadyToBillCard({ rows }: { rows: ReadyToBill[] }) {
  const { t } = useTranslation();
  const dayLabel = useDayLabel();
  return (
    <Card tone="warm">
      <AppText variant="section">{t('uiBilling.readyToBill', { count: rows.length })}</AppText>
      <AppText variant="support" color={colors.slate}>
        {t('uiBilling.readyToBillHint')}
      </AppText>
      {rows.map((j) => (
        <View key={j.jobId} style={styles.row}>
          <View style={styles.flex}>
            <AppText weight="semibold" numberOfLines={1}>
              {j.customerName}
            </AppText>
            <AppText variant="small" color={colors.slate}>
              {[t('uiBilling.jobLine', { n: j.jobNumber, type: t(`jobs.types.${j.type}`) }), j.completedAt ? dayLabel(j.completedAt.slice(0, 10)) : null]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          </View>
          <Button
            variant="secondary"
            label={t('uiBilling.makeBill')}
            onPress={() => router.push({ pathname: '/bills/new', params: { jobId: j.jobId } })}
          />
        </View>
      ))}
    </Card>
  );
}

/** Money teams took on site; the owner marks it Got it or Not received (D-008). */
function CashWithTeams({ rows }: { rows: CashRow[] }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState<CashRow | null>(null);
  const [reason, setReason] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: BILLING_KEY });
  const confirm = useMutation({ mutationFn: (id: string) => confirmCash(id), onSuccess: refresh });
  const reject = useMutation({
    mutationFn: (id: string) => rejectCash(id, reason.trim()),
    onSuccess: () => {
      setRejecting(null);
      setReason('');
      void refresh();
    },
  });
  return (
    <Card>
      <SectionLabel>{t('uiBilling.cashWithTeams')}</SectionLabel>
      <AppText variant="support" color={colors.slate}>
        {t('uiBilling.cashHint')}
      </AppText>
      {rows.map((c) => (
        <View key={c.id} style={styles.cashRow}>
          <AppText weight="semibold">
            {t('uiBilling.cashFrom', { amount: rupees(c.amount), name: c.collectedBy || '—' })} · {t(`uiBilling.mode_${c.mode}`)}
          </AppText>
          <AppText variant="small" color={colors.slate}>
            {t('uiBilling.cashJob', { customer: c.customerName, n: c.jobNumber ?? '—' })}
          </AppText>
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button
                variant="secondary"
                icon="check"
                label={t('uiBilling.gotIt')}
                onPress={() => confirm.mutate(c.id)}
                loading={confirm.isPending && confirm.variables === c.id}
                disabled={confirm.isPending}
              />
            </View>
            <View style={styles.flex}>
              <Button
                variant="secondary"
                icon="close"
                label={t('uiBilling.notReceived')}
                onPress={() => {
                  reject.reset();
                  setRejecting(c);
                }}
              />
            </View>
          </View>
        </View>
      ))}
      {confirm.error ? <AppText color={colors.bad}>{billingError(t, confirm.error)}</AppText> : null}

      <ConfirmDialog
        visible={rejecting !== null}
        title={t('uiBilling.rejectTitle')}
        body={`${rejecting ? t('uiBilling.cashFrom', { amount: rupees(rejecting.amount), name: rejecting.collectedBy }) : ''}\n${t('uiBilling.rejectBody')}`}
        keepLabel={t('uiBilling.back')}
        confirmLabel={t('uiBilling.notReceived')}
        onKeep={() => setRejecting(null)}
        onConfirm={() => rejecting && reject.mutate(rejecting.id)}
        confirmDisabled={reason.trim().length < 2}
        busy={reject.isPending}
      >
        <TextField label={t('uiBilling.rejectReason')} value={reason} onChangeText={setReason} />
        {reject.error ? <AppText color={colors.bad}>{billingError(t, reject.error)}</AppText> : null}
      </ConfirmDialog>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.warmLine },
  cashRow: { gap: 2, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.rowLine },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  segments: { flexDirection: 'row', padding: space.xs, borderRadius: radius.md, backgroundColor: colors.soft },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentOn: { backgroundColor: colors.surface },
});
