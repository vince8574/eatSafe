import { Tabs } from 'expo-router';
import { useTheme } from '../../src/theme/themeContext';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          paddingBottom: 12,
          paddingTop: 8,
          height: 68
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600'
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Accueil' }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: 'Scanner' }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Historique' }}
      />
    </Tabs>
  );
}
