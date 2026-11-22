import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space, touch } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

/**
 * DESIGN.md buttons:
 * - primary: teal fill (main action)
 * - secondary: white, teal outline
 * - tonal: teal tint fill (Call, WhatsApp)
 * - soft: grey fill (Update status, Directions)
 * - destructive: red outline (Log out, Cancel job)
 * - dashed: dashed outline (+ Add AC)
 * - text: link-style (Skip for now)
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'soft' | 'destructive' | 'dashed' | 'text';

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
  tonal: colors.tealTintText,
  soft: colors.ink,
  destructive: colors.bad,
  dashed: colors.tealTintText,
  text: colors.tealTintText,
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
        >
          {shown}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.min,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { minHeight: touch.action },
  largeText: { fontSize: 17 },
  // A label too long for one line wraps centred, beside the icon, not flush left.
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, maxWidth: '100%' },
  label: { flexShrink: 1, textAlign: 'center' },
  primary: { backgroundColor: colors.teal },
  secondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.teal },
  tonal: { backgroundColor: colors.tealTint },
  soft: { backgroundColor: colors.soft },
  destructive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.bad },
  dashed: { backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line2 },
  text: { backgroundColor: 'transparent' },
  inactive: { backgroundColor: colors.soft, borderColor: colors.soft, opacity: 0.8 },
});

const pressedStyle = StyleSheet.create({
  primary: { backgroundColor: colors.tealDark },
  secondary: { backgroundColor: colors.tealTint },
  tonal: { backgroundColor: '#D3E9E4' },
  soft: { backgroundColor: colors.line },
  destructive: { backgroundColor: colors.badTint },
  dashed: { backgroundColor: colors.tealTint },
  text: { backgroundColor: colors.tealTint },
});
