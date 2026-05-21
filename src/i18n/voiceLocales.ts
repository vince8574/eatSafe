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

const deDE: VoiceLocaleConfig = {
  speechLocale: 'de-DE',
  patterns: {
    photo: /\b(foto|bild|mach\s+(?:ein\s+)?(?:foto|bild|aufnahme)|aufnehmen|knipsen|fotografieren|aufnahme)\b/i,
    flashWord: /\b(blitz|taschenlampe|licht|lampe)\b/i,
    flashOff: /\b(aus|nein|stop|stopp|deaktivieren|ausschalten|abbrechen|ohne|entfernen|l[öo]schen)\b/i
  },
  contextualStrings: [
    'Foto',
    'Foto machen',
    'aufnehmen',
    'Blitz',
    'Blitz aus',
    'kein Blitz',
    'Blitz ausschalten',
    'Taschenlampe'
  ]
};

const esES: VoiceLocaleConfig = {
  speechLocale: 'es-ES',
  patterns: {
    photo: /\b(foto|fotograf[íi]a|tomar?\s+(?:una\s+)?(?:foto|fotograf[íi]a|imagen)|captura|capturar|clic|imagen)\b/i,
    flashWord: /\b(flash|linterna|luz|l[áa]mpara)\b/i,
    flashOff: /\b(apagar?|sin|no|stop|parar?|desactivar?|quitar?|cancelar?|off|apaga)\b/i
  },
  contextualStrings: [
    'foto',
    'tomar una foto',
    'captura',
    'flash',
    'flash apagado',
    'sin flash',
    'apagar flash',
    'linterna'
  ]
};

const itIT: VoiceLocaleConfig = {
  speechLocale: 'it-IT',
  patterns: {
    photo: /\b(foto|fotografia|scatta\s+(?:una\s+)?(?:foto|fotografia|immagine)|cattura|clic|immagine)\b/i,
    flashWord: /\b(flash|torcia|luce|lampada)\b/i,
    flashOff: /\b(spegni|off|no|stop|disattiva|annulla|senza|rimuovi|togli|spegnere)\b/i
  },
  contextualStrings: [
    'foto',
    'scatta una foto',
    'cattura',
    'flash',
    'flash off',
    'senza flash',
    'spegnere il flash',
    'torcia'
  ]
};

const arSA: VoiceLocaleConfig = {
  speechLocale: 'ar-SA',
  patterns: {
    photo: /صور[ةه]|التقط|صوّر|فوتو|اتخذ\s+(?:صور[ةه]|لقطة)|لقطة/,
    flashWord: /فلاش|مصباح|ضوء|إضاءة/,
    flashOff: /أوقف|إيقاف|بدون|لا|بلا|إلغاء|أطفئ|إطفاء/
  },
  contextualStrings: [
    'صورة',
    'التقط صورة',
    'فوتو',
    'فلاش',
    'أوقف الفلاش',
    'بدون فلاش',
    'مصباح'
  ]
};

const zhCN: VoiceLocaleConfig = {
  speechLocale: 'zh-CN',
  patterns: {
    photo: /照片|拍照|拍摄|拍一张|截图|拍个照/,
    flashWord: /闪光|手电筒|灯|闪|闪光灯/,
    flashOff: /关闭|关掉|不要|停止|关|没有|取消|熄灭/
  },
  contextualStrings: [
    '照片',
    '拍照',
    '拍摄',
    '闪光',
    '关闭闪光',
    '不要闪光',
    '手电筒'
  ]
};

const jaJP: VoiceLocaleConfig = {
  speechLocale: 'ja-JP',
  patterns: {
    photo: /写真|撮影|撮って|キャプチャ|写真を撮|シャッター/,
    flashWord: /フラッシュ|懐中電灯|ライト|ランプ|照明/,
    flashOff: /消して|オフ|なし|停止|止めて|無効|切って|オフにして/
  },
  contextualStrings: [
    '写真',
    '写真を撮',
    'キャプチャ',
    'フラッシュ',
    'フラッシュオフ',
    'フラッシュなし',
    'フラッシュを消して',
    '懐中電灯'
  ]
};

const nlNL: VoiceLocaleConfig = {
  speechLocale: 'nl-NL',
  patterns: {
    photo: /\b(foto|afbeelding|neem\s+(?:een\s+)?(?:foto|afbeelding|plaatje)|vastleggen|klik|snap|plaatje)\b/i,
    flashWord: /\b(flits|zaklamp|licht|lamp)\b/i,
    flashOff: /\b(uit|nee|stop|uitschakelen|annuleren|zonder|verwijderen|uitzetten)\b/i
  },
  contextualStrings: [
    'foto',
    'neem een foto',
    'vastleggen',
    'flits',
    'flits uit',
    'geen flits',
    'flits uitschakelen',
    'zaklamp'
  ]
};

