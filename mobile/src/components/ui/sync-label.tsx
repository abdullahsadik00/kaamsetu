import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export type SyncState = 'saved' | 'sending' | 'sent' | 'attention';

const LOOK: Record<SyncState, { icon: IconName; color: string }> = {
  saved: { icon: 'cellphone', color: colors.slate },
  sending: { icon: 'arrow-up', color: colors.tealTintText },
  sent: { icon: 'check-all', color: colors.ok },
  attention: { icon: 'alert-outline', color: colors.bad },
};

/** Sync label (component reference): Saved on phone · Sending… · Sent · Needs attention. */
export function SyncLabel({ state }: { state: SyncState }) {
  const { t } = useTranslation();
  const l = LOOK[state];
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <Icon name={l.icon} size={16} color={l.color} />
      <AppText variant="small" weight="semibold" color={l.color}>
        {t(`sync.${state}`)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
