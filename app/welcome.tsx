import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useI18n } from '../src/i18n/I18nContext';
import { usePreferencesStore } from '../src/stores/usePreferencesStore';

export default function WelcomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const firstName = usePreferencesStore((state) => state.firstName);
  const hasSeenNotificationPrompt = usePreferencesStore((state) => state.hasSeenNotificationPrompt);
  const setHasSeenWelcome = usePreferencesStore((state) => state.setHasSeenWelcome);

  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(20)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const navigate = () => {
    setHasSeenWelcome(true);
    if (!hasSeenNotificationPrompt) {
      router.replace('/notification-permissions');
    } else {
      router.replace('/auth/login');
    }
  };

  useEffect(() => {
    setHasSeenWelcome(true);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textSlide, { toValue: 0, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(buttonSlide, { toValue: 0, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(navigate, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#C4DECC', '#0BAE86', '#0A1F1F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: Animated.multiply(logoScale, pulseAnim) }],
            },
          ]}
        >
          <View style={styles.logoGlow} />
          <Image source={require('../assets/pomme.png')} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textSlide }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.greeting}>
            {t('welcomeScreen.greeting', { name: firstName || '' })}
          </Text>
          <Text style={styles.subtitle}>
            {t('welcomeScreen.question')}
          </Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity: buttonOpacity,
            transform: [{ translateY: buttonSlide }, { scale: buttonScale }],
          }}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigate();
            }}
            onPressIn={() =>
              Animated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true }).start()
            }
            onPressOut={() =>
              Animated.spring(buttonScale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start()
            }
          >
            <LinearGradient
              colors={['#35F2A9', '#0BAE86']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {t('welcomeScreen.startScanning')}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  logoWrapper: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(53, 242, 169, 0.12)',
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  greeting: {
    fontSize: 26,
    fontFamily: 'Lora_700Bold',
    color: '#F7FBFA',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#A5C9C7',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },
  button: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#0BAE86',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Lora_600SemiBold',
    color: '#0A1F1F',
    letterSpacing: 0.3,
  },
});