const ptBR: VoiceLocaleConfig = {
  speechLocale: 'pt-BR',
  patterns: {
    photo: /\b(foto|fotografia|tirar?\s+(?:uma\s+)?(?:foto|fotografia|imagem)|captura|capturar|clic|imagem)\b/i,
    flashWord: /\b(flash|lanterna|luz|l[âa]mpada)\b/i,
    flashOff: /\b(desligar?|apagar?|off|n[ãa]o|stop|parar?|desativar?|cancelar?|sem|remover?)\b/i
  },
  contextualStrings: [
    'foto',
    'tirar uma foto',
    'captura',
    'flash',
    'flash desligado',
    'sem flash',
    'desligar flash',
    'lanterna'
  ]
};

const ruRU: VoiceLocaleConfig = {
  speechLocale: 'ru-RU',
  patterns: {
    photo: /фото|снимок|сделай\s+(?:фото|снимок|фотографию)|снять|снимай|захват|фотография/,
    flashWord: /вспышка|фонарик|свет|лампа|фонарь/,
    flashOff: /выключи|выключить|стоп|нет|без|отключи|убери|отмена|не\s+надо/
  },
  contextualStrings: [
    'фото',
    'сделать фото',
    'снимок',
    'вспышка',
    'вспышка выключена',
    'без вспышки',
    'выключить вспышку',
    'фонарик'
  ]
};

const sqAL: VoiceLocaleConfig = {
  speechLocale: 'sq-AL',
  patterns: {
    photo: /\b(foto|fotografi|merr\s+(?:nj[ëe]\s+)?(?:foto|fotografi|imazh)|kaptu|klik|imazh)\b/i,
    flashWord: /\b(flash|elektrik|drit[ëe]|llamp[ëe])\b/i,
    flashOff: /\b(fik|jo|ndal|[çc]aktivizo|anulo|pa|hiq|shuaj?)\b/i
  },
  contextualStrings: [
    'foto',
    'merr një foto',
    'kaptu',
    'flash',
    'flash fik',
    'pa flash',
    'fik flash',
    'elektrik'
  ]
};

const srRS: VoiceLocaleConfig = {
  speechLocale: 'sr-RS',
  patterns: {
    photo: /\b(foto|fotografija|slika|napravi\s+(?:fotografiju|sliku|foto)|snimi|klik)\b/i,
    flashWord: /\b(blesak|blic|baterijska\s+lampa|svetlo|lampa)\b/i,
    flashOff: /\b(ugasi|isklju[cč]i|ne|stop|bez|deaktiviraj|otka[zž]i)\b/i
  },
  contextualStrings: [
    'foto',
    'napravi fotografiju',
    'snimak',
    'blesak',
    'blesak isključen',
    'bez bleska',
    'ugasi blesak',
    'baterijska lampa'
  ]
};

// Montenegrin is mutually intelligible with Serbian; sr-ME is the closest available TTS locale
const meMe: VoiceLocaleConfig = {
  speechLocale: 'sr-ME',
  patterns: {
    photo: /\b(foto|fotografija|slika|napravi\s+(?:fotografiju|sliku|foto)|snimi|klik)\b/i,
    flashWord: /\b(blesak|blic|baterijska\s+lampa|svjetlost|lampa)\b/i,
    flashOff: /\b(ugasi|isklju[cč]i|ne|stop|bez|deaktiviraj|otka[zž]i)\b/i
  },
  contextualStrings: [
    'foto',
    'napravi fotografiju',
    'snimak',
    'blesak',
    'blesak isključen',
    'bez bleska',
    'ugasi blesak',
    'baterijska lampa'
  ]
};

const FALLBACK_LOCALE: SupportedLanguage = 'en';

const VOICE_LOCALES: Partial<Record<SupportedLanguage, VoiceLocaleConfig>> = {
  en: enUS,
  fr: frFR,
  de: deDE,
  es: esES,
  it: itIT,
  ar: arSA,
  zh: zhCN,
  ja: jaJP,
  nl: nlNL,
  pt: ptBR,
  ru: ruRU,
  sq: sqAL,
  sr: srRS,
  me: meMe
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
