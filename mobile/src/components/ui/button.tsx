import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { colors, radius, space, touch } from '@/theme/tokens';

import { AppText } from './app-text';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
};

/** PrimaryButton / SecondaryButton from docs/02 §6, 56 dp high. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  testID,
}: Props) {
  const inactive = disabled || loading;
  const textColor = variant === 'primary' ? colors.white : colors.teal;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'text' && styles.text,
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AppText weight="semibold" color={textColor}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.action,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.teal },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.teal,
  },
  text: { minHeight: touch.min, backgroundColor: 'transparent' },
  inactive: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
});
