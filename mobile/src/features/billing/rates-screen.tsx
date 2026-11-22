import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { FormSection, OptionChips } from '@/features/jobs/parts';
import { colors } from '@/theme/tokens';

import { BILLING_KEY, createRate, GST_RATES, parseRupees, rupees, toInput, updateRate, useRates, type GstRate, type RateItem } from './api';
import { billingError } from './parts';

type Form = { id: string | null; name: string; price: string; gstRate: GstRate; active: boolean };

/** More › Rate list (T4.10, D-039): usual prices the owner picks when making a bill. */
export function RatesScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const rates = useQuery(useRates(true));
  const [form, setForm] = useState<Form | null>(null);
  const [invalid, setInvalid] = useState(false);

  const close = () => {
    setForm(null);
    setInvalid(false);
    save.reset();
  };
  const save = useMutation({
    mutationFn: (f: { form: Form; active?: boolean }) => {
      const unitPrice = parseRupees(f.form.price) ?? 0;
      const body = { name: f.form.name.trim(), unitPrice, gstRate: f.form.gstRate };
      if (!f.form.id) return createRate(body);
      return updateRate(f.form.id, f.active === undefined ? body : { active: f.active });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [...BILLING_KEY, 'rates'] });
      close();
    },
  });
  const submit = () => {
    if (!form) return;
    if (!form.name.trim() || parseRupees(form.price) === null) {
      setInvalid(true);
      return;
    }
    save.mutate({ form });
  };
  const open = (r: RateItem | null) => {
    setInvalid(false);
    setForm(r ? { id: r.id, name: r.name, price: toInput(r.unitPrice), gstRate: r.gstRate, active: r.active } : { id: null, name: '', price: '', gstRate: 0, active: true });
  };

  if (rates.isPending) return <ActivityIndicator style={styles.flex} color={colors.teal} />;
  const on = rates.data?.filter((r) => r.active) ?? [];
  const off = rates.data?.filter((r) => !r.active) ?? [];
  const row = (r: RateItem, i: number, list: RateItem[]) => (
    <ListRow
      key={r.id}
      title={r.name}
      subtitle={[rupees(r.unitPrice), r.gstRate ? `GST ${r.gstRate}%` : null].filter(Boolean).join(' · ')}
      onPress={() => open(r)}
      divider={i < list.length - 1}
      testID={`rate-${r.id}`}
    />
  );

  return (
    <Screen>
      {rates.isError ? <AppText color={colors.bad}>{billingError(t, rates.error)}</AppText> : null}
      <Button icon="plus" label={t('uiBilling.addRate')} onPress={() => open(null)} />
      {rates.data && rates.data.length === 0 ? <EmptyState icon="tag-outline" title={t('uiBilling.rateEmptyTitle')} body={t('uiBilling.rateEmptyBody')} /> : null}
      {on.length ? <Card style={styles.list}>{on.map(row)}</Card> : null}
      {off.length ? (
        <>
          <SectionLabel>{t('uiBilling.ratesOff', { count: off.length })}</SectionLabel>
          <Card style={styles.list}>{off.map(row)}</Card>
        </>
      ) : null}

      <BottomSheet
        visible={form !== null}
        onClose={close}
        title={form?.id ? t('uiBilling.changeRate') : t('uiBilling.addRate')}
        footer={
          <>
            {invalid ? <AppText color={colors.bad}>{t('uiBilling.rateInvalid')}</AppText> : null}
            {save.error ? <AppText color={colors.bad}>{billingError(t, save.error)}</AppText> : null}
            <Button size="large" label={t('uiBilling.saveItem')} onPress={submit} loading={save.isPending && save.variables?.active === undefined} />
            {form?.id ? (
              <Button
                variant={form.active ? 'destructive' : 'secondary'}
                label={form.active ? t('uiBilling.rateOff') : t('uiBilling.rateOn')}
                onPress={() => save.mutate({ form, active: !form.active })}
                loading={save.isPending && save.variables?.active !== undefined}
              />
            ) : null}
          </>
        }
      >
        {form ? (
          <>
            <TextField label={t('uiBilling.rateName')} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} maxLength={120} />
            <TextField label={t('uiBilling.ratePrice')} prefix="₹" keyboardType="decimal-pad" value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} />
            <FormSection label={t('uiBilling.itemGst')} hint={t('uiBilling.gstProvisional')}>
              <OptionChips
                label={t('uiBilling.itemGst')}
                options={GST_RATES.map((r) => ({ value: String(r), label: `${r}%` }))}
                value={String(form.gstRate)}
                onChange={(v) => setForm({ ...form, gstRate: Number(v) as GstRate })}
              />
            </FormSection>
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingVertical: 0 },
});
