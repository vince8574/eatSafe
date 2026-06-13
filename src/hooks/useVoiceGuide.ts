import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';

import { usePreferencesStore } from '../stores/usePreferencesStore';
import { getCurrentLanguage } from '../i18n/i18n';
import { getSpeechLocale } from '../i18n/voiceLocales';
import { setSpeaking } from './voiceBus';

type SpeakOptions = {
  priority?: boolean;
  dedupeMs?: number;
};

const DEFAULT_DEDUPE_MS = 4000;

// Cache module-level partagé : la liste des voix ne change pas pendant la vie
// de l'app. On la récupère une fois et on choisit la meilleure voix par locale.
// Sans sélection explicite, le moteur TTS retombe souvent sur une voix
// "compacte" de basse qualité → rendu robotique/haché ("liaison téléphonique").
let cachedVoices: Speech.Voice[] | null = null;
let cachedVoicesPromise: Promise<Speech.Voice[]> | null = null;
const voiceIdByLocale = new Map<string, string | null>();
let hasWarmedUp = false;

function getVoicesAsync(): Promise<Speech.Voice[]> {
  if (cachedVoices) return Promise.resolve(cachedVoices);
  if (cachedVoicesPromise) return cachedVoicesPromise;
  cachedVoicesPromise = Speech.getAvailableVoicesAsync()
    .then((list) => {
      cachedVoices = list || [];
      console.log(`[VoiceGuide] ${cachedVoices.length} voices cached`);
      return cachedVoices;
    })
    .catch((error) => {
      console.warn('[VoiceGuide] Failed to fetch available voices', error);
      cachedVoices = [];
      return cachedVoices;
    });
  return cachedVoicesPromise;
}

// Meilleure voix installée pour une locale BCP-47 : match exact (en-US), puis
// même langue (en-*), puis préfixe seul. null → la voix système par défaut.
function pickBestVoice(voices: Speech.Voice[], speechLocale: string): string | null {
  if (voiceIdByLocale.has(speechLocale)) {
    return voiceIdByLocale.get(speechLocale) ?? null;
  }
  if (!voices || voices.length === 0) {
    voiceIdByLocale.set(speechLocale, null);
    return null;
  }
  const targetLang = speechLocale.toLowerCase();
  const targetPrefix = targetLang.split('-')[0];

  const exact = voices.find((v) => v.language?.toLowerCase() === targetLang);
  const sameLang =
    exact ?? voices.find((v) => v.language?.toLowerCase().startsWith(`${targetPrefix}-`));
  const best = sameLang ?? voices.find((v) => v.language?.toLowerCase() === targetPrefix) ?? null;

  const id = best ? best.identifier : null;
  voiceIdByLocale.set(speechLocale, id);
  return id;
}

// Pré-chauffe le moteur TTS (un point quasi-inaudible) pour éviter la troncature
// "cold-start" du tout premier message.
function warmUpVoiceEngine(speechLocale?: string) {
  if (hasWarmedUp) return;
  hasWarmedUp = true;
  try {
    Speech.speak('.', { language: speechLocale, rate: 1.5, pitch: 1.0, volume: 0.01 } as any);
  } catch {
    /* noop */
  }
}

// iOS : après une mise en veille / passage en arrière-plan, le moteur TTS
// (AVSpeechSynthesizer) peut rester bloqué "en train de parler" → tous les speak
// suivants sont ignorés et la voix ne parle plus au retour. On installe (une seule
// fois) un listener AppState qui stoppe le moteur À L'ENTRÉE en arrière-plan et
// autorise un nouveau warm-up au retour au premier plan.
// IMPORTANT : on ne stoppe PAS sur 'active' — d'autres écouteurs AppState (ex.
// ScanLotScreen) appellent speak() dans le même tick et un Speech.stop() ici les
// réduirait au silence. Le cas "synthétiseur bloqué" est déjà géré par
// speak({ priority: true }) qui appelle Speech.stop() avant chaque annonce.
let appStateRecoverySet = false;
function setupAppStateRecovery(): void {
  if (appStateRecoverySet) return;
  appStateRecoverySet = true;
  AppState.addEventListener('change', (next) => {
    if (next === 'background') {
      try {
        Speech.stop();
      } catch {
        /* noop */
      }
    }
    if (next === 'active') {
      hasWarmedUp = false; // réautorise un warm-up du moteur
    }
  });
}

export function useVoiceGuide() {
  const accessibilityMode = usePreferencesStore((s) => s.accessibilityMode);
  const lastSpeechRef = useRef<{ text: string; at: number } | null>(null);
  const enabledRef = useRef(accessibilityMode);
  enabledRef.current = accessibilityMode;

  // Pré-charge les voix et pré-chauffe le moteur dès que le mode malvoyant est
  // actif → premier message net, pas de latence ni de troncature.
  useEffect(() => {
    setupAppStateRecovery();
    void getVoicesAsync();
    if (accessibilityMode) {
      warmUpVoiceEngine(getSpeechLocale(getCurrentLanguage()));

      // iOS standby : au retour en avant-plan, si aucun écran n'a déjà ré-annoncé
      // (auquel cas hasWarmedUp est repassé à true par le speak), on déclenche un
      // warm-up différé de 300 ms pour réveiller le moteur sur les écrans vocaux
      // SANS ré-annonce propre.
      const sub = AppState.addEventListener('change', (next) => {
        if (next === 'active') {
          setTimeout(() => warmUpVoiceEngine(getSpeechLocale(getCurrentLanguage())), 300);
        }
      });
      return () => {
        Speech.stop().catch(() => {});
        sub.remove();
      };
    }
    return () => {
      Speech.stop().catch(() => {});
    };
  }, [accessibilityMode]);

  const stop = useCallback(async () => {
    try {
      await Speech.stop();
    } catch {
      // Speech.stop peut throw si rien ne parle ; on ignore.
    }
    setSpeaking(false);
    lastSpeechRef.current = null;
  }, []);

  const speak = useCallback(async (text: string, options: SpeakOptions = {}) => {
    if (!enabledRef.current) return;
    if (!text) return;

    const dedupeMs = options.dedupeMs ?? DEFAULT_DEDUPE_MS;
    const now = Date.now();
    const last = lastSpeechRef.current;
    if (!options.priority && last && last.text === text && now - last.at < dedupeMs) {
      return;
    }
    lastSpeechRef.current = { text, at: now };

    if (options.priority) {
      try {
        await Speech.stop();
      } catch {
        // ignore
      }
    }

    const speechLocale = getSpeechLocale(getCurrentLanguage());
    const voiceId = pickBestVoice(cachedVoices ?? [], speechLocale);
    hasWarmedUp = true; // tout speak réel sert aussi de warm-up

    // On signale "en train de parler" pour que le micro (reconnaissance) se mette
    // en pause le temps de l'annonce → la voix n'est plus tronquée.
    setSpeaking(true);
    Speech.speak(text, {
      language: speechLocale,
      ...(voiceId ? { voice: voiceId } : {}),
      pitch: 1.0,
      rate: 1.0,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false)
    });
  }, []);

  return { speak, stop, enabled: accessibilityMode };
}
