import { PropsWithChildren } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

export function AuthGuard({ children }: PropsWithChildren) {
  const { user, loading, isAuthenticated } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      // Auth obligatoire : tout écran hors du groupe "auth" exige une session.
      // L'onboarding/welcome ne sont accessibles qu'une fois connecté.
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Connecté mais sur un écran d'auth : renvoyer vers la racine qui décide
      // de la suite (onboarding pour un nouveau compte, sinon l'app).
      router.replace('/');
    }
  }, [user, loading, segments, isAuthenticated]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#C4DECC' }}>
        <ActivityIndicator size="large" color="#0BAE86" />
      </View>
    );
  }

  return <>{children}</>;
}
