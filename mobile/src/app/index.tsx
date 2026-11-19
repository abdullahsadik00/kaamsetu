import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, space } from '@/theme/tokens';

/** Placeholder start screen until login lands (T3.7). */
export default function Index() {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.teal,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.lg,
        padding: space.xl,
      }}
    >
      <AppText variant="title" color={colors.white}>
        {t('common.appName')}
      </AppText>
      <AppText color={colors.white} style={{ textAlign: 'center' }}>
        {t('common.tagline')}
      </AppText>
    </View>
  );
}
