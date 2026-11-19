import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { z } from 'zod';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ProfileSection } from '@/features/profile/profile-section';
import { colors, space } from '@/theme/tokens';

import { acceptInvite, useSession } from './session';

const schema = z.object({
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, ''))
    .pipe(z.string().regex(/^[6-9]\d{9}$/)),
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Signed in with Google but not part of a business yet (D-025): scan the
 * owner's QR, or type phone + code. A `kaamsetu://join` link opened earlier
 * is accepted automatically.
 */
export function JoinScreen() {
  const { t } = useTranslation();
  const email = useSession((s) => s.profile?.user.email);
  const pendingInvite = useSession((s) => s.pendingInvite);
  const [manual, setManual] = useState(false);
  const join = useMutation({ mutationFn: acceptInvite });
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', code: '' },
  });

  useEffect(() => {
    if (pendingInvite && join.isIdle) join.mutate({ token: pendingInvite });
  }, [pendingInvite, join]);

  const submit = form.handleSubmit(({ phone, code }) => join.mutate({ phone: `+91${phone}`, code }));

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ gap: space.sm, paddingTop: space.xl }}>
        <AppText variant="title">{t('join.title')}</AppText>
        {email ? (
          <AppText variant="support" color={colors.slate}>
            {t('join.signedInAs', { email })}
          </AppText>
        ) : null}
        <AppText color={colors.slate}>{t('join.body')}</AppText>
      </View>

      <Button label={t('join.scan')} onPress={() => router.push('/scan')} testID="scan-invite" />

      {manual ? (
        <View style={{ gap: space.md }}>
          <Controller
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <TextField
                label={t('join.phoneLabel')}
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
            name="code"
            render={({ field, fieldState }) => (
              <TextField
                label={t('join.codeLabel')}
                big
                keyboardType="number-pad"
                maxLength={6}
                value={field.value}
                onChangeText={(v) => field.onChange(v.replace(/\D/g, ''))}
                error={fieldState.error ? t('auth.otpInvalid') : undefined}
              />
            )}
          />
          <Button
            variant="secondary"
            label={join.isPending ? t('join.joining') : t('join.join')}
            onPress={() => submit()}
            loading={join.isPending}
          />
        </View>
      ) : (
        <Button variant="text" label={t('join.enterCode')} onPress={() => setManual(true)} />
      )}

      {join.error ? (
        <AppText color={colors.bad} accessibilityLiveRegion="polite">
          {errorMessage(t, join.error)}
        </AppText>
      ) : null}

      <AppText variant="support" color={colors.muted}>
        {t('join.ownBusinessLater')}
      </AppText>
      <ProfileSection />
    </Screen>
  );
}
