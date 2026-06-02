import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { usePreferencesStore } from '../src/stores/usePreferencesStore';
import { useAuth } from '../src/contexts/AuthContext';

export default function RootRedirect() {
  const { firstName, hasSeenWelcome, hasSeenNotificationPrompt } = usePreferencesStore();
  const { isAuthenticated, loading } = useAuth();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const wasHydrated = usePreferencesStore.persist.hasHydrated();

    if (wasHydrated) {
      setHydrated(true);
    } else {
      const unsub = usePreferencesStore.persist.onFinishHydration(() => setHydrated(true));
      return () => unsub?.();
    }
  }, []);

  // Attendre que les données soient chargées
  if (!hydrated || loading) {
    return null;
  }

  // Auth obligatoire : pas de session => écran de connexion.
  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  // Déterminer la destination (l'animation sera affichée dans WelcomeScreen)
  let path = '/welcome-daily';

  if (!firstName.trim()) {
    path = '/onboarding';
  } else if (!hasSeenWelcome) {
    path = '/welcome';
  } else if (!hasSeenNotificationPrompt) {
    path = '/notification-permissions';
  }

  return <Redirect href={path as any} />;
}
