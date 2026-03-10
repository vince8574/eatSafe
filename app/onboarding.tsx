import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/theme/themeContext';
import { useI18n } from '../src/i18n/I18nContext';
import { usePreferencesStore } from '../src/stores/usePreferencesStore';
import { GradientBackground } from '../src/components/GradientBackground';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const setFirstName = usePreferencesStore((state) => state.setFirstName);
  const setHasSeenWelcome = usePreferencesStore((state) => state.setHasSeenWelcome);

  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(40)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(contentSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true })
      ])
    ]).start();
  }, []);

  const handleContinue = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(t('onboarding.firstNameError'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError('');
    setFirstName(trimmed);
    setHasSeenWelcome(false);
    router.replace('/welcome');
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
            <Image source={require('../assets/logo_eatsok.png')} style={styles.logo} resizeMode="contain" />
          </Animated.View>

          <Animated.View style={[styles.formContainer, { opacity: contentOpacity, transform: [{ translateY: contentSlide }] }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('onboarding.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('onboarding.disclaimer')}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('onboarding.firstNameLabel')}
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('onboarding.firstNamePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  {
                    color: colors.textPrimary,
                    backgroundColor: colors.surface,
                    borderColor: error ? colors.danger : colors.border
                  }
                ]}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={handleContinue}
              activeOpacity={0.85}
            >
              <Text style={[styles.buttonText, { color: colors.surface }]}>
                {t('onboarding.continue')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: 24
  },
  logoContainer: {
    marginBottom: 8
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 32
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16
  },
  title: {
    fontSize: 26,
    fontFamily: 'Lora_700Bold',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  },
  inputGroup: {
    width: '100%',
    gap: 6
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  input: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16
  },
  error: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600'
  },
  button: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5
  }
});
