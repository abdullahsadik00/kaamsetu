import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { colors } from '@/theme/tokens';

import { addSite, CUSTOMERS_KEY } from './api';

const schema = z.object({
  label: z.string(),
  address: z.string().trim().min(3),
  locality: z.string().trim(),
  landmark: z.string().trim(),
  city: z.string().trim(),
});
type Form = z.infer<typeof schema>;

const LABELS = ['Home', 'Office', 'Shop'] as const;

/** "Add another address" for a customer (prototype). */
export function SiteFormScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { label: 'Office', address: '', locality: '', landmark: '', city: '' },
  });
  const save = useMutation({
    mutationFn: (v: Form) =>
      addSite(id, {
        label: v.label,
        addressLine1: v.address,
        ...(v.locality ? { locality: v.locality } : {}),
        ...(v.landmark ? { landmark: v.landmark } : {}),
        ...(v.city ? { city: v.city } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      router.back();
    },
  });

  return (
    <Screen
      footer={
        <Button
          label={t('customers.saveAddress')}
          onPress={() => form.handleSubmit((v) => save.mutate(v))()}
          loading={save.isPending}
        />
      }
    >
      <Controller
        control={form.control}
        name="label"
        render={({ field }) => (
          <ChoiceChips
            label={t('customers.addressType')}
            options={LABELS.map((l) => ({ value: l, label: t(`customers.labels.${l}`) }))}
            value={field.value as (typeof LABELS)[number]}
            onChange={field.onChange}
          />
        )}
      />
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
      {save.error ? <AppText color={colors.bad}>{errorMessage(t, save.error)}</AppText> : null}
    </Screen>
  );
}
