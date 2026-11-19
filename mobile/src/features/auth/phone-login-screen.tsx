import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { z } from 'zod';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { LanguagePicker } from '@/components/ui/language-picker';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { colors, space } from '@/theme/tokens';

import { requestOtp } from './session';

/** 10-digit Indian mobile (the backend accepts the same, docs/10 §1). */
const schema = z.object({
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().regex(/^[6-9]\d{9}$/)),
});
type Form = z.input<typeof schema>;

export function PhoneLoginScreen() {
  const { t } = useTranslation();
  const form = useForm<Form, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
  });
  const send = useMutation({
    mutationFn: (digits: string) => requestOtp(`+91${digits}`),
    onSuccess: () => router.push('/otp'),
  });

  const submit = form.handleSubmit(({ phone }) => send.mutate(phone));

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <Button label={t('auth.sendCode')} onPress={submit} loading={send.isPending} />
      }
    >
      <View style={{ gap: space.xs, paddingTop: space.xl }}>
        <AppText variant="title">{t('auth.phoneHeading')}</AppText>
        <AppText color={colors.slate}>{t('auth.phoneHint')}</AppText>
      </View>
      <Controller
        control={form.control}
        name="phone"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.phoneLabel')}
            prefix="+91"
            placeholder={t('auth.phonePlaceholder')}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={12}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={() => submit()}
            error={fieldState.error ? t('auth.phoneInvalid') : undefined}
          />
        )}
      />
      {send.error ? (
        <AppText color={colors.bad} accessibilityLiveRegion="polite">
          {errorMessage(t, send.error)}
        </AppText>
      ) : null}
      <LanguagePicker />
    </Screen>
  );
}
