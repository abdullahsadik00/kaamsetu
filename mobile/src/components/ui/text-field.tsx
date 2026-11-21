import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useLanguage } from '@/localization/i18n';
import { fontFamily } from '@/theme/fonts';
import { colors, fontSize, radius, space, touch } from '@/theme/tokens';

import { AppText } from './app-text';

type Props = TextInputProps & {
  label: string;
  error?: string;
  /** Fixed text before the input, e.g. "+91" or "₹". */
  prefix?: string;
  big?: boolean;
  /** Small grey text at the right of the label, e.g. "Optional". */
  optionalLabel?: string;
};

/** DESIGN.md input: 52 dp, 1 px border, 2 px teal when focused, red when wrong. */
export function TextField({ label, error, prefix, big, optionalLabel, style, onFocus, onBlur, ...input }: Props) {
  const language = useLanguage();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <AppText variant="support" weight="semibold">
          {label}
        </AppText>
        {optionalLabel ? (
          <AppText variant="small" color={colors.muted}>
            {optionalLabel}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.box, input.multiline && styles.multi, focused && styles.focused, error ? styles.boxError : null]}>
        {prefix ? (
          <View style={styles.prefix}>
            <AppText weight="semibold" color={colors.slate}>
              {prefix}
            </AppText>
          </View>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { fontFamily: fontFamily(language, big ? 'bold' : 'regular') },
            input.multiline && styles.multiInput,
            big && styles.big,
            style,
          ]}
          {...input}
        />
      </View>
      {error ? (
        <AppText variant="small" color={colors.bad} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  box: {
    minHeight: touch.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
  },
  multi: { alignItems: 'flex-start', minHeight: 96 },
  focused: { borderWidth: 2, borderColor: colors.teal, paddingHorizontal: space.md - 1 },
  boxError: { borderColor: colors.bad, borderWidth: 1.5 },
  prefix: { paddingRight: space.sm, borderRightWidth: 1, borderRightColor: colors.rowLine },
  input: { flex: 1, fontSize: fontSize.body, color: colors.ink, paddingVertical: space.sm },
  multiInput: { textAlignVertical: 'top', minHeight: 80 },
  big: { fontSize: 26, letterSpacing: 8, textAlign: 'center' },
});
