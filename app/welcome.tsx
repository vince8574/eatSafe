import { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/themeContext';
import { usePreferencesStore } from '../src/stores/usePreferencesStore';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const firstName = usePreferencesStore((state) => state.firstName);
  const hasSeenNotificationPrompt = usePreferencesStore((state) => state.hasSeenNotificationPrompt);
  const setHasSeenWelcome = usePreferencesStore((state) => state.setHasSeenWelcome);

  useEffect(() => {
    setHasSeenWelcome(true);
    const timer = setTimeout(() => {
      // Redirect to notification permissions if not seen yet, otherwise to login
      if (!hasSeenNotificationPrompt) {
        router.replace('/notification-permissions');
      } else {
        router.replace('/auth/login');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [router, setHasSeenWelcome, hasSeenNotificationPrompt]);

  const handleGoToHome = () => {
    setHasSeenWelcome(true);
    if (!hasSeenNotificationPrompt) {
      router.replace('/notification-permissions');
    } else {
      router.replace('/auth/login');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Image source={require('../assets/pomme.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>Bonjour {firstName || ''}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Quel produit voulez-vous vérifier aujourd'hui ?</Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={handleGoToHome}
        >
          <Text style={[styles.buttonText, { color: colors.surface }]}>Accéder à l'application</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  center: {
    alignItems: 'center',
    gap: 14
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 32
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800'
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center'
  },
  button: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center'
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700'
  }
});
