import { useNetInfo } from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/features/auth/session';
import { colors, space } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon } from './icon';

/**
 * Offline bar (component reference): tells staff they can keep working.
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
      <Icon name="wifi-off" size={18} color={colors.grey} />
      <AppText variant="support" weight="semibold" color={colors.grey} style={styles.text}>
        {t('sync.noNet')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.greyTint,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  text: { flex: 1 },
});
