import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/themeContext';
import { useI18n } from '../../src/i18n/I18nContext';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();

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
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('navigation.scan'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('navigation.history'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="language"
        options={{
          title: t('navigation.language'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="language" size={size} color={color} />
          )
        }}
      />
    </Tabs>
  );
}
