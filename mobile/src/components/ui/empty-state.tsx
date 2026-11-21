import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type Props = { title: string; body?: string; icon?: IconName; action?: ReactNode };

/** Empty state (component reference / screen 80): dashed card, teal icon, short text. */
export function EmptyState({ title, body, icon = 'briefcase-outline', action }: Props) {
  return (
    <View style={styles.box}>
      <Icon name={icon} size={32} color={colors.teal} />
      <AppText weight="semibold" style={styles.center}>
        {title}
      </AppText>
      {body ? (
        <AppText variant="support" color={colors.slate} style={styles.center}>
          {body}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
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
