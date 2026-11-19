import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useLanguage } from '@/localization/i18n';
import { fontFamily } from '@/theme/fonts';
import { colors, fontSize, radius, space, touch } from '@/theme/tokens';

import { AppText } from './app-text';

type Props = TextInputProps & {
  label: string;
  error?: string;
  /** Fixed text before the input, e.g. "+91". */
  prefix?: string;
  big?: boolean;
};

export function TextField({ label, error, prefix, big, style, ...input }: Props) {
  const language = useLanguage();
  return (
    <View style={styles.wrap}>
      <AppText variant="support" weight="semibold" color={colors.slate}>
        {label}
      </AppText>
      <View style={[styles.box, error ? styles.boxError : null]}>
        {prefix ? (
          <AppText weight="semibold" color={colors.slate}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            { fontFamily: fontFamily(language, big ? 'bold' : 'regular') },
            big && styles.big,
            style,
          ]}
          {...input}
        />
      </View>
      {error ? (
        <AppText variant="support" color={colors.bad} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  box: {
    minHeight: touch.action,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
  },
  boxError: { borderColor: colors.bad, borderWidth: 2 },
  input: { flex: 1, fontSize: fontSize.body, color: colors.ink, paddingVertical: space.sm },
  big: { fontSize: 26, letterSpacing: 8, textAlign: 'center' },
});
