import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { setLanguage, useLanguage } from '@/localization/i18n';
import { fontFamily } from '@/theme/fonts';
import { LANGUAGE_NAMES, LANGUAGES, type Language } from '@/localization/languages';
import { colors, radius, space, touch } from '@/theme/tokens';

import { AppText } from './app-text';
import { Icon } from './icon';

/** English / हिंदी / मराठी chips (screen 53). Applies at once. */
export function LanguagePicker() {
  const { t } = useTranslation();
  const current = useLanguage();
  return (
    <View style={styles.wrap}>
      <AppText variant="support" weight="semibold" color={colors.slate}>
        {t('language.label')}
      </AppText>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('language.label')}>
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
              <AppText weight="semibold" color={on ? colors.white : colors.ink} style={{ fontFamily: fontFamily(lng, 'semibold') }}>
                {LANGUAGE_NAMES[lng]}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** English name under each language's own name (screen 71). */
const ENGLISH_NAMES: Record<Language, string> = { en: 'English', hi: 'Hindi', mr: 'Marathi' };

/** Full-width language list with a tick (screen 71); `onPicked` runs after the switch. */
export function LanguageList({ onPicked }: { onPicked?: () => void }) {
  const { t } = useTranslation();
  const current = useLanguage();
  return (
    <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={t('language.label')}>
      {LANGUAGES.map((lng, i) => {
        const on = lng === current;
        return (
          <Pressable
            key={lng}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => {
              void setLanguage(lng);
              onPicked?.();
            }}
            style={({ pressed }) => [styles.listRow, i < LANGUAGES.length - 1 && styles.divider, pressed && styles.pressed]}
          >
            <View style={styles.flex}>
              <AppText variant="section" style={{ fontFamily: fontFamily(lng, 'semibold') }}>
                {LANGUAGE_NAMES[lng]}
              </AppText>
              <AppText variant="support" color={colors.slate}>
                {ENGLISH_NAMES[lng]}
              </AppText>
            </View>
            {on ? <Icon name="check" color={colors.teal} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: touch.min,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.soft,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.tealDeep },
  flex: { flex: 1 },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  listRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.rowLine },
  pressed: { backgroundColor: colors.tealTint },
});
