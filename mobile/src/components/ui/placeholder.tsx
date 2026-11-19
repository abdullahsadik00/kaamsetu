import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './app-text';
import { Screen } from './screen';

type Props = {
  title?: string;
  body?: string;
};

/** EmptyState card (docs/02 §6) used by screens that are not built yet. */
export function Placeholder({ title, body }: Props) {
  const { t } = useTranslation();
  return (
    <Screen>
      <View style={styles.empty}>
        <AppText variant="section">{title ?? t('common.comingSoonTitle')}</AppText>
        <AppText variant="support" color={colors.slate} style={styles.center}>
          {body ?? t('common.comingSoonBody')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line2,
    borderRadius: radius.md,
    padding: space.xl,
    alignItems: 'center',
    gap: space.sm,
  },
  center: { textAlign: 'center' },
});
