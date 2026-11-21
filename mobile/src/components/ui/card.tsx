import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './app-text';

type Props = {
  children: ReactNode;
  /**
   * plain: white + border. warm: urgent highlight (#FFF8EE). active: job being
   * worked on (saffron border). recessed: grey fill inside a card (read-only field).
   */
  tone?: 'plain' | 'warm' | 'active' | 'recessed';
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Resting container (DESIGN.md "Elevation & Depth"): no shadows, a 1 px border. */
export function Card({ children, tone = 'plain', onPress, accessibilityLabel, style }: Props) {
  const s = [styles.card, styles[tone], style];
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [...s, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={s}>{children}</View>;
}

/** Small uppercase stamp above a group ("ADDRESS", "ACS · 2"). */
export function SectionLabel({ children, color = colors.muted }: { children: ReactNode; color?: string }) {
  return (
    <AppText variant="label" color={color}>
      {children}
    </AppText>
  );
}

/** Read-only label + value pair in a grey box (owner job details). */
export function Field({ label, value, hint, valueColor }: { label: string; value: ReactNode; hint?: string; valueColor?: string }) {
  return (
    <View style={styles.field}>
      <AppText variant="support" color={colors.muted}>
        {label}
      </AppText>
      <AppText weight="semibold" color={valueColor}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="small" color={colors.muted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, padding: space.lg, gap: space.sm },
  plain: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  warm: { backgroundColor: colors.warmFill, borderWidth: 1, borderColor: colors.warmLine },
  active: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.saffron },
  recessed: { backgroundColor: colors.soft },
  pressed: { backgroundColor: colors.tealTint },
  field: { backgroundColor: colors.soft, borderRadius: radius.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, gap: 2 },
});
