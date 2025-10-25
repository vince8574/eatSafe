import { Stack } from 'expo-router';
import { AppProviders } from '../src/providers/AppProviders';
import { AppInitializer } from '../src/providers/AppInitializer';
import '../src/theme/themeContext';

export default function RootLayout() {
  return (
    <AppProviders>
      <AppInitializer />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="details/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="manual-entry" options={{ presentation: 'modal', title: 'Saisie manuelle' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProviders>
  );
}
