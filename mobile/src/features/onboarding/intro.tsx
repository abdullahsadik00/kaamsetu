import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button, ButtonRow } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import type { BusinessType } from '@/features/employees/api';
import { colors, radius, space } from '@/theme/tokens';

import { BusinessTypeChoice } from './business-type';
import { useOnboardingChoice } from './choice';

/** Screen 51: the teal welcome. "Get started" goes to the type question; an existing user logs in. */
export function WelcomeScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.welcome} edges={['top', 'bottom']}>
      <View style={styles.logo}>
        <Icon name="bridge" size={44} color={colors.teal} />
      </View>
      <AppText variant="title" color={colors.white} style={styles.center}>
        {t('common.appName')}
      </AppText>
      <AppText variant="section" weight="bold" color={colors.white} style={styles.center}>
        कामसेतु
      </AppText>
      <AppText color={colors.tealTint} style={[styles.center, styles.tagline]}>
        {t('common.tagline')}
      </AppText>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/how-you-work')}
        style={({ pressed }) => [styles.start, pressed && { opacity: 0.9 }]}
      >
        <AppText weight="semibold" color={colors.teal} style={styles.startText}>
          {t('welcome.getStarted')}
        </AppText>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push('/login')} hitSlop={12}>
        <AppText weight="semibold" color={colors.white}>
          {t('welcome.alreadyUse')}
        </AppText>
      </Pressable>
    </SafeAreaView>
  );
}

/** "How do you work?" before the walkthrough (D-044): the walkthrough and the app follow the answer. */
export function HowYouWorkScreen() {
  const { t } = useTranslation();
  const chosen = useOnboardingChoice((s) => s.businessType);
  const setChosen = useOnboardingChoice((s) => s.setBusinessType);
  const [error, setError] = useState(false);
  return (
    <Screen
      footer={
        <Button
          size="large"
          label={t('welcome.next')}
          onPress={() => (chosen ? router.push('/walkthrough') : setError(true))}
        />
      }
    >
      <BusinessTypeChoice
        value={chosen}
        onChange={(v) => {
          setChosen(v);
          setError(false);
        }}
        error={error ? t('onboarding.typeError') : undefined}
      />
    </Screen>
  );
}

type Step = { icon: IconName; title: string; body: string };

/** The middle step speaks to how the business works: a team, a pair, or one person. */
const WORK_STEP: Record<BusinessType, Step> = {
  VENDOR: { icon: 'account-group-outline', title: 'welcome.teamsTitle', body: 'welcome.teamsBody' },
  CREW: { icon: 'account-multiple-outline', title: 'welcome.crewTitle', body: 'welcome.crewBody' },
  SOLO: { icon: 'account-outline', title: 'welcome.soloTitle', body: 'welcome.soloBody' },
};

const stepsFor = (type: BusinessType): Step[] => [
  { icon: 'inbox-outline', title: 'welcome.enquiriesTitle', body: 'welcome.enquiriesBody' },
  WORK_STEP[type],
  { icon: 'receipt-text-outline', title: 'welcome.billsTitle', body: 'welcome.billsBody' },
];

/** Screen 52: three steps with Skip, Back and Next; the last one goes to log in. */
export function WalkthroughScreen() {
  const { t } = useTranslation();
  const type = useOnboardingChoice((s) => s.businessType) ?? 'VENDOR';
  const steps = stepsFor(type);
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;
  const toLogin = () => router.push('/login');
  const next = <Button size="large" label={last ? t('welcome.continue') : t('welcome.next')} onPress={last ? toLogin : () => setI(i + 1)} />;

  return (
    <SafeAreaView style={styles.walk} edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        <Pressable accessibilityRole="button" onPress={toLogin} hitSlop={12}>
          <AppText weight="semibold" color={colors.teal}>
            {t('welcome.skip')}
          </AppText>
        </Pressable>
      </View>
      <View style={styles.stepBody}>
        <View style={styles.stepIcon}>
          <Icon name={step.icon} size={52} color={colors.teal} />
        </View>
        <AppText variant="support" weight="semibold" color={colors.teal}>
          {t('welcome.stepOf', { n: i + 1, total: steps.length })}
        </AppText>
        <AppText variant="title" style={styles.center} accessibilityRole="header">
          {t(step.title)}
        </AppText>
        <AppText color={colors.slate} style={styles.center}>
          {t(step.body)}
        </AppText>
      </View>
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {steps.map((s, n) => (
          <View key={s.title} style={[styles.dot, n === i && styles.dotOn]} />
        ))}
      </View>
      <View style={styles.footer}>
        {i === 0 ? (
          next
        ) : (
          <ButtonRow>
            <Button variant="secondary" size="large" label={t('welcome.back')} onPress={() => setI(i - 1)} />
            {next}
          </ButtonRow>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  welcome: {
    flex: 1,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.sm,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  tagline: { marginTop: space.md, marginBottom: space.xl, maxWidth: 280 },
  start: {
    minWidth: 220,
    paddingVertical: 14,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  startText: { fontSize: 17 },
  walk: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: space.lg },
  skipRow: { alignItems: 'flex-end', paddingVertical: space.md },
  stepBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.md },
  stepIcon: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm, paddingVertical: space.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line2 },
  dotOn: { width: 28, backgroundColor: colors.teal },
  footer: { paddingBottom: space.lg },
});
