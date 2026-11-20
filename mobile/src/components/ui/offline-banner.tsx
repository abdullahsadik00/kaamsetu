import { useNetInfo } from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/features/auth/session';
import { colors, space } from '@/theme/tokens';

import { AppText } from './app-text';

/**
 * OfflineBanner (docs/02 §6): tells field staff they can keep working.
 * Shown only when signed in and the phone reports no internet; unknown
 * states (null) count as online, so it never flashes at start-up.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const { isConnected, isInternetReachable } = useNetInfo();
  const signedIn = useSession((s) => s.status === 'signedIn');
  const offline = isConnected === false || isInternetReachable === false;
  if (!signedIn || !offline) return null;
  return (
    <View style={styles.bar} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <AppText variant="support" weight="semibold" color={colors.ink}>
        {t('sync.noNet')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.warnTint,
    borderBottomWidth: 1,
    borderBottomColor: colors.warn,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
});
