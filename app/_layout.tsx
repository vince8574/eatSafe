import { Stack } from 'expo-router';
import { AppProviders } from '../src/providers/AppProviders';
import { AppInitializer } from '../src/providers/AppInitializer';
import '../src/theme/themeContext';
import { useI18n } from '../src/i18n/I18nContext';

function RootStack() {
  const { t } = useI18n();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="details/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="manual-entry" options={{ presentation: 'modal', title: t('manualEntry.title') }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <AppInitializer />
      <RootStack />
    </AppProviders>
  );
}
