import { Stack } from 'expo-router';
import { AppProviders } from '../src/providers/AppProviders';
import { AppInitializer } from '../src/providers/AppInitializer';
import { AuthGuard } from '../src/components/AuthGuard';
import '../src/theme/themeContext';
import { useI18n } from '../src/i18n/I18nContext';
import { useCustomFonts } from '../src/hooks/useCustomFonts';
import { View, ActivityIndicator } from 'react-native';

function RootStack() {
  const { t } = useI18n();

  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="details/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="manual-entry" options={{ presentation: 'modal', title: t('manualEntry.title') }} />
        <Stack.Screen name="scan-lot" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="notification-permissions" options={{ headerShown: false }} />
        <Stack.Screen name="welcome-daily" options={{ headerShown: false }} />
        <Stack.Screen name="legal/privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
        <Stack.Screen name="legal/legal-notice" options={{ headerShown: false }} />
        <Stack.Screen name="legal/disclaimer" options={{ headerShown: false }} />
        <Stack.Screen name="legal/data-sources" options={{ headerShown: false }} />
        <Stack.Screen name="subscription" options={{ headerShown: false }} />
        <Stack.Screen name="team" options={{ headerShown: true, title: t('team.title') }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthGuard>
  );
}

export default function RootLayout() {
  const fontsLoaded = useCustomFonts();

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#C4DECC' }}>
        <ActivityIndicator size="large" color="#0BAE86" />
      </View>
    );
  }

  return (
    <AppProviders>
      <AppInitializer />
      <RootStack />
    </AppProviders>
  );
}
