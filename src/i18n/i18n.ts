import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import it from './locales/it.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import nl from './locales/nl.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';

const LANGUAGE_STORAGE_KEY = '@eatsafe_language';

export type SupportedLanguage = 'fr' | 'en' | 'de' | 'es' | 'it' | 'ar' | 'zh' | 'ja' | 'nl' | 'pt' | 'ru';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['fr', 'en', 'de', 'es', 'it', 'ar', 'zh', 'ja', 'nl', 'pt', 'ru'];

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  de: '🇩🇪',
  es: '🇪🇸',
  it: '🇮🇹',
  ar: '🇸🇦',
  zh: '🇨🇳',
  ja: '🇯🇵',
  nl: '🇳🇱',
  pt: '🇵🇹',
  ru: '🇷🇺'
};

const i18n = new I18n({
  fr,
  en,
  de,
  es,
  it,
  ar,
  zh,
  ja,
  nl,
  pt,
  ru
});

i18n.enableFallback = true;
i18n.defaultLocale = 'fr';

export async function initializeI18n(): Promise<string> {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage as SupportedLanguage)) {
      i18n.locale = savedLanguage;
      console.log(`✓ Language restored from storage: ${savedLanguage}`);
      return savedLanguage;
    }

    const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'fr';
    const matchedLanguage = SUPPORTED_LANGUAGES.includes(deviceLanguage as SupportedLanguage)
      ? deviceLanguage
      : 'fr';

    i18n.locale = matchedLanguage;
    console.log(`✓ Language detected from device: ${matchedLanguage}`);
    return matchedLanguage;
  } catch (error) {
    console.warn('Failed to initialize i18n, using default (fr)', error);
    i18n.locale = 'fr';
    return 'fr';
  }
}

export async function changeLanguage(language: SupportedLanguage): Promise<void> {
  try {
    i18n.locale = language;
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    console.log(`✓ Language changed to: ${language}`);
  } catch (error) {
    console.warn('Failed to save language preference', error);
  }
}

export function getCurrentLanguage(): string {
  return i18n.locale;
}

export function t(key: string, options?: Record<string, any>): string {
  return i18n.t(key, options);
}

export default i18n;
