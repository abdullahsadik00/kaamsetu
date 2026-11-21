import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card, Field, SectionLabel } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { dayString } from '@/features/jobs/jobs';
import { ConfirmDialog, FormSection, OptionChips, SheetRow } from '@/features/jobs/parts';
import { colors, radius, space } from '@/theme/tokens';

import {
  badgeFor,
  BILLING_KEY,
  cancelInvoice,
  convertQuotation,
  issueBill,
  longDate,
  parseRupees,
  PAY_MODES,
  recordPayment,
  rupees,
  sendQuotation,
  toInput,
  useInvoice,
  voidPayment,
  whatsappLink,
  type Bill,
  type Kind,
  type PayMode,
  type Payment,
} from './api';
import { billingError, MoneyRow, openInvoice } from './parts';
import { shareInvoicePdf } from './pdf';

/** Bill (Stitch 38–40) or quotation (Stitch 42) page. */
export function InvoiceScreen({ kind }: { kind: Kind }) {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const inv = useQuery(useInvoice(kind, id));
  const [panel, setPanel] = useState<'none' | 'more' | 'cancel' | 'pay'>('none');
  const [reason, setReason] = useState('');
  const [voiding, setVoiding] = useState<Payment | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [pdfError, setPdfError] = useState(false);
  const [sharing, setSharing] = useState(false);

  const saved = (b: Bill) => {
    qc.setQueryData([...BILLING_KEY, b.kind, b.id], b);
    void qc.invalidateQueries({ queryKey: BILLING_KEY });
  };
  const issue = useMutation({ mutationFn: () => issueBill(id), onSuccess: saved });
  const cancel = useMutation({
    mutationFn: () => cancelInvoice(kind, id, reason.trim()),
    onSuccess: (b) => {
      saved(b);
      setPanel('none');
    },
  });
  const convert = useMutation({
    mutationFn: () => convertQuotation(id),
    onSuccess: (bill) => {
      saved(bill);
      router.replace({ pathname: '/bills/[id]', params: { id: bill.id } });
    },
  });
  const removePayment = useMutation({
    mutationFn: (p: Payment) => voidPayment(p.id, voidReason.trim()),
    onSuccess: () => {
      setVoiding(null);
      setVoidReason('');
      void qc.invalidateQueries({ queryKey: BILLING_KEY });
    },
  });
  const share = async (b: Bill) => {
    setPdfError(false);
    setSharing(true);
    try {
      let current = b;
      if (b.kind === 'QUOTATION' && b.status === 'DRAFT') {
        current = await sendQuotation(b.id);
        saved(current);
      }
      await shareInvoicePdf(t, current);
    } catch (e) {
      if (e instanceof ApiError) void qc.invalidateQueries({ queryKey: BILLING_KEY });
      setPdfError(true);
    } finally {
      setSharing(false);
    }
  };

  if (inv.isPending) return <ActivityIndicator style={styles.flex} color={colors.teal} />;
  if (inv.isError) {
    return (
      <Screen>
        <AppText color={colors.bad}>{billingError(t, inv.error)}</AppText>
      </Screen>
    );
  }
  const b = inv.data;
  const isBill = kind === 'BILL';
  const open = b.status === 'DRAFT' || b.status === 'ISSUED';
  const live = b.payments.filter((p) => !p.voidedAt);
  // The server keeps `paid` (payments not removed) and `remaining`; never recompute money here.
  const received = b.paid;
  const left = b.remaining;
  const badge = badgeFor(b);
  const title = isBill ? t('uiBilling.billTitle', { number: b.number }) : t('uiBilling.quoteTitle', { number: b.number });
  const error = issue.error ?? convert.error;

  const footer = isBill ? (
    b.status === 'DRAFT' ? (
      <View style={styles.footerRow}>
        <View style={styles.flex}>
          <Button
            variant="secondary"
            size="large"
            label={t('uiBilling.editDraft')}
            onPress={() => router.push({ pathname: '/bills/new', params: { id: b.id } })}
          />
        </View>
        <View style={styles.flex}>
          <Button size="large" label={t('uiBilling.issue')} onPress={() => issue.mutate()} loading={issue.isPending} />
        </View>
      </View>
    ) : b.status === 'ISSUED' ? (
      <Button size="large" icon="plus" label={t('uiBilling.recordPayment')} onPress={() => setPanel('pay')} />
    ) : undefined
  ) : open ? (
    <>
      <Button size="large" icon="receipt-text-outline" label={t('uiBilling.toBill')} onPress={() => convert.mutate()} loading={convert.isPending} />
      <View style={styles.footerRow}>
        <View style={styles.flex}>
          <Button
            variant="soft"
            icon="pencil-outline"
            label={t('uiBilling.editQuote')}
            onPress={() => router.push({ pathname: '/quotations/new', params: { id: b.id } })}
          />
        </View>
        <View style={styles.flex}>
          <Button variant="tonal" icon="whatsapp" label={t('uiBilling.sendQuote')} onPress={() => share(b)} loading={sharing} />
        </View>
      </View>
    </>
  ) : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={t('uiBilling.more')} onPress={() => setPanel('more')} hitSlop={8} style={styles.headerMore}>
              <AppText weight="semibold">{t('uiBilling.more')}</AppText>
              <Icon name="dots-vertical" />
            </Pressable>
          ),
        }}
      />
      <Screen footer={footer}>
        <AppText variant="support" color={colors.slate}>
          {[longDate(b.billDate), b.jobNumber ? t('uiBilling.jobRef', { n: b.jobNumber }) : null].filter(Boolean).join(' · ')}
        </AppText>

        <Card>
          <View style={styles.between}>
            <AppText variant="section" style={styles.flex}>
              {b.customerName}
            </AppText>
            <Badge label={t(badge.key)} tone={badge.tone} />
          </View>
          {isBill && b.status === 'ISSUED' ? (
            <>
              <MoneyRow strong label={t('uiBilling.remaining')} value={rupees(left)} color={left ? colors.tealTintText : colors.ok} />
              <MoneyRow label={t('uiBilling.billTotal')} value={rupees(b.total)} />
              <MoneyRow label={t('uiBilling.received')} value={rupees(received)} />
            </>
          ) : (
            <MoneyRow strong label={isBill ? t('uiBilling.billTotal') : t('uiBilling.total')} value={rupees(b.total)} />
          )}
          {isBill && b.status === 'ISSUED' ? (
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button variant="tonal" icon="whatsapp" label={t('uiBilling.sendBill')} onPress={() => share(b)} loading={sharing} />
              </View>
              {left && b.customer ? (
                <View style={styles.flex}>
                  <Button
                    variant="soft"
                    icon="bell-ring-outline"
                    label={t('uiBilling.sendReminder')}
                    onPress={() =>
                      Linking.openURL(
                        whatsappLink(
                          b.customer?.phone,
                          t('uiBilling.reminderText', { name: b.customerName, amount: rupees(left), number: b.number, business: b.business.name }),
                        ),
                      )
                    }
                  />
                </View>
              ) : null}
            </View>
          ) : null}
          {pdfError ? <AppText color={colors.bad}>{t('uiBilling.pdfFailed')}</AppText> : null}
        </Card>

        {isBill && b.status === 'DRAFT' ? (
          <Card tone="warm">
            <AppText variant="support">{t('uiBilling.draftHint')}</AppText>
          </Card>
        ) : null}
        {!isBill && open ? (
          <AppText variant="support" color={colors.slate}>
            {t('uiBilling.quoteHint')}
          </AppText>
        ) : null}

        {isBill && b.payments.length ? (
          <Card>
            <SectionLabel>{t('uiBilling.payments', { count: live.length })}</SectionLabel>
            {b.payments.map((p) => (
              <PaymentRow key={p.id} payment={p} onRemove={b.status === 'ISSUED' ? () => setVoiding(p) : undefined} />
            ))}
          </Card>
        ) : null}

        <Card>
          <SectionLabel>{t('uiBilling.items')}</SectionLabel>
          {b.items.map((i) => (
            <View key={i.id} style={styles.line}>
              <View style={styles.flex}>
                <AppText>{i.description}</AppText>
                <AppText variant="small" color={colors.slate}>
                  {[t('uiBilling.qtyRate', { qty: i.qty, rate: rupees(i.unitPrice) }), b.gstBill && i.gstRate ? t('uiBilling.gstRate', { rate: i.gstRate }) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </View>
              <AppText weight="semibold">{rupees(i.amount)}</AppText>
            </View>
          ))}
          {b.discount ? <MoneyRow label={t('uiBilling.discount')} value={`−${rupees(b.discount)}`} /> : null}
          {b.gst.map((g) => (
            <View key={g.rate} style={styles.gst}>
              <MoneyRow label={t('uiBilling.cgst', { rate: g.rate / 2 })} value={rupees(g.cgst)} />
              <MoneyRow label={t('uiBilling.sgst', { rate: g.rate / 2 })} value={rupees(g.sgst)} />
            </View>
          ))}
          <MoneyRow strong label={isBill ? t('uiBilling.billTotal') : t('uiBilling.total')} value={rupees(b.total)} />
          {b.gstBill ? (
            <AppText variant="small" color={colors.muted}>
              {t('uiBilling.gstins', { seller: b.sellerGstin ?? t('uiBilling.none'), buyer: b.buyerGstin ?? t('uiBilling.none') })}
              {'\n'}
              {t('uiBilling.gstProvisional')}
            </AppText>
          ) : null}
        </Card>

        {b.collections.filter((c) => !c.paymentId).map((c) => (
          <AppText key={c.id} variant="support" color={colors.slate}>
            {t('uiBilling.teamTook', { amount: rupees(c.amount), status: t(`uiBilling.cash_${c.status}`) })}
          </AppText>
        ))}

        {b.fromQuotation ? (
          <Pressable accessibilityRole="link" onPress={() => openInvoice({ kind: 'QUOTATION', id: b.fromQuotation!.id })}>
            <Field label={t('uiBilling.fromQuote')} value={b.fromQuotation.number} valueColor={colors.teal} />
          </Pressable>
        ) : null}
        {b.convertedToBill ? (
          <Pressable accessibilityRole="link" onPress={() => openInvoice({ kind: 'BILL', id: b.convertedToBill!.id })}>
            <Field label={t('uiBilling.madeIntoBill')} value={b.convertedToBill.number} valueColor={colors.teal} />
          </Pressable>
        ) : null}
        {b.cancelReason ? <Field label={t('uiBilling.cancelledBecause')} value={b.cancelReason} valueColor={colors.bad} /> : null}
        {isBill && b.status === 'ISSUED' ? (
          <AppText variant="small" color={colors.muted} style={styles.center}>
            {t('uiBilling.savedHint')}
          </AppText>
        ) : null}
        {error ? (
          <AppText color={colors.bad} accessibilityLiveRegion="polite">
            {billingError(t, error)}
          </AppText>
        ) : null}
      </Screen>

      {/* Stitch 40: more options */}
      <BottomSheet visible={panel === 'more'} onClose={() => setPanel('none')} title={title}>
        <View style={styles.sheetList}>
          <SheetRow
            icon="file-pdf-box"
            label={t('uiBilling.sharePdf')}
            onPress={() => {
              setPanel('none');
              void shareInvoicePdf(t, b).catch(() => setPdfError(true));
            }}
          />
          {open ? (
            <SheetRow
              danger
              icon="close-circle-outline"
              label={isBill ? t('uiBilling.cancelBill') : t('uiBilling.cancelQuote')}
              onPress={() => {
                cancel.reset();
                setPanel('cancel');
              }}
            />
          ) : null}
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={panel === 'cancel'}
        title={isBill ? t('uiBilling.cancelBillTitle', { number: b.number }) : t('uiBilling.cancelQuoteTitle', { number: b.number })}
        body={isBill ? t('uiBilling.cancelBillBody') : t('uiBilling.cancelQuoteBody')}
        keepLabel={isBill ? t('uiBilling.keepBill') : t('uiBilling.keepQuote')}
        confirmLabel={isBill ? t('uiBilling.cancelBill') : t('uiBilling.cancelQuote')}
        onKeep={() => setPanel('none')}
        onConfirm={() => cancel.mutate()}
        confirmDisabled={reason.trim().length < 2}
        busy={cancel.isPending}
      >
        <TextField label={t('uiBilling.cancelReason')} value={reason} onChangeText={setReason} />
        {cancel.error ? <AppText color={colors.bad}>{billingError(t, cancel.error)}</AppText> : null}
      </ConfirmDialog>

      <ConfirmDialog
        visible={voiding !== null}
        title={t('uiBilling.voidTitle', { amount: voiding ? rupees(voiding.amount) : '' })}
        body={t('uiBilling.voidBody')}
        keepLabel={t('uiBilling.keepPayment')}
        confirmLabel={t('uiBilling.removePayment')}
        onKeep={() => {
          setVoiding(null);
          removePayment.reset();
        }}
        onConfirm={() => voiding && removePayment.mutate(voiding)}
        confirmDisabled={voidReason.trim().length < 2}
        busy={removePayment.isPending}
      >
        <TextField label={t('uiBilling.voidReason')} value={voidReason} onChangeText={setVoidReason} />
        {removePayment.error ? <AppText color={colors.bad}>{billingError(t, removePayment.error)}</AppText> : null}
      </ConfirmDialog>

      {/* A new sheet (and a new idempotency key) each time it opens. */}
      {panel === 'pay' ? <PaymentSheet bill={b} remaining={left} onClose={() => setPanel('none')} /> : null}
    </>
  );
}

