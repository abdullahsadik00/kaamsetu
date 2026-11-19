/**
 * Design tokens from docs/02 §6 (taken from the clickable prototype).
 * Light theme only, by design: outdoor readability comes first.
 */
export const colors = {
  teal: '#0F766E',
  tealDark: '#115E59',
  tealTint: '#E6F2EF',
  saffron: '#E8891C',
  paper: '#F7F5F0',
  surface: '#FFFFFF',
  ink: '#14213D',
  slate: '#4A5468',
  muted: '#5B6576',
  line: '#E4E0D6',
  line2: '#CFCABE',
  soft: '#EFECE4',
  ok: '#15803D',
  okTint: '#E3F3E8',
  warn: '#B45309',
  warnTint: '#FDEBD3',
  bad: '#B42318',
  badTint: '#FBE4E4',
  info: '#1E4FBF',
  assigned: '#5B32B4',
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

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
} as const;

/** Sizes in sp (docs/02 §6 Typography). */
export const fontSize = {
  title: 24,
  section: 19,
  body: 17,
  support: 15,
  small: 13,
} as const;

/** Minimum touch target and the larger technician action height (docs/02 §6). */
export const touch = {
  min: 48,
  action: 56,
} as const;
