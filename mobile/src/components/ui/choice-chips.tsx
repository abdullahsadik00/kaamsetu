import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space, touch } from '@/theme/tokens';

import { AppText } from './app-text';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
};

/** SelectableOption (docs/02 §6): one choice from a few, large touch targets. */
export function ChoiceChips<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      <AppText variant="support" weight="semibold" color={colors.slate}>
        {label}
      </AppText>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onChange(o.value)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <AppText weight="semibold" color={on ? colors.white : colors.ink}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Several choices from a few (e.g. work done on one AC); same look as ChoiceChips. */
export function MultiChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T[];
  onChange: (value: T[]) => void;
}) {
  return (
    <View style={styles.wrap}>
      <AppText variant="support" weight="semibold" color={colors.slate}>
        {label}
      </AppText>
      <View style={styles.row} accessibilityLabel={label}>
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <Pressable
              key={o.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              style={[styles.chip, on && styles.chipOn]}
            >
              <AppText weight="semibold" color={on ? colors.white : colors.ink}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: touch.min,
    paddingHorizontal: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.teal, borderColor: colors.teal },
});
