import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ApiError } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { displayPhone, useCustomer, useCustomers } from '@/features/customers/api';
import { useBusiness } from '@/features/employees/api';
import { FormSection, OptionChips } from '@/features/jobs/parts';
import { colors, radius, space } from '@/theme/tokens';

import {
  BILLING_KEY,
  billTotals,
  createInvoice,
  GST_RATES,
  longDate,
  parseRupees,
  rupees,
  toInput,
  useRates,
  updateInvoice,
  useInvoice,
  usePrefill,
  type Bill,
  type Collection,
  type GstRate,
  type ItemInput,
  type Kind,
} from './api';
import { billingError, MoneyRow, openInvoice } from './parts';

/** YYYY-MM-DD on this phone, `back` days ago. */
const daysAgo = (back: number) => {
  const d = new Date();
  d.setDate(d.getDate() - back);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const today = () => daysAgo(0);
/** Today and the six days before; a draft's older date stays on offer. */
const dateChoices = (current: string) => {
  const week = [0, 1, 2, 3, 4, 5, 6].map(daysAgo);
  return week.includes(current) ? week : [...week, current];
};
/** "Thu 19" for a YYYY-MM-DD date. */
const shortDay = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
};

/** What the form starts from: a saved draft, a job's prefill, or a blank customer. */
type Start = {
  title: string;
  subtitle: string;
  note?: string;
  customerId: string;
  siteId?: string;
  jobId?: string;
  gstBill: boolean;
  /** Show the GST switch (business makes GST bills, or this one already is). */
  gstAllowed: boolean;
  items: ItemInput[];
  discount: number;
  billDate: string;
  collections: Collection[];
  /** Editing a saved draft. */
  edit?: { id: string; version: number; number: string };
  /** Shown at the top, e.g. after a version conflict reloaded the draft. */
  notice?: string;
};

/**
 * New bill or quotation (Stitch 34–37, 41), or edit a draft. Route params:
 * `id` edits that draft; `jobId` fills a bill from a completed job;
 * `customerId` starts blank for that customer; nothing asks for the customer.
 */
export function InvoiceFormScreen({ kind }: { kind: Kind }) {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string; jobId?: string; customerId?: string }>();
  const [customerId, setCustomerId] = useState<string | null>(params.customerId ?? null);
  const newTitle = kind === 'BILL' ? t('uiBilling.newBill') : t('uiBilling.newQuote');

  if (params.id) return <EditDraft kind={kind} id={params.id} />;
  if (kind === 'BILL' && params.jobId) return <FromJob jobId={params.jobId} />;
  if (!customerId) return <PickCustomer title={newTitle} onPick={setCustomerId} />;
  return <Blank kind={kind} customerId={customerId} title={newTitle} />;
}

function Loading() {
  return <ActivityIndicator style={styles.flex} color={colors.teal} />;
}

function Failed({ error }: { error: unknown }) {
  const { t } = useTranslation();
  return (
    <Screen>
      <AppText color={colors.bad}>{billingError(t, error)}</AppText>
    </Screen>
  );
}

function EditDraft({ kind, id }: { kind: Kind; id: string }) {
  const { t } = useTranslation();
  const inv = useQuery(useInvoice(kind, id));
  const business = useQuery(useBusiness());
  const [conflicted, setConflicted] = useState(false);
  if (inv.isPending || business.isPending) return <Loading />;
  if (inv.isError) return <Failed error={inv.error} />;
  const b = inv.data;
  return (
    <InvoiceForm
      // A new version (after a conflict) restarts the form from the saved lines.
      key={b.version}
      kind={kind}
      start={{
        title: t('uiBilling.editTitle', { number: b.number }),
        subtitle: [b.customerName, b.jobNumber ? t('uiBilling.jobRef', { n: b.jobNumber }) : null].filter(Boolean).join(' · '),
        customerId: b.customerId,
        gstBill: b.gstBill,
        gstAllowed: b.gstBill || !!business.data?.gstBills,
        items: b.items.map(({ description, qty, unitPrice, gstRate }) => ({ description, qty, unitPrice, gstRate })),
        discount: b.discount,
        billDate: b.billDate,
        collections: b.collections,
        edit: { id: b.id, version: b.version, number: b.number },
        notice: conflicted ? t('uiBilling.versionConflict') : undefined,
      }}
      onConflict={() => {
        setConflicted(true);
        void inv.refetch();
      }}
    />
  );
}

