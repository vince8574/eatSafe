import { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/themeContext';
import { usePreferencesStore } from '../src/stores/usePreferencesStore';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const firstName = usePreferencesStore((state) => state.firstName);
  const setHasSeenWelcome = usePreferencesStore((state) => state.setHasSeenWelcome);

  useEffect(() => {
    setHasSeenWelcome(true);
    const timer = setTimeout(() => {
      router.replace('/(tabs)/home');
    }, 1000);
    return () => clearTimeout(timer);
  }, [router, setHasSeenWelcome]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Image source={require('../assets/logo_eatsok.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>Bonjour {firstName || ''}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Quel produit voulez-vous vérifier aujourd'hui ?</Text>
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
  }
});
