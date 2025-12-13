import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { usePreferencesStore } from '../src/stores/usePreferencesStore';

export default function RootRedirect() {
  const { firstName, hasSeenWelcome } = usePreferencesStore();
  const [hydrated, setHydrated] = useState(usePreferencesStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = usePreferencesStore.persist.onFinishHydration(() => setHydrated(true));
    return () => unsub?.();
  }, []);

  if (!hydrated) return null;

  if (!firstName.trim()) {
    return <Redirect href="/onboarding" />;
  }

  if (!hasSeenWelcome) {
    return <Redirect href="/welcome" />;
  }

  // Toujours rediriger vers la page de bienvenue quotidienne au démarrage
  return <Redirect href="/welcome-daily" />;
}
