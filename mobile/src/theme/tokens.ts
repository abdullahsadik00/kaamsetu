/**
 * Design tokens: "Field Utility & Trade" design system
 * (stitch_kaamsetu_mobile_ui_system/field_utility_trade/DESIGN.md).
 * Light theme only, by design: outdoor readability comes first.
 * Flat: no shadows; depth comes from borders and fills.
 */
export const colors = {
  // Brand
  teal: '#0F766E',
  tealDark: '#115E59',
  tealDeep: '#005C55',
  tealTint: '#E6F2EF',
  tealTintText: '#0B5F58',
  saffron: '#E8891C',

  // Surfaces
  paper: '#F7F5F0',
  surface: '#FFFFFF',
  soft: '#EFECE4',
  warmFill: '#FFF8EE',
  warmLine: '#F1D3A7',

  // Text
  ink: '#14213D',
  slate: '#4A5468',
  muted: '#5B6576',

  // Lines
  line: '#E4E0D6',
  line2: '#CFCABE',
  rowLine: '#EEEAE1',

  // Status pairs (text on tint), DESIGN.md "Status Semantic System"
  ok: '#166534',
  okTint: '#E3F3E8',
  warn: '#8A4A06',
  warnTint: '#FDEBD3',
  bad: '#A61B1B',
  badTint: '#FBE4E4',
  info: '#1E4FBF',
  infoTint: '#E3ECFD',
  assigned: '#5B32B4',
  assignedTint: '#EDE7FB',
  grey: '#3B4556',
  greyTint: '#ECEEF2',
  orange: '#9A3412',
  orangeTint: '#FFE1CC',

  /** Toasts and dark bars. */
  navy: '#14213D',
  white: '#FFFFFF',
} as const;

/** 4-point spacing scale. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Soft shapes: 4 tags, 8 buttons/inputs/cards, 12 sheets. */
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 12,
  full: 999,
} as const;

/** Sizes in sp (DESIGN.md typography, mobile). */
export const fontSize = {
  title: 26,
  section: 18,
  body: 16,
  support: 14,
  small: 12,
  label: 11,
} as const;

/** Minimum touch target, inputs, and the larger technician action height. */
export const touch = {
  min: 48,
  input: 52,
  action: 56,
} as const;

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'assigned' | 'grey' | 'orange' | 'teal';

/** Text and fill colour for each status tone. */
export const tones: Record<Tone, { text: string; fill: string }> = {
  ok: { text: colors.ok, fill: colors.okTint },
  warn: { text: colors.warn, fill: colors.warnTint },
  bad: { text: colors.bad, fill: colors.badTint },
  info: { text: colors.info, fill: colors.infoTint },
  assigned: { text: colors.assigned, fill: colors.assignedTint },
  grey: { text: colors.grey, fill: colors.greyTint },
  orange: { text: colors.orange, fill: colors.orangeTint },
  teal: { text: colors.tealTintText, fill: colors.tealTint },
};
