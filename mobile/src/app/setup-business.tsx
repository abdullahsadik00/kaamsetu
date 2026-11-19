import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { ProfileSection } from '@/features/profile/profile-section';
import { colors, space } from '@/theme/tokens';

/** Logged in but not part of any business yet. Onboarding (prototype "Your business") comes later. */
export default function SetupBusinessScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ gap: space.sm, paddingTop: space.xl }}>
        <AppText variant="title">{t('setup.heading')}</AppText>
        <AppText color={colors.slate}>{t('setup.body')}</AppText>
      </View>
      <ProfileSection />
    </Screen>
  );
}
