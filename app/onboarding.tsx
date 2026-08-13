import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Animated, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/themeContext';
import { useI18n } from '../src/i18n/I18nContext';
import { usePreferencesStore } from '../src/stores/usePreferencesStore';
import { GradientBackground } from '../src/components/GradientBackground';
import { saveCompanyReferral } from '../src/services/companyReferralService';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [wantsReferral, setWantsReferral] = useState(false);
  const [error, setError] = useState('');
  const setFirstName = usePreferencesStore((state) => state.setFirstName);
  const setCompanyNameStore = usePreferencesStore((state) => state.setCompanyName);
  const setWantsNumelineReferral = usePreferencesStore((state) => state.setWantsNumelineReferral);
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

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(t('onboarding.firstNameError'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError('');
    setFirstName(trimmed);
    setCompanyNameStore(companyName.trim());
    setWantsNumelineReferral(wantsReferral);

    // Save to Firebase if company wants referral
    if (companyName.trim() && wantsReferral) {
      saveCompanyReferral(companyName.trim(), trimmed).catch(console.warn);
    }

    setHasSeenWelcome(false);
    // Étape régime AVANT l'accueil : sans elle, le profil n'était atteignable que
    // depuis les Réglages, donc la détection d'allergènes restait éteinte pour
    // quiconque n'y allait pas.
    router.replace('/dietary-intro' as any);
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
                  returnKeyType="next"
                />
                {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('onboarding.companyNameLabel')}
                </Text>
                <TextInput
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder={t('onboarding.companyNamePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      backgroundColor: colors.surface,
                      borderColor: colors.border
                    }
                  ]}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />
                <Text style={[styles.optionalLabel, { color: colors.textSecondary }]}>
                  {t('onboarding.optional')}
                </Text>
              </View>

              {companyName.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.checkboxRow, { backgroundColor: colors.surface, borderColor: wantsReferral ? colors.accent : colors.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setWantsReferral(!wantsReferral);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.checkbox,
                    {
                      borderColor: wantsReferral ? colors.accent : colors.textSecondary,
                      backgroundColor: wantsReferral ? colors.accent : 'transparent'
                    }
                  ]}>
                    {wantsReferral && (
                      <Ionicons name="checkmark" size={16} color={colors.surface} />
                    )}
                  </View>
                  <Text style={[styles.checkboxText, { color: colors.textPrimary }]}>
                    {t('onboarding.referralConsent')}
                  </Text>
                </TouchableOpacity>
              )}

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
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
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
  optionalLabel: {
    fontSize: 12,
    fontStyle: 'italic'
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
  checkboxRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
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
