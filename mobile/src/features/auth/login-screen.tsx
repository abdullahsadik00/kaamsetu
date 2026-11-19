import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { LanguagePicker } from '@/components/ui/language-picker';
import { Screen } from '@/components/ui/screen';
import { colors, space, touch } from '@/theme/tokens';

import { googleLogin } from './session';

/** Phone + OTP stays for development and tests until an SMS provider is chosen (Q-08). */
const phoneLoginShown = __DEV__ || process.env.EXPO_PUBLIC_PHONE_LOGIN === '1';

/** Pilot login (D-025): one button, the Google account already on the phone. */
export function LoginScreen() {
  const { t } = useTranslation();
  const login = useMutation({ mutationFn: googleLogin });

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ gap: space.sm, paddingTop: space.xxl }}>
        <AppText variant="title" color={colors.teal}>
          {t('common.appName')}
        </AppText>
        <AppText color={colors.slate}>{t('common.tagline')}</AppText>
      </View>
      <View style={{ gap: space.md, paddingTop: space.xl }}>
        <Button
          label={t('auth.google')}
          onPress={() => login.mutate()}
          loading={login.isPending}
          testID="google-login"
        />
        <AppText variant="support" color={colors.slate}>
          {t('auth.googleHint')}
        </AppText>
        {login.error ? (
          <AppText color={colors.bad} accessibilityLiveRegion="polite">
            {errorMessage(t, login.error)}
          </AppText>
        ) : null}
      </View>
      <LanguagePicker />
      {phoneLoginShown ? (
        <Link href="/phone" style={{ minHeight: touch.min, paddingVertical: space.md }}>
          <AppText variant="support" weight="semibold" color={colors.teal}>
            {t('auth.phoneInstead')}
          </AppText>
        </Link>
      ) : null}
    </Screen>
  );
}
