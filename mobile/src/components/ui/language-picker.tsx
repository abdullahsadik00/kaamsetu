import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { setLanguage, useLanguage } from '@/localization/i18n';
import { fontFamily } from '@/theme/fonts';
import { LANGUAGE_NAMES, LANGUAGES } from '@/localization/languages';
import { colors, radius, space, touch } from '@/theme/tokens';

import { AppText } from './app-text';

/** English / हिंदी / मराठी chips, as in the prototype. Applies at once. */
export function LanguagePicker() {
  const { t } = useTranslation();
  const current = useLanguage();
  return (
    <View style={styles.wrap}>
      <AppText variant="support" weight="semibold" color={colors.slate}>
        {t('language.label')}
      </AppText>
      <View style={styles.row} accessibilityRole="radiogroup">
        {LANGUAGES.map((lng) => {
          const on = lng === current;
          return (
            <Pressable
              key={lng}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setLanguage(lng)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <AppText
                weight="semibold"
                color={on ? colors.white : colors.ink}
                style={{ fontFamily: fontFamily(lng, 'semibold') }}
              >
                {LANGUAGE_NAMES[lng]}
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