function PaymentRow({ payment: p, onRemove }: { payment: Payment; onRemove?: () => void }) {
  const { t } = useTranslation();
  const voided = !!p.voidedAt;
  return (
    <View style={styles.line}>
      <View style={styles.payIcon}>
        <Icon name={p.mode === 'CASH' ? 'cash' : p.mode === 'UPI' ? 'cellphone' : 'bank-outline'} size={20} color={voided ? colors.muted : colors.teal} />
      </View>
      <View style={styles.flex}>
        <AppText weight="semibold" color={voided ? colors.muted : colors.ink} style={voided ? styles.struck : null}>
          {t(`uiBilling.mode_${p.mode}`)}
        </AppText>
        <AppText variant="small" color={colors.slate}>
          {[longDate(p.receivedAt), p.fromTeam ? t('uiBilling.fromTeam') : null, p.note].filter(Boolean).join(' · ')}
        </AppText>
        {voided ? (
          <AppText variant="small" color={colors.bad}>
            {t('uiBilling.removed', { reason: p.voidReason ?? '' })}
          </AppText>
        ) : null}
      </View>
      <View style={styles.payRight}>
        <AppText weight="semibold" color={voided ? colors.muted : colors.ok} style={voided ? styles.struck : null}>
          {rupees(p.amount)}
        </AppText>
        {!voided && onRemove ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${t('uiBilling.removePayment')} ${rupees(p.amount)}`} onPress={onRemove} hitSlop={8}>
            <AppText variant="small" weight="semibold" color={colors.bad}>
              {t('uiBilling.removePayment')}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Stitch 39: amount (full / half / typed), how it was paid, when. One idempotency key per sheet. */
function PaymentSheet({ bill, remaining, onClose }: { bill: Bill; remaining: number; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [key] = useState(() => randomUUID());
  const [amountText, setAmountText] = useState(remaining ? toInput(remaining) : '');
  const [mode, setMode] = useState<PayMode>('CASH');
  const [day, setDay] = useState(dayString(0));
  const [note, setNote] = useState('');
  const amount = parseRupees(amountText);
  const half = Math.floor(remaining / 2);
  const pay = useMutation({
    mutationFn: (allowOverpay: boolean) =>
      recordPayment(bill.id, {
        amount: amount as number,
        mode,
        receivedAt: day,
        ...(note.trim() ? { note: note.trim() } : {}),
        idempotencyKey: key,
        allowOverpay,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BILLING_KEY });
      onClose();
    },
  });
  const overpay = pay.error instanceof ApiError && pay.error.code === 'OVERPAY';
  const ok = amount !== null && amount > 0;

  return (
    <BottomSheet
      visible
      onClose={onClose}
      title={t('uiBilling.recordPayment')}
      subtitle={t('uiBilling.paymentFor', { name: bill.customerName, number: bill.number })}
      footer={
        <>
          {overpay ? (
            <>
              <AppText color={colors.bad}>
                {t('uiBilling.overpay', { amount: rupees(((pay.error as ApiError).details as { remaining?: number } | undefined)?.remaining ?? remaining) })}
              </AppText>
              <Button variant="secondary" label={t('uiBilling.saveAnyway')} onPress={() => pay.mutate(true)} loading={pay.isPending} />
            </>
          ) : pay.error ? (
            <AppText color={colors.bad}>{billingError(t, pay.error)}</AppText>
          ) : null}
          <Button
            size="large"
            label={ok ? t('uiBilling.savePayment', { amount: rupees(amount), mode: t(`uiBilling.mode_${mode}`) }) : t('uiBilling.enterAmount')}
            onPress={() => pay.mutate(false)}
            loading={pay.isPending}
            disabled={!ok}
          />
        </>
      }
    >
      <View style={styles.summary}>
        <MoneyRow label={t('uiBilling.billTotal')} value={rupees(bill.total)} />
        <MoneyRow label={t('uiBilling.received')} value={rupees(bill.paid)} />
        <MoneyRow strong label={t('uiBilling.remaining')} value={rupees(remaining)} color={colors.tealTintText} />
      </View>
      <TextField
        label={t('uiBilling.amountNow')}
        prefix="₹"
        keyboardType="decimal-pad"
        value={amountText}
        onChangeText={(v) => {
          setAmountText(v);
          pay.reset();
        }}
      />
      {remaining ? (
        <View style={styles.chips}>
          {[
            { label: t('uiBilling.full', { amount: rupees(remaining) }), paise: remaining },
            ...(half > 0 ? [{ label: rupees(half), paise: half }] : []),
            ...(remaining > 50000 ? [{ label: rupees(50000), paise: 50000 }] : []),
          ].map((c) => (
            <Pressable
              key={c.label}
              accessibilityRole="button"
              onPress={() => {
                setAmountText(toInput(c.paise));
                pay.reset();
              }}
              style={[styles.chip, amount === c.paise && styles.chipOn]}
            >
              <AppText variant="support" weight="semibold" color={amount === c.paise ? colors.tealTintText : colors.ink}>
                {c.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
      <FormSection label={t('uiBilling.howPaid')}>
        <OptionChips grid label={t('uiBilling.howPaid')} options={PAY_MODES.map((m) => ({ value: m, label: t(`uiBilling.mode_${m}`) }))} value={mode} onChange={setMode} />
      </FormSection>
      <FormSection label={t('uiBilling.date')}>
        <OptionChips
          grid
          label={t('uiBilling.date')}
          options={[
            { value: dayString(0), label: t('uiBilling.today') },
            { value: dayString(-1), label: t('uiBilling.yesterday') },
          ]}
          value={day}
          onChange={setDay}
        />
      </FormSection>
      <TextField label={t('uiBilling.note')} optionalLabel={t('uiBilling.optional')} value={note} onChangeText={setNote} maxLength={200} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  footerRow: { flexDirection: 'row', gap: space.sm },
  headerMore: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingLeft: space.sm },
  sheetList: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  line: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.rowLine,
  },
  gst: { gap: space.xs },
  payIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  payRight: { alignItems: 'flex-end', gap: 2 },
  struck: { textDecorationLine: 'line-through' },
  summary: { gap: space.xs, padding: space.md, borderRadius: radius.md, backgroundColor: colors.soft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.tealTint, borderColor: colors.teal },
});
