import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { isLanguage, type Language } from './languages';
import { en } from './resources/en';
import { hi } from './resources/hi';
import { mr } from './resources/mr';

const LANGUAGE_KEY = 'ks.language';

/** Saved choice first, then the phone's language if we support it, else English. */
async function initialLanguage(): Promise<Language> {
  try {
    const saved = await SecureStore.getItemAsync(LANGUAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // Keystore unavailable: fall through to the device language.
  }
  const device = getLocales()[0]?.languageCode;
  return isLanguage(device) ? device : 'en';
}

const i18n = createInstance();

let ready: Promise<void> | null = null;

/** Initialises i18next once. Safe to call more than once. */
export function initI18n(): Promise<void> {
  ready ??= initialLanguage().then(async (lng) => {
    await i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, hi: { translation: hi }, mr: { translation: mr } },
      lng,
      fallbackLng: 'en',
      interpolation: { escapeValue: false }, // React already escapes.
      returnNull: false,
      // Resources are bundled, so there is nothing to wait for; never suspend.
      react: { useSuspense: false },
    });
  });
  return ready;
}

export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  await SecureStore.setItemAsync(LANGUAGE_KEY, language);
}

/** The current UI language, re-rendering when it changes. */
export function useLanguage(): Language {
  const { i18n: instance } = useTranslation();
  return isLanguage(instance.language) ? instance.language : 'en';
}

export { i18n };
