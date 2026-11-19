import { useMutation } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { colors, space } from '@/theme/tokens';

import { requestOtp, useSession, verifyOtp } from './session';

const RESEND_AFTER_S = 30;

/** "+919000002001" → "+91 90000 02001" */
function displayPhone(e164: string): string {
  const d = e164.replace(/^\+91/, '');
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

export function OtpScreen() {
  const { t } = useTranslation();
  const phone = useSession((s) => s.pendingPhone);
  const [code, setCode] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [wait, setWait] = useState(RESEND_AFTER_S);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const verify = useMutation({
    mutationFn: (c: string) => verifyOtp(phone ?? '', c),
    // The root layout's guards then show the right home for the role.
    onSuccess: () => router.replace('/'),
  });
  const resend = useMutation({
    mutationFn: () => requestOtp(phone ?? ''),
    onSuccess: () => {
      setWait(RESEND_AFTER_S);
      setCode('');
      verify.reset();
    },
  });

  if (!phone) return <Redirect href="/login" />;

  const submit = (value = code) => {
    if (!/^\d{6}$/.test(value)) return setInvalid(true);
    setInvalid(false);
    verify.mutate(value);
  };

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !verify.isPending) submit(digits);
  };

  const error = verify.error ?? resend.error;

  return (
    <Screen
      footer={
        <Button label={t('auth.continue')} onPress={() => submit()} loading={verify.isPending} />
      }
    >
      <AppText variant="title" style={{ paddingTop: space.lg }}>
        {t('auth.otpHeading', { phone: displayPhone(phone) })}
      </AppText>
      <TextField
        label={t('auth.otpLabel')}
        big
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={6}
        autoFocus
        error={invalid ? t('auth.otpInvalid') : undefined}
      />
      {error ? (
        <AppText color={colors.bad} accessibilityLiveRegion="polite">
          {errorMessage(t, error)}
        </AppText>
      ) : null}
      <View style={{ gap: space.xs }}>
        {wait > 0 ? (
          <AppText variant="support" color={colors.slate} style={{ textAlign: 'center' }}>
            {t('auth.resendIn', { seconds: wait })}
          </AppText>
        ) : (
          <Button
            variant="text"
            label={t('auth.resend')}
            onPress={() => resend.mutate()}
            loading={resend.isPending}
          />
        )}
        <Button variant="text" label={t('auth.changeNumber')} onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
