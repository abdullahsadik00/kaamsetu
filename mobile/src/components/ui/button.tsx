import { Children, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space, touch } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

/**
 * One button system (BUG-07, TP-14):
 * - primary: solid teal, white text. The one main action on a screen.
 * - secondary: white fill, 1.5 dp teal border, teal text. Every other action
 *   (Call, WhatsApp, Directions, Update status, + Add AC, Edit…).
 * - destructive: white fill, red border, red text (Log out, Remove).
 * - text: link-style, teal text (Skip for now, Close enquiry).
 *
 * Every button is a fixed height (48 dp, or 56 dp `large`) with a centred,
 * single-line label that shrinks a little rather than wrap; keep labels short.
 * Icon rule: buttons shown together (one row or one footer) either all have
 * an icon or none do.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'text';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  /** `large` = 56 dp technician action. */
  size?: 'normal' | 'large';
  disabled?: boolean;
  /** Busy: the button is disabled and shows a small spinner beside `loadingLabel` (or the label). */
  loading?: boolean;
  /** What is happening while loading, e.g. "Creating job…". */
  loadingLabel?: string;
  testID?: string;
};

const TEXT: Record<ButtonVariant, string> = {
  primary: colors.white,
  secondary: colors.teal,
  destructive: colors.bad,
  text: colors.teal,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  size = 'normal',
  disabled,
  loading,
  loadingLabel,
  testID,
}: Props) {
  const inactive = disabled || loading;
  // Inactive buttons sit on grey, so their text goes slate (white or teal there read as still tappable).
  const textColor = inactive ? colors.slate : TEXT[variant];
  const shown = loading && loadingLabel ? loadingLabel : label;
  const iconSize = size === 'large' ? 22 : 20;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shown}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        size === 'large' && styles.large,
        styles[variant],
        pressed && pressedStyle[variant],
        inactive && styles.inactive,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={textColor} style={{ width: iconSize, height: iconSize }} />
        ) : icon ? (
          <Icon name={icon} size={iconSize} color={textColor} />
        ) : null}
        <AppText
          weight="semibold"
          color={textColor}
          variant={size === 'large' ? 'body' : 'support'}
          style={[styles.label, size === 'large' && styles.largeText]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {shown}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Buttons side by side, each an equal share of the width (two = 50/50), with the usual gap (BUG-09). */
export function ButtonRow({ children }: { children: ReactNode }) {
  return (
    <View style={styles.buttonRow}>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={styles.cell}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: { flexDirection: 'row', gap: space.sm },
  cell: { flex: 1 },
  base: {
    height: touch.min,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { height: touch.action },
  largeText: { fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, maxWidth: '100%' },
  label: { flexShrink: 1, textAlign: 'center' },
  primary: { backgroundColor: colors.teal },
  secondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.teal },
  destructive: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.bad },
  text: { backgroundColor: 'transparent' },
  inactive: { backgroundColor: colors.soft, borderColor: colors.soft, opacity: 0.8 },
});

const pressedStyle = StyleSheet.create({
  primary: { backgroundColor: colors.tealDark },
  secondary: { backgroundColor: colors.tealTint },
  destructive: { backgroundColor: colors.badTint },
  text: { backgroundColor: colors.tealTint },
});
