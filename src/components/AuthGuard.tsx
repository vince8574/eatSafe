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
    const inOnboardingFlow =
      segments[0] === 'onboarding' ||
      segments[0] === 'welcome' ||
      segments[0] === 'notification-permissions' ||
      segments[0] === 'welcome-daily' ||
      segments.length === 0; // Root redirect (index.tsx)

    if (!isAuthenticated && !inAuthGroup && !inOnboardingFlow) {
      // Redirect to login if not authenticated and not in auth screens or onboarding flow
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to main app if authenticated and in auth screens
      router.replace('/(tabs)');
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