function FromJob({ jobId }: { jobId: string }) {
  const { t } = useTranslation();
  const prefill = useQuery(usePrefill(jobId));
  const business = useQuery(useBusiness());
  if (prefill.isPending || business.isPending) return <Loading />;
  if (prefill.isError) return <Failed error={prefill.error} />;
  const p = prefill.data;
  if (p.existingBillId) {
    const billId = p.existingBillId;
    return (
      <Screen>
        <EmptyState
          icon="receipt-text-outline"
          title={t('uiBilling.alreadyBilled')}
          action={<Button label={t('uiBilling.openBill')} onPress={() => router.replace({ pathname: '/bills/[id]', params: { id: billId } })} />}
        />
      </Screen>
    );
  }
  return (
    <InvoiceForm
      kind="BILL"
      start={{
        title: t('uiBilling.newBill'),
        subtitle: t('uiBilling.forJob', { name: p.customer.name, n: p.jobNumber }),
        note: t('uiBilling.prefillNote'),
        customerId: p.customer.id,
        siteId: p.siteId,
        jobId: p.jobId,
        gstBill: p.gstBill,
        gstAllowed: p.gstBill || !!business.data?.gstBills,
        // The service line's name is shown in the phone's language.
        items: p.items.map(({ description, qty, unitPrice, gstRate, source }) => ({
          description: source === 'SERVICE' ? t(`jobs.types.${p.jobType}`) : description,
          qty,
          unitPrice,
          gstRate,
        })),
        discount: 0,
        billDate: today(),
        collections: p.collections,
      }}
    />
  );
}

function Blank({ kind, customerId, title }: { kind: Kind; customerId: string; title: string }) {
  const { t } = useTranslation();
  const customer = useQuery(useCustomer(customerId));
  const business = useQuery(useBusiness());
  if (customer.isPending || business.isPending) return <Loading />;
  if (customer.isError) return <Failed error={customer.error} />;
  const c = customer.data;
  const gstAllowed = !!business.data?.gstBills;
  const site = c.sites.find((s) => s.isDefault) ?? c.sites[0];
  return (
    <InvoiceForm
      kind={kind}
      start={{
        title,
        subtitle: [c.name, displayPhone(c.phone)].join(' · '),
        note: kind === 'QUOTATION' ? t('uiBilling.quoteNote') : undefined,
        customerId: c.id,
        siteId: site?.id,
        gstBill: gstAllowed && c.gstBills,
        gstAllowed,
        items: [],
        discount: 0,
        billDate: today(),
        collections: [],
      }}
    />
  );
}

function PickCustomer({ title, onPick }: { title: string; onPick: (id: string) => void }) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const found = useQuery(useCustomers(q.trim()));
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <TextField label={t('jobs.whichCustomer')} placeholder={t('customers.searchHint')} value={q} onChangeText={setQ} />
      {found.data?.length ? (
        <Card style={styles.listCard}>
          {found.data.map((c, i) => (
            <ListRow
              key={c.id}
              avatar={c.name}
              title={c.name}
              subtitle={[displayPhone(c.phone), c.place].filter(Boolean).join(' · ')}
              onPress={() => onPick(c.id)}
              divider={i < found.data.length - 1}
            />
          ))}
        </Card>
      ) : null}
      {q.trim() && found.data?.length === 0 ? <EmptyState icon="account-search-outline" title={t('customers.noneFound')} /> : null}
    </Screen>
  );
}

type Draft = { description: string; qty: string; rate: string; gstRate: GstRate };

