import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { colors, radius, space } from '@/theme/tokens';

/**
 * Owner Home. Until jobs and money arrive (T4.6+), it points a new business
 * to the first thing to do: add staff and invite them (D-027).
 */
export function OwnerHomeScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <View style={styles.card}>
        <AppText variant="section">{t('owner.getStartedTitle')}</AppText>
        <AppText color={colors.slate}>{t('owner.getStartedBody')}</AppText>
        <Button label={t('owner.addStaff')} onPress={() => router.push('/employees/new')} />
        <Button variant="text" label={t('owner.employees')} onPress={() => router.push('/employees')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.md,
  },
});
