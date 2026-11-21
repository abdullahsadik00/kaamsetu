import { Text, type TextProps } from 'react-native';

import { useLanguage } from '@/localization/i18n';
import { fontFamily, type FontWeight } from '@/theme/fonts';
import { colors, fontSize } from '@/theme/tokens';

/** `label` = small uppercase section stamp ("ADDRESS", "ACS · 2"). */
type Variant = 'title' | 'section' | 'body' | 'support' | 'small' | 'label';

const lineHeight: Record<Variant, number> = {
  title: 34,
  section: 24,
  body: 24,
  support: 20,
  small: 16,
  label: 14,
};

export type AppTextProps = TextProps & {
  variant?: Variant;
  weight?: FontWeight;
  color?: string;
};

/** All app text goes through this, so the font follows the UI language. */
export function AppText({
  variant = 'body',
  weight = variant === 'title' ? 'bold' : variant === 'section' || variant === 'label' ? 'semibold' : 'regular',
  color = colors.ink,
  style,
  ...rest
}: AppTextProps) {
  const language = useLanguage();
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: fontFamily(language, weight),
          fontSize: fontSize[variant],
          lineHeight: lineHeight[variant],
          color,
        },
        variant === 'label' && language === 'en' ? { textTransform: 'uppercase', letterSpacing: 0.6 } : null,
        style,
      ]}
    />
  );
}