function InvoiceForm({ kind, start, onConflict }: { kind: Kind; start: Start; onConflict?: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [items, setItems] = useState<ItemInput[]>(start.items);
  const [discount, setDiscount] = useState(start.discount);
  const [gstBill, setGstBill] = useState(start.gstBill);
  const [billDate, setBillDate] = useState(start.billDate);
  /** Index of the line being edited, 'new', or null when the sheet is closed. */
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>({ description: '', qty: '1', rate: '', gstRate: 0 });
  const rates = useQuery(useRates());
  const [draftError, setDraftError] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountText, setDiscountText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const totals = billTotals(items, discount, gstBill);
  const takenOnSite = start.collections.filter((c) => c.status !== 'REJECTED');
  const onSite = takenOnSite.reduce((s, c) => s + c.amount, 0);

  const save = useMutation({
    mutationFn: () => {
      if (start.edit) {
        return updateInvoice(kind, start.edit.id, { version: start.edit.version, gstBill, discount, billDate, items });
      }
      return createInvoice(kind, {
        ...(start.jobId ? { jobId: start.jobId } : { customerId: start.customerId }),
        ...(start.siteId ? { siteId: start.siteId } : {}),
        gstBill,
        discount,
        billDate,
        items,
      });
    },
    onSuccess: (saved: Bill) => {
      qc.setQueryData([...BILLING_KEY, saved.kind, saved.id], saved);
      void qc.invalidateQueries({ queryKey: BILLING_KEY });
      if (start.edit) router.back();
      else router.replace({ pathname: kind === 'BILL' ? '/bills/[id]' : '/quotations/[id]', params: { id: saved.id } });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') onConflict?.();
      if (e instanceof ApiError && e.code === 'JOB_ALREADY_BILLED') {
        const billId = (e.details as { billId?: string } | undefined)?.billId;
        if (billId) openInvoice({ kind: 'BILL', id: billId });
      }
    },
  });

  const openItem = (i: number | 'new') => {
    const it = i === 'new' ? null : items[i];
    setDraft(
      it
        ? { description: it.description, qty: String(it.qty), rate: toInput(it.unitPrice), gstRate: it.gstRate }
        : { description: '', qty: '1', rate: '', gstRate: gstBill ? 18 : 0 },
    );
    setDraftError(false);
    setEditing(i);
  };
  const saveItem = () => {
    const qty = Number(draft.qty);
    const unitPrice = parseRupees(draft.rate);
    const description = draft.description.trim();
    if (!description || description.length > 120 || !Number.isInteger(qty) || qty < 1 || qty > 999 || unitPrice === null) {
      setDraftError(true);
      return;
    }
    const line: ItemInput = { description, qty, unitPrice, gstRate: draft.gstRate };
    setItems((cur) => (editing === 'new' ? [...cur, line] : cur.map((x, i) => (i === editing ? line : x))));
    setEditing(null);
  };
  const removeItem = () => {
    setItems((cur) => cur.filter((_, i) => i !== editing));
    setEditing(null);
  };
  const applyDiscount = (paise: number) => {
    setDiscount(paise);
    setDiscountOpen(false);
  };
  const submit = () => {
    setFormError(null);
    if (!items.length) return setFormError(t('uiBilling.noItems'));
    if (discount > totals.subtotal) return setFormError(t('uiBilling.discountTooBig'));
    save.mutate();
  };
  const discountPaise = parseRupees(discountText);

  return (
    <>
      <Stack.Screen options={{ title: start.title }} />
      <Screen
        footer={
          <Button
            size="large"
            label={start.edit ? t('uiBilling.saveChanges') : kind === 'BILL' ? t('uiBilling.saveDraft') : t('uiBilling.saveQuote')}
            onPress={submit}
            loading={save.isPending}
          />
        }
      >
        <AppText variant="support" color={colors.slate}>
          {start.subtitle}
        </AppText>
        {start.notice ? (
          <Card tone="warm">
            <AppText variant="support" accessibilityLiveRegion="polite">
              {start.notice}
            </AppText>
          </Card>
        ) : null}
        {start.note ? (
          <Card tone="recessed">
            <View style={styles.iconLine}>
              <Icon name={kind === 'BILL' ? 'check-circle-outline' : 'file-document-outline'} size={20} color={colors.teal} />
              <AppText variant="support" style={styles.flex}>
                {start.note}
              </AppText>
            </View>
          </Card>
        ) : null}

        <Card>
          <View style={styles.between}>
            <AppText variant="label" color={colors.muted}>
              {t('uiBilling.items')}
            </AppText>
            <AppText variant="label" color={colors.muted}>
              {t('uiBilling.amount')}
            </AppText>
          </View>
          {items.map((it, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`${it.description}, ${rupees(it.qty * it.unitPrice)}`}
              onPress={() => openItem(i)}
              style={({ pressed }) => [styles.line, pressed && styles.pressed]}
            >
              <View style={styles.flex}>
                <AppText weight="semibold">{it.description}</AppText>
                <AppText variant="small" color={colors.slate}>
                  {[t('uiBilling.qtyRate', { qty: it.qty, rate: rupees(it.unitPrice) }), gstBill && it.gstRate ? t('uiBilling.gstRate', { rate: it.gstRate }) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </View>
              <AppText weight="semibold">{rupees(it.qty * it.unitPrice)}</AppText>
            </Pressable>
          ))}
          <Button variant="secondary" icon="plus" label={t('uiBilling.addItem')} onPress={() => openItem('new')} />
          <Button
            variant="text"
            icon="percent"
            label={discount ? `${t('uiBilling.discount')} · −${rupees(discount)}` : t('uiBilling.discount')}
            onPress={() => {
              setDiscountText(discount ? toInput(discount) : '');
              setDiscountOpen(true);
            }}
          />
        </Card>

        <Card>
          <MoneyRow label={t('uiBilling.subtotal')} value={rupees(totals.subtotal)} />
          {discount ? <MoneyRow label={t('uiBilling.discount')} value={`−${rupees(totals.discount)}`} /> : null}
          {start.gstAllowed ? (
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <AppText weight="semibold">{t('uiBilling.gstBill')}</AppText>
                <AppText variant="small" color={colors.slate}>
                  {gstBill ? t('uiBilling.gstProvisional') : t('uiBilling.gstHint')}
                </AppText>
              </View>
              <Switch
                accessibilityLabel={t('uiBilling.gstBill')}
                value={gstBill}
                onValueChange={(on) => {
                  setGstBill(on);
                  // Turning GST on gives untaxed lines the usual 18 % (provisional, Q-04).
                  if (on) setItems((cur) => cur.map((x) => (x.gstRate ? x : { ...x, gstRate: 18 })));
                }}
                trackColor={{ true: colors.teal, false: colors.line2 }}
                thumbColor={colors.white}
              />
            </View>
          ) : null}
          {totals.gst.map((g) => (
            <View key={g.rate} style={styles.gst}>
              <MoneyRow label={t('uiBilling.cgst', { rate: g.rate / 2 })} value={rupees(g.cgst)} />
              <MoneyRow label={t('uiBilling.sgst', { rate: g.rate / 2 })} value={rupees(g.sgst)} />
            </View>
          ))}
          <MoneyRow strong label={kind === 'BILL' ? t('uiBilling.billTotal') : t('uiBilling.total')} value={rupees(totals.total)} />
          {kind === 'BILL'
            ? takenOnSite.map((c) => (
                <MoneyRow
                  key={c.id}
                  label={t('uiBilling.takenOnSite', { mode: t(`uiBilling.mode_${c.mode}`) })}
                  value={`−${rupees(c.amount)}`}
                  color={colors.ok}
                />
              ))
            : null}
          {kind === 'BILL' && onSite ? (
            <MoneyRow strong label={t('uiBilling.remaining')} value={rupees(Math.max(totals.total - onSite, 0))} color={colors.tealTintText} />
          ) : null}
        </Card>

        <Card tone="recessed">
          {/* Bill date: today or the last week, e.g. a bill made the day after the work (T4.10). */}
          <OptionChips
            label={kind === 'BILL' ? t('uiBilling.billDate') : t('uiBilling.quoteDate')}
            options={dateChoices(start.billDate).map((d, i) => ({
              value: d,
              label: d === today() ? t('jobs.today') : d === daysAgo(1) ? t('uiBilling.yesterday') : i < 7 ? shortDay(d) : longDate(d),
            }))}
            value={billDate}
            onChange={setBillDate}
          />
          <AppText weight="semibold">{longDate(billDate)}</AppText>
          <AppText variant="small" color={colors.muted}>
            {start.edit ? start.edit.number : t('uiBilling.numberLater')}
          </AppText>
        </Card>

        {formError ? <AppText color={colors.bad}>{formError}</AppText> : null}
        {save.error ? (
          <AppText color={colors.bad} accessibilityLiveRegion="polite">
            {billingError(t, save.error)}
          </AppText>
        ) : null}
      </Screen>

      {/* Stitch 36: add or change one line */}
      <BottomSheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('uiBilling.addItem') : t('uiBilling.changeItem')}
        footer={
          <>
            {draftError ? <AppText color={colors.bad}>{t('uiBilling.itemInvalid')}</AppText> : null}
            <Button size="large" label={t('uiBilling.saveItem')} onPress={saveItem} />
            {editing !== 'new' ? <Button variant="destructive" label={t('uiBilling.removeItem')} onPress={removeItem} /> : null}
          </>
        }
      >
        {/* Rate list (T4.10, D-039): one tap fills the name, rate and GST; all can still be changed. */}
        {editing === 'new' && rates.data?.length ? (
          <FormSection label={t('uiBilling.fromRateList')}>
            <OptionChips
              label={t('uiBilling.fromRateList')}
              options={rates.data.map((r) => ({ value: r.id, label: r.name }))}
              value={rates.data.find((r) => r.name === draft.description.trim())?.id ?? null}
              onChange={(id) => {
                const r = rates.data?.find((x) => x.id === id);
                if (r) setDraft((d) => ({ ...d, description: r.name, rate: toInput(r.unitPrice), gstRate: gstBill ? r.gstRate : 0 }));
              }}
            />
          </FormSection>
        ) : null}
        <TextField
          label={t('uiBilling.itemWhat')}
          value={draft.description}
          onChangeText={(v) => setDraft((d) => ({ ...d, description: v }))}
          maxLength={120}
        />
        <View style={styles.pair}>
          <View style={styles.qty}>
            <TextField
              label={t('uiBilling.itemQty')}
              keyboardType="number-pad"
              value={draft.qty}
              onChangeText={(v) => setDraft((d) => ({ ...d, qty: v.replace(/\D/g, '') }))}
              maxLength={3}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label={t('uiBilling.itemRate')}
              prefix="₹"
              keyboardType="decimal-pad"
              value={draft.rate}
              onChangeText={(v) => setDraft((d) => ({ ...d, rate: v }))}
            />
          </View>
        </View>
        {gstBill ? (
          <FormSection label={t('uiBilling.itemGst')} hint={t('uiBilling.gstProvisional')}>
            <OptionChips
              label={t('uiBilling.itemGst')}
              options={GST_RATES.map((r) => ({ value: String(r), label: `${r}%` }))}
              value={String(draft.gstRate)}
              onChange={(v) => setDraft((d) => ({ ...d, gstRate: Number(v) as GstRate }))}
            />
          </FormSection>
        ) : null}
      </BottomSheet>

      {/* Stitch 37: discount */}
      <BottomSheet
        visible={discountOpen}
        onClose={() => setDiscountOpen(false)}
        title={t('uiBilling.discount')}
        subtitle={`${t('uiBilling.subtotal')} ${rupees(totals.subtotal)}`}
        footer={
          <>
            <Button
              size="large"
              label={t('uiBilling.applyDiscount')}
              onPress={() => discountPaise !== null && applyDiscount(discountPaise)}
              disabled={discountPaise === null || discountPaise > totals.subtotal}
            />
            {discount ? <Button variant="text" label={t('uiBilling.noDiscount')} onPress={() => applyDiscount(0)} /> : null}
          </>
        }
      >
        <View style={styles.chips}>
          {[5000, 10000, 20000, 50000].map((p) => (
            <Pressable key={p} accessibilityRole="button" onPress={() => setDiscountText(toInput(p))} style={styles.chip}>
              <AppText weight="semibold">{rupees(p)}</AppText>
            </Pressable>
          ))}
        </View>
        <TextField
          label={t('uiBilling.discountAmount')}
          prefix="₹"
          keyboardType="decimal-pad"
          value={discountText}
          onChangeText={setDiscountText}
          error={discountPaise !== null && discountPaise > totals.subtotal ? t('uiBilling.discountTooBig') : undefined}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  iconLine: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  listCard: { paddingVertical: space.xs },
  line: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.rowLine,
  },
  pressed: { backgroundColor: colors.tealTint },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  gst: { gap: space.xs },
  pair: { flexDirection: 'row', gap: space.md },
  qty: { width: 96 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
  },
});
