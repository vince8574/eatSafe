import { useCallback, useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';

import { usePreferencesStore } from '../stores/usePreferencesStore';
import { getCurrentLanguage } from '../i18n/i18n';
import { getSpeechLocale } from '../i18n/voiceLocales';

type SpeakOptions = {
  priority?: boolean;
  dedupeMs?: number;
};

type DedupeRecord = {
  text: string;
  at: number;
};

const DEFAULT_DEDUPE_MS = 4000;

export function useVoiceGuide() {
  const accessibilityMode = usePreferencesStore((s) => s.accessibilityMode);
  const lastSpeechRef = useRef<DedupeRecord | null>(null);
  const enabledRef = useRef(accessibilityMode);

  enabledRef.current = accessibilityMode;

  useEffect(() => {
    return () => {
      Speech.stop().catch(() => {});
    };
  }, []);

  const stop = useCallback(async () => {
    try {
      await Speech.stop();
    } catch {
      // Speech.stop can throw if nothing is speaking; ignore.
    }
  }, []);

  const speak = useCallback(async (text: string, options: SpeakOptions = {}) => {
    if (!enabledRef.current) return;
    if (!text) return;

    const dedupeMs = options.dedupeMs ?? DEFAULT_DEDUPE_MS;
    const now = Date.now();
    const last = lastSpeechRef.current;
    if (last && last.text === text && now - last.at < dedupeMs) {
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

    const language = getSpeechLocale(getCurrentLanguage());
    Speech.speak(text, { language });
  }, []);

  return { speak, stop, enabled: accessibilityMode };
}
