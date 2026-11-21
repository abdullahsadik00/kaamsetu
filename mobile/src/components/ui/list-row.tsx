import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

/** Up to two initials, e.g. "Meera Joshi" → "MJ". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase() || '?';
}

/** Round initials badge (customers, employees). */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <AppText variant="support" weight="semibold" color={colors.tealTintText}>
        {initials(name)}
      </AppText>
    </View>
  );
}

type Props = {
  title: string;
  subtitle?: string;
  /** Avatar initials from this name, or an icon in a soft square. */
  avatar?: string;
  icon?: IconName;
  /** Right side, e.g. a Badge; a chevron is shown when pressable and nothing is given. */
  right?: ReactNode;
  onPress?: () => void;
  /** Hairline under the row (lists inside one card). */
  divider?: boolean;
  testID?: string;
};

/** List row (DESIGN.md "Lists & Row Dividers"): ≥ 56 dp, hairline between rows. */
export function ListRow({ title, subtitle, avatar, icon, right, onPress, divider, testID }: Props) {
  const body = (
    <>
      {avatar ? <Avatar name={avatar} /> : null}
      {icon ? (
        <View style={styles.iconBox}>
          <Icon name={icon} color={colors.teal} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText weight="semibold" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" color={colors.slate} numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-right" color={colors.muted} /> : null)}
    </>
  );
  const style = [styles.row, divider && styles.divider];
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  ) : (
    <View style={style} testID={testID}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.rowLine },
  pressed: { backgroundColor: colors.tealTint },
  text: { flex: 1, gap: 2 },
  avatar: { backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
});
