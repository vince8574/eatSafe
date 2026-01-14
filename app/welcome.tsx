import { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/themeContext';
import { useI18n } from '../src/i18n/I18nContext';
import { usePreferencesStore } from '../src/stores/usePreferencesStore';
import { GradientBackground } from '../src/components/GradientBackground';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
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
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.center}>
          <Image source={require('../assets/pomme.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {t('welcomeScreen.greeting', { name: firstName || '' })}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('welcomeScreen.question')}
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleGoToHome}
          >
            <Text style={[styles.buttonText, { color: colors.surface }]}>
              {t('welcomeScreen.startScanning')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24
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
