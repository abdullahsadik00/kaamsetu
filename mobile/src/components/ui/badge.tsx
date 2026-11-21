import { StyleSheet, View } from 'react-native';

import { radius, space, tones, type Tone } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type Props = { label: string; tone: Tone; icon?: IconName };

/** Read-only status badge (DESIGN.md "Status Badges"): deep text on its tint. */
export function Badge({ label, tone, icon }: Props) {
  const c = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.fill }]}>
      {icon ? <Icon name={icon} size={14} color={c.text} /> : null}
      <AppText variant="small" weight="semibold" color={c.text}>
        {label}
      </AppText>
    </View>
  );
}

/** Job status → badge tone (component reference: New blue, Assigned purple, …). */
export const STATUS_TONE: Record<string, Tone> = {
  NEW: 'info',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'warn',
  ON_HOLD: 'orange',
  COMPLETED: 'ok',
  CANCELLED: 'bad',
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
});
