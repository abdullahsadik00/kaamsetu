import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { colors } from '@/theme/tokens';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = { name: IconName; size?: number; color?: string };

/**
 * App icons (Material Design, as in the Stitch screens). Decorative: the
 * text next to it carries the meaning, so screen readers skip it.
 * Common names: phone-outline, whatsapp, navigation-variant-outline,
 * account-outline, briefcase-outline, history, home-outline, tools,
 * account-group-outline, receipt-text-outline, menu, plus, chevron-right,
 * check, alert-outline, cellphone, arrow-up, check-all, wifi-off, fan,
 * calendar-blank-outline, sync, magnify, qrcode-scan, arrow-left.
 */
export function Icon({ name, size = 22, color = colors.ink }: Props) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
