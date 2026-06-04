// Coordination micro ⇄ synthèse vocale.
//
// Sur iOS, la reconnaissance vocale (micro) et la synthèse (TTS) se disputent la
// session audio : quand le micro est actif pendant que la voix parle, la voix
// est tronquée/hachée. On expose un flag global "speaking" : useVoiceGuide le
// met à true pendant qu'il parle, et useVoiceCommands met le micro EN PAUSE tant
// que c'est true (puis le relance, avec un petit débounce, quand la voix se tait).

type Listener = (speaking: boolean) => void;

const listeners = new Set<Listener>();
let speaking = false;

export function setSpeaking(value: boolean): void {
  if (speaking === value) return;
  speaking = value;
  listeners.forEach((listener) => {
    try {
      listener(value);
    } catch {
      /* noop */
    }
  });
}

export function isSpeaking(): boolean {
  return speaking;
}

export function onSpeakingChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
