import { useCallback, useEffect, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from 'expo-speech-recognition';

import { isSpeaking, onSpeakingChange } from './voiceBus';

import { getCurrentLanguage } from '../i18n/i18n';
import {
  getVoiceLocale,
  matchVoiceCommand,
  type VoiceCommand
} from '../i18n/voiceLocales';

type Handlers = {
  onCommand: (command: VoiceCommand, transcript: string) => void;
  onError?: (code: string, message?: string) => void;
};

const RESTART_DELAY_MS = 600;

export function useVoiceCommands(enabled: boolean, handlers: Handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const stoppingRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef<string>('');

  const startRecognition = useCallback(async () => {
    if (!enabledRef.current) return;
    // Ne pas (ré)ouvrir le micro pendant que la voix parle : sinon la session
    // audio est reconfigurée et la voix se tronque. On reprendra quand la voix
    // se taira (voir l'abonnement onSpeakingChange plus bas).
    if (isSpeaking()) return;
    try {
      const granted = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted.granted) {
        handlersRef.current.onError?.('permission-denied');
        return;
      }
      const cfg = getVoiceLocale(getCurrentLanguage());
      stoppingRef.current = false;
      // NB : on ne force PAS d'iosCategory. Le faire reconfigurait la session
      // audio à chaque (re)démarrage de la reconnaissance — y compris juste
      // après un scan — ce qui tronquait le guidage vocal en cours. La qualité
      // de la voix vient de la sélection d'une voix non-compacte (useVoiceGuide).
      ExpoSpeechRecognitionModule.start({
        lang: cfg.speechLocale,
        interimResults: true,
        continuous: true,
        contextualStrings: cfg.contextualStrings,
        addsPunctuation: false,
        requiresOnDeviceRecognition: false
      });
    } catch (err: any) {
      handlersRef.current.onError?.('start-failed', err?.message);
    }
  }, []);

  const stopRecognition = useCallback(async () => {
    stoppingRef.current = true;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore
    }
  }, []);

  const scheduleRestart = useCallback(() => {
    if (!enabledRef.current || stoppingRef.current) return;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      if (enabledRef.current && !stoppingRef.current) {
        startRecognition();
      }
    }, RESTART_DELAY_MS);
  }, [startRecognition]);

  useSpeechRecognitionEvent('result', (event) => {
    const first = event?.results?.[0];
    const transcript: string = first?.transcript ?? '';
    if (!transcript || transcript === lastTranscriptRef.current) return;
    lastTranscriptRef.current = transcript;
    const command = matchVoiceCommand(transcript, getCurrentLanguage());
    if (command) {
      handlersRef.current.onCommand(command, transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    lastTranscriptRef.current = '';
    scheduleRestart();
  });

  useSpeechRecognitionEvent('error', (event) => {
    handlersRef.current.onError?.(event?.error ?? 'unknown', event?.message);
    scheduleRestart();
  });

  useEffect(() => {
    if (enabled) {
      startRecognition();
    } else {
      stopRecognition();
    }
    return () => {
      stopRecognition();
    };
  }, [enabled, startRecognition, stopRecognition]);

  // Met le micro en pause pendant que la voix parle, le relance (avec débounce
  // via scheduleRestart) quand elle se tait → plus de troncature du guidage.
  useEffect(() => {
    const unsubscribe = onSpeakingChange((speaking) => {
      if (!enabledRef.current) return;
      if (speaking) {
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch {
          /* noop */
        }
      } else {
        scheduleRestart();
      }
    });
    return unsubscribe;
  }, [scheduleRestart]);
}
