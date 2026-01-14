import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
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

  const handleContinue = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('onboarding.firstNameError'));
      return;
    }
    setError('');
    setFirstName(trimmed);
    setHasSeenWelcome(false);
    router.replace('/welcome');
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Image source={require('../assets/logo_eatsok.png')} style={styles.logo} resizeMode="contain" />
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
                  borderColor: colors.border
                }
              ]}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          </View>

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleContinue} activeOpacity={0.85}>
            <Text style={[styles.buttonText, { color: colors.surface }]}>
              {t('onboarding.continue')}
            </Text>
          </TouchableOpacity>
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
    gap: 20,
    padding: 24
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 32
  },
  title: {
    fontSize: 24,
    fontWeight: '800'
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
    fontSize: 14,
    fontWeight: '600'
  },
  input: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  error: {
    marginTop: 4,
    fontSize: 13
  },
  button: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center'
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700'
  }
});
