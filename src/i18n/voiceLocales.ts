import type { SupportedLanguage } from './i18n';

export type VoiceCommand = 'photo' | 'flash_on' | 'flash_off';

export type VoiceLocaleConfig = {
  speechLocale: string;
  patterns: {
    photo: RegExp;
    flashWord: RegExp;
    flashOff: RegExp;
  };
  contextualStrings: string[];
};

const enUS: VoiceLocaleConfig = {
  speechLocale: 'en-US',
  patterns: {
    photo: /\b(photo|take\s+(?:a\s+)?(?:photo|picture)|capture|shot|click|snap|picture)\b/i,
    flashWord: /\b(flash|torch|light|lamp)\b/i,
    flashOff: /\b(off|no|stop|disable|turn\s+off|kill|cancel|without|remove)\b/i
  },
  contextualStrings: [
    'photo',
    'take a photo',
    'capture',
    'flash',
    'flash off',
    'no flash',
    'turn off flash',
    'torch'
  ]
};

const frFR: VoiceLocaleConfig = {
  speechLocale: 'fr-FR',
  patterns: {
    photo: /\b(photo|prends?\s+(?:une\s+)?(?:photo|image)|capture|capturer|cliquer|clic|prise)\b/i,
    flashWord: /\b(flash|torche|lumi[èe]re|lampe)\b/i,
    flashOff: /\b(off|non|stop|stopper|d[ée]sactive[rz]?|arr[êe]te[rz]?|annule[rz]?|sans|enl[èe]ve[rz]?|coupe[rz]?|[ée]teins|[ée]teindre)\b/i
  },
  contextualStrings: [
    'photo',
    'prendre une photo',
    'capture',
    'flash',
    'flash off',
    'pas de flash',
    'éteindre le flash',
    'torche'
  ]
};

const FALLBACK_LOCALE: SupportedLanguage = 'en';

const VOICE_LOCALES: Partial<Record<SupportedLanguage, VoiceLocaleConfig>> = {
  en: enUS,
  fr: frFR
};

export function getVoiceLocale(language: SupportedLanguage | string): VoiceLocaleConfig {
  const lang = (language || FALLBACK_LOCALE) as SupportedLanguage;
  return VOICE_LOCALES[lang] ?? VOICE_LOCALES[FALLBACK_LOCALE]!;
}

export function getSpeechLocale(language: SupportedLanguage | string): string {
  return getVoiceLocale(language).speechLocale;
}

export function matchVoiceCommand(transcript: string, language: SupportedLanguage | string): VoiceCommand | null {
  if (!transcript) return null;
  const cfg = getVoiceLocale(language);
  const text = transcript.toLowerCase();
  const hasFlashWord = cfg.patterns.flashWord.test(text);
  const hasOffWord = cfg.patterns.flashOff.test(text);
  if (hasFlashWord && hasOffWord) return 'flash_off';
  if (hasFlashWord) return 'flash_on';
  if (cfg.patterns.photo.test(text)) return 'photo';
  return null;
}
