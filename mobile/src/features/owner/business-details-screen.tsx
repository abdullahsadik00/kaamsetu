import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { z } from 'zod';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import {
  ORGANIZATION_KEY,
  updateBusiness,
  useBusiness,
  type Business,
} from '@/features/employees/api';
import { colors, radius, space } from '@/theme/tokens';

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const schema = z
  .object({
    name: z.string().trim().min(2),
    phone: z
      .string()
      .transform((v) => v.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, ''))
      .pipe(z.string().regex(/^[6-9]\d{9}$/)),
    city: z.string().trim(),
    gstBills: z.boolean(),
    gstin: z.string().trim().toUpperCase(),
  })
  .refine((v) => !v.gstin || GSTIN.test(v.gstin), { path: ['gstin'] });

type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

/** Owner edits the business details (D-027). Same fields as onboarding. */
export function BusinessDetailsScreen() {
  const business = useQuery(useBusiness());
  if (business.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;
  if (business.isError) return <ErrorView error={business.error} />;
  return <BusinessForm business={business.data} />;
}

function ErrorView({ error }: { error: unknown }) {
  const { t } = useTranslation();
  return (
    <Screen>
      <AppText color={colors.bad}>{errorMessage(t, error)}</AppText>
    </Screen>
  );
}

function BusinessForm({ business }: { business: Business }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: business.name,
      phone: business.phone.replace(/^\+91/, ''),
      city: business.city ?? '',
      gstBills: business.gstBills,
      gstin: business.gstin ?? '',
    },
  });
  const gstBills = useWatch({ control: form.control, name: 'gstBills' });
  const save = useMutation({
    mutationFn: (v: FormOut) =>
      updateBusiness({
        name: v.name,
        phone: `+91${v.phone}`,
        city: v.city || null,
        gstBills: v.gstBills,
        gstin: v.gstBills && v.gstin ? v.gstin : null,
      }),
    onSuccess: (saved) => {
      qc.setQueryData(ORGANIZATION_KEY, saved);
      form.reset(form.getValues());
    },
  });
  const submit = form.handleSubmit((v) => save.mutate(v));

  return (
    <Screen
      footer={<Button label={t('business.save')} onPress={() => submit()} loading={save.isPending} />}
    >
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.name')}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('onboarding.nameError') : undefined}
          />
        )}
      />
      <Controller
        control={form.control}
        name="phone"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.phone')}
            prefix="+91"
            keyboardType="phone-pad"
            maxLength={12}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('auth.phoneInvalid') : undefined}
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
      <Controller
        control={form.control}
        name="gstBills"
        render={({ field }) => (
          <View style={styles.switchCard}>
            <View style={{ flex: 1 }}>
              <AppText weight="semibold">{t('onboarding.gstBills')}</AppText>
              <AppText variant="support" color={colors.slate}>
                {t('onboarding.gstBillsHint')}
              </AppText>
            </View>
            <Switch
              accessibilityLabel={t('onboarding.gstBills')}
              value={field.value}
              onValueChange={field.onChange}
              trackColor={{ true: colors.teal, false: colors.line2 }}
              thumbColor={colors.white}
            />
          </View>
        )}
      />
      {gstBills ? (
        <Controller
          control={form.control}
          name="gstin"
          render={({ field, fieldState }) => (
            <TextField
              label={t('onboarding.gstin')}
              placeholder="27ABCDE1234F1Z5"
              autoCapitalize="characters"
              maxLength={15}
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error ? t('onboarding.gstinError') : undefined}
            />
          )}
        />
      ) : null}
      {save.isSuccess && !form.formState.isDirty ? (
        <AppText color={colors.ok} accessibilityLiveRegion="polite">
          {t('business.saved')}
        </AppText>
      ) : null}
      {save.error ? (
        <AppText color={colors.bad} accessibilityLiveRegion="polite">
          {errorMessage(t, save.error)}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
