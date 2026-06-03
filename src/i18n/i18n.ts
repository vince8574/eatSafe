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
import sq from './locales/sq.json';
import sr from './locales/sr.json';
import me from './locales/me.json';

const LANGUAGE_STORAGE_KEY = '@eatsafe_language';

export type SupportedLanguage = 'fr' | 'en' | 'de' | 'es' | 'it' | 'ar' | 'zh' | 'ja' | 'nl' | 'pt' | 'ru' | 'sq' | 'sr' | 'me';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['fr', 'en', 'de', 'es', 'it', 'ar', 'zh', 'ja', 'nl', 'pt', 'ru', 'sq', 'sr', 'me'];

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  fr: '🇫🇷',
  en: '🇺🇸',  // Drapeau américain pour l'anglais (app destinée au marché US)
  de: '🇩🇪',
  es: '🇪🇸',
  it: '🇮🇹',
  ar: '🇸🇦',
  zh: '🇨🇳',
  ja: '🇯🇵',
  nl: '🇳🇱',
  pt: '🇵🇹',
  ru: '🇷🇺',
  sq: '🇦🇱',
  sr: '🇷🇸',
  me: '🇲🇪'
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
  ru,
  sq,
  sr,
  me
});

i18n.enableFallback = true;
i18n.defaultLocale = 'en';  // Langue par défaut: anglais (marché US)

export async function initializeI18n(): Promise<string> {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage as SupportedLanguage)) {
      i18n.locale = savedLanguage;
      console.log(`✓ Language restored from storage: ${savedLanguage}`);
      return savedLanguage;
    }

    // Premier lancement : suivre la langue du téléphone si elle est supportée,
    // sinon retomber sur l'anglais (marché US). On persiste le choix pour que
    // l'utilisateur puisse ensuite le changer manuellement sans être réécrasé.
    const deviceLanguage = Localization.getLocales()[0]?.languageCode?.toLowerCase();
    const initialLanguage: SupportedLanguage =
      deviceLanguage && SUPPORTED_LANGUAGES.includes(deviceLanguage as SupportedLanguage)
        ? (deviceLanguage as SupportedLanguage)
        : 'en';

    i18n.locale = initialLanguage;
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, initialLanguage);
    console.log(`✓ Language set from device: ${initialLanguage} (device=${deviceLanguage ?? 'unknown'})`);
    return initialLanguage;
  } catch (error) {
    console.warn('Failed to initialize i18n, using default (en)', error);
    i18n.locale = 'en';
    return 'en';
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
