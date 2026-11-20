import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';
import { z } from 'zod';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { createBusiness, useSession } from '@/features/auth/session';
import { colors, radius, space } from '@/theme/tokens';

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const schema = z
  .object({
    name: z.string().trim().min(2),
    ownerName: z.string().trim().min(2),
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

/** "Your business" (T4.1, prototype onboarding step 1; built early under D-027). */
export function BusinessScreen() {
  const { t } = useTranslation();
  const user = useSession((s) => s.profile?.user);
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      ownerName: user?.name ?? '',
      phone: user?.phone?.replace(/^\+91/, '') ?? '',
      city: '',
      gstBills: false,
      gstin: '',
    },
  });
  const gstBills = useWatch({ control: form.control, name: 'gstBills' });
  const create = useMutation({
    mutationFn: (v: FormOut) =>
      createBusiness({
        name: v.name,
        ownerName: v.ownerName,
        phone: `+91${v.phone}`,
        ...(v.city ? { city: v.city } : {}),
        gstBills: v.gstBills,
        ...(v.gstBills && v.gstin ? { gstin: v.gstin } : {}),
      }),
    // The session now has the OWNER role; the root guards open the owner tabs.
    onSuccess: () => router.replace('/'),
  });
  const submit = form.handleSubmit((v) => create.mutate(v));

  return (
    <Screen
      footer={
        <>
          <Button label={t('onboarding.create')} onPress={() => submit()} loading={create.isPending} />
          <AppText variant="support" color={colors.slate} style={styles.center}>
            {t('onboarding.trial')}
          </AppText>
        </>
      }
    >
      <View style={{ gap: space.xs }}>
        <AppText variant="title">{t('onboarding.heading')}</AppText>
        <AppText color={colors.slate}>{t('onboarding.hint')}</AppText>
      </View>
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.name')}
            placeholder={t('onboarding.namePlaceholder')}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('onboarding.nameError') : undefined}
          />
        )}
      />
      <Controller
        control={form.control}
        name="ownerName"
        render={({ field, fieldState }) => (
          <TextField
            label={t('onboarding.ownerName')}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t('onboarding.ownerNameError') : undefined}
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
      {create.error ? (
        <AppText color={colors.bad} accessibilityLiveRegion="polite">
          {errorMessage(t, create.error)}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
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
