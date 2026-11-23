import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { LanguagePicker } from '@/components/ui/language-picker';
import { Screen } from '@/components/ui/screen';
import { fontFamily } from '@/theme/fonts';
import { colors, radius, space, touch } from '@/theme/tokens';

import { googleLogin } from './session';

/** Phone + OTP stays for development and tests until an SMS provider is chosen (Q-08). */
const phoneLoginShown = __DEV__ || process.env.EXPO_PUBLIC_PHONE_LOGIN === '1';

/**
 * Log in (screen 53), after the welcome (51) or the walkthrough (52): the teal
 * brand block, then one button for the Google account already on the phone (D-025).
 */
export function LoginScreen() {
  const { t } = useTranslation();
  const login = useMutation({ mutationFn: googleLogin });

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Icon name="bridge" size={44} color={colors.teal} />
        </View>
        <AppText variant="title" color={colors.white} style={styles.center}>
          {t('common.appName')}
        </AppText>
        <AppText variant="section" color={colors.white} style={[styles.center, styles.devanagari]}>
          कामसेतु
        </AppText>
        <AppText color={colors.tealTint} style={styles.center}>
          {t('common.tagline')}
        </AppText>
      </View>

      <View style={styles.flexGrow} />

      <View style={styles.login}>
        <AppText variant="title">{t('auth.loginTitle')}</AppText>
        <Button
          label={t('auth.google')}
          icon="google"
          size="large"
          onPress={() => login.mutate()}
          loading={login.isPending}
          testID="google-login"
        />
        <AppText variant="support" color={colors.muted}>
          {t('auth.googleHint')}
        </AppText>
        {login.error ? (
          <AppText color={colors.bad} accessibilityLiveRegion="polite">
            {errorMessage(t, login.error)}
          </AppText>
        ) : null}
      </View>
      <View style={styles.hr} />
      <LanguagePicker />
      {phoneLoginShown ? (
        <Link href="/phone" style={styles.devLink}>
          <AppText variant="support" weight="semibold" color={colors.teal}>
            {t('auth.phoneInstead')}
          </AppText>
        </Link>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.teal,
    borderRadius: radius.lg,
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    gap: space.sm,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  center: { textAlign: 'center' },
  devanagari: { lineHeight: 30, fontFamily: fontFamily('hi', 'bold') },
  flexGrow: { flexGrow: 1 },
  login: { gap: space.md },
  hr: { height: 1, backgroundColor: colors.rowLine },
  devLink: { minHeight: touch.min, paddingVertical: space.md },
});
