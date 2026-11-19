export const LANGUAGES = ['en', 'hi', 'mr'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Each language's name in its own script, as on the prototype's chips. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
