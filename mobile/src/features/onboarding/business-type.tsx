import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import type { BusinessType } from '@/features/employees/api';
import { colors, radius, space } from '@/theme/tokens';

export const BUSINESS_TYPES: readonly BusinessType[] = ['SOLO', 'CREW', 'VENDOR'];

/**
 * "How do you work?" (D-044): alone, two people, or several teams. Decides
 * which screens the owner gets; used at sign-up and in Business details.
 */
export function BusinessTypeChoice({
  value,
  onChange,
  error,
}: {
  value: BusinessType | null;
  onChange: (v: BusinessType) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('onboarding.howWork')} style={styles.group}>
      <AppText weight="semibold">{t('onboarding.howWork')}</AppText>
      <AppText variant="support" color={colors.slate}>
        {t('onboarding.howWorkHint')}
      </AppText>
      {BUSINESS_TYPES.map((type) => {
        const on = value === type;
        return (
          <Pressable
            key={type}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={t(`onboarding.types.${type}`)}
            onPress={() => onChange(type)}
            style={[styles.option, on && styles.optionOn]}
          >
            <Icon name={on ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={on ? colors.teal : colors.line2} />
            <View style={styles.flex}>
              <AppText weight="semibold">{t(`onboarding.types.${type}`)}</AppText>
              <AppText variant="support" color={colors.slate}>
                {t(`onboarding.typeHints.${type}`)}
              </AppText>
            </View>
          </Pressable>
        );
      })}
      {error ? (
        <AppText variant="support" color={colors.bad}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  flex: { flex: 1 },
  option: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  optionOn: { borderColor: colors.teal, backgroundColor: colors.soft },
});
