import {
  NotoSans_400Regular,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
} from '@expo-google-fonts/noto-sans';
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
} from '@expo-google-fonts/noto-sans-devanagari';

import type { Language } from '@/localization/languages';

/** Passed to `useFonts` once at app start. */
export const fontFiles = {
  NotoSans_400Regular,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
};

export type FontWeight = 'regular' | 'semibold' | 'bold';

const suffix: Record<FontWeight, string> = {
  regular: '400Regular',
  semibold: '600SemiBold',
  bold: '700Bold',
};

/**
 * Hindi and Marathi screens use Noto Sans Devanagari (it also has Latin
 * letters and digits, so mixed text like "₹ 1,200" or "UPI" renders in one
 * font). English uses Noto Sans.
 */
export function fontFamily(language: Language, weight: FontWeight = 'regular'): string {
  const family = language === 'en' ? 'NotoSans' : 'NotoSansDevanagari';
  return `${family}_${suffix[weight]}`;
}
