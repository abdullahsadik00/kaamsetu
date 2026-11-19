import { Text, type TextProps } from 'react-native';

import { useLanguage } from '@/localization/i18n';
import { fontFamily, type FontWeight } from '@/theme/fonts';
import { colors, fontSize } from '@/theme/tokens';

type Variant = 'title' | 'section' | 'body' | 'support' | 'small';

const lineHeight: Record<Variant, number> = {
  title: 32,
  section: 26,
  body: 25,
  support: 22,
  small: 18,
};

export type AppTextProps = TextProps & {
  variant?: Variant;
  weight?: FontWeight;
  color?: string;
};

/** All app text goes through this, so the font follows the UI language. */
export function AppText({
  variant = 'body',
  weight = variant === 'title' ? 'bold' : variant === 'section' ? 'semibold' : 'regular',
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
        style,
      ]}
    />
  );
}
