import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { ApiError, errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
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
import { SegmentToggle, SwitchCard } from './people-ui';

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
  // returnTo=job: opened from the New enquiry or job form, which should get the customer back (BUG-14).
  const { id, returnTo } = useLocalSearchParams<{ id?: string; returnTo?: string }>();
  const existing = useQuery({ ...useCustomer(id ?? ''), enabled: Boolean(id) });
  if (id && existing.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;
  return <CustomerForm customer={id ? existing.data : undefined} backToJob={returnTo === 'job'} />;
}

function CustomerForm({ customer, backToJob }: { customer?: Customer; backToJob?: boolean }) {
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

  /** After adding (or picking the existing) customer: back to the job form with them selected, or open them. */
  const done = (customerId: string) => {
    if (backToJob) router.dismissTo({ pathname: '/jobs/new', params: { customerId } });
    else router.replace({ pathname: '/customers/[id]', params: { id: customerId } });
  };
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
      else done(saved.id);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'CUSTOMER_PHONE_EXISTS') {
        setDuplicate(error.details as { customerId: string; name: string });
      }
    },
  });
  const submit = (anyway: boolean) =>
    form.handleSubmit((v) => save.mutate({ v, anyway }))();

  const types: { value: CustomerType; label: string; icon: 'home-outline' | 'office-building-outline' }[] = [
    { value: 'INDIVIDUAL', label: t('customers.typeHome'), icon: 'home-outline' },
    { value: 'BUSINESS', label: t('customers.typeBusiness'), icon: 'office-building-outline' },
  ];

  return (
    <Screen
      footer={
        <Button
          label={editing ? t('customers.save') : t('uiPeople.saveCustomer')}
          onPress={() => submit(false)}
          loading={save.isPending}
        />
      }
    >
      <Controller
        control={form.control}
        name="type"
        render={({ field }) => (
          <SegmentToggle label={t('customers.type')} options={types} value={field.value} onChange={field.onChange} />
        )}
      />
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label={t('customers.name')}
            placeholder={t('uiPeople.namePlaceholder')}
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
        <View style={styles.warn} accessibilityLiveRegion="polite">
          <View style={styles.warnHead}>
            <Icon name="alert-outline" color={colors.warn} />
            <AppText weight="semibold" color={colors.warn} style={{ flex: 1 }}>
              {t('customers.duplicate', { name: duplicate.name })}
            </AppText>
          </View>
          <Button
            variant="secondary"
            label={t('customers.openExisting', { name: duplicate.name })}
            onPress={() =>
              done(duplicate.customerId)
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
                multiline
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
              <TextField
                label={t('customers.landmark')}
                optionalLabel={t('uiPeople.optional')}
                value={field.value}
                onChangeText={field.onChange}
              />
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
          <SwitchCard
            title={t('customers.gstBills')}
            hint={t('uiPeople.gstHint')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      {!editing ? (
        <AppText variant="support" color={colors.muted} style={{ textAlign: 'center' }}>
          {t('uiPeople.addAcsLater')}
        </AppText>
      ) : null}
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
  warnHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
});
