import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { z } from 'zod';

import { ApiError, errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { colors, radius, space } from '@/theme/tokens';

import {
  createCustomer,
  CUSTOMERS_KEY,
  updateCustomer,
  useCustomer,
  type Customer,
  type CustomerType,
} from './api';

const phone = z
  .string()
  .transform((v) => v.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/));

const schema = z.object({
  type: z.enum(['INDIVIDUAL', 'BUSINESS']),
  name: z.string().trim().min(2),
  phone,
  notes: z.string().trim(),
  gstBills: z.boolean(),
  address: z.string().trim(),
  locality: z.string().trim(),
  landmark: z.string().trim(),
  city: z.string().trim(),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

/** Add customer (with first address) or edit customer details (T4.3). */
export function CustomerFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useQuery({ ...useCustomer(id ?? ''), enabled: Boolean(id) });
  if (id && existing.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;
  return <CustomerForm customer={id ? existing.data : undefined} />;
}

function CustomerForm({ customer }: { customer?: Customer }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const editing = Boolean(customer);
  const [duplicate, setDuplicate] = useState<{ customerId: string; name: string } | null>(null);
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(
      editing ? schema : schema.refine((v) => v.address.length >= 3, { path: ['address'] }),
    ),
    defaultValues: {
      type: customer?.type ?? 'INDIVIDUAL',
      name: customer?.name ?? '',
      phone: customer?.phone.replace(/^\+91/, '') ?? '',
      notes: customer?.notes ?? '',
      gstBills: customer?.gstBills ?? false,
      address: '',
      locality: '',
      landmark: '',
      city: '',
    },
  });

  const save = useMutation({
    mutationFn: async ({ v, anyway }: { v: FormOut; anyway: boolean }) => {
      const common = {
        type: v.type,
        name: v.name,
        phone: `+91${v.phone}`,
        gstBills: v.gstBills,
      };
      if (customer) {
        return updateCustomer(customer.id, { ...common, notes: v.notes || null });
      }
      return createCustomer({
        ...common,
        ...(v.notes ? { notes: v.notes } : {}),
        allowDuplicatePhone: anyway,
        site: {
          addressLine1: v.address,
          ...(v.locality ? { locality: v.locality } : {}),
          ...(v.landmark ? { landmark: v.landmark } : {}),
          ...(v.city ? { city: v.city } : {}),
        },
      });
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      if (customer) router.back();
      else router.replace({ pathname: '/customers/[id]', params: { id: saved.id } });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'CUSTOMER_PHONE_EXISTS') {
        setDuplicate(error.details as { customerId: string; name: string });
      }
    },
  });
  const submit = (anyway: boolean) =>
    form.handleSubmit((v) => save.mutate({ v, anyway }))();

  const types: { value: CustomerType; label: string }[] = [
    { value: 'INDIVIDUAL', label: t('customers.typeHome') },
    { value: 'BUSINESS', label: t('customers.typeBusiness') },
  ];

  return (
    <Screen
      footer={
        <Button
          label={editing ? t('customers.save') : t('customers.add')}
          onPress={() => submit(false)}
          loading={save.isPending}
        />
      }
    >
      <Controller
        control={form.control}
        name="type"
        render={({ field }) => (
          <ChoiceChips label={t('customers.type')} options={types} value={field.value} onChange={field.onChange} />
        )}
      />
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label={t('customers.name')}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('customers.nameError') : undefined}
          />
        )}
      />
      <Controller
        control={form.control}
        name="phone"
        render={({ field, fieldState }) => (
          <TextField
            label={t('customers.phone')}
            prefix="+91"
            keyboardType="phone-pad"
            maxLength={12}
            value={field.value}
            onChangeText={(v) => {
              setDuplicate(null);
              field.onChange(v);
            }}
            error={fieldState.error ? t('auth.phoneInvalid') : undefined}
          />
        )}
      />
      {duplicate ? (
        <View style={styles.warn}>
          <AppText weight="semibold">{t('customers.duplicate', { name: duplicate.name })}</AppText>
          <Button
            variant="secondary"
            label={t('customers.openExisting', { name: duplicate.name })}
            onPress={() =>
              router.replace({ pathname: '/customers/[id]', params: { id: duplicate.customerId } })
            }
          />
          <Button variant="text" label={t('customers.addAnyway')} onPress={() => submit(true)} />
        </View>
      ) : null}
      {!editing ? (
        <>
          <Controller
            control={form.control}
            name="address"
            render={({ field, fieldState }) => (
              <TextField
                label={t('customers.addressLine')}
                placeholder={t('customers.addressHint')}
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error ? t('customers.addressError') : undefined}
              />
            )}
          />
          <Controller
            control={form.control}
            name="locality"
            render={({ field }) => (
              <TextField label={t('customers.locality')} value={field.value} onChangeText={field.onChange} />
            )}
          />
          <Controller
            control={form.control}
            name="landmark"
            render={({ field }) => (
              <TextField label={t('customers.landmarkOptional')} value={field.value} onChangeText={field.onChange} />
            )}
          />
          <Controller
            control={form.control}
            name="city"
            render={({ field }) => (
              <TextField label={t('onboarding.city')} value={field.value} onChangeText={field.onChange} />
            )}
          />
        </>
      ) : null}
      <Controller
        control={form.control}
        name="notes"
        render={({ field }) => (
          <TextField label={t('customers.notes')} value={field.value} onChangeText={field.onChange} multiline />
        )}
      />
      <Controller
        control={form.control}
        name="gstBills"
        render={({ field }) => (
          <View style={styles.switchCard}>
            <View style={{ flex: 1 }}>
              <AppText weight="semibold">{t('customers.gstBills')}</AppText>
              <AppText variant="support" color={colors.slate}>
                {t('onboarding.gstBillsHint')}
              </AppText>
            </View>
            <Switch
              accessibilityLabel={t('customers.gstBills')}
              value={field.value}
              onValueChange={field.onChange}
              trackColor={{ true: colors.teal, false: colors.line2 }}
              thumbColor={colors.white}
            />
          </View>
        )}
      />
      {save.error && !duplicate ? (
        <AppText color={colors.bad} accessibilityLiveRegion="polite">
          {errorMessage(t, save.error)}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  warn: {
    backgroundColor: colors.warnTint,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
