import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';
import { useUserStore } from '../stores/useUserStore';
import { NamePromptModal } from '../components/NamePromptModal';

const { width } = Dimensions.get('window');

export function WelcomeScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { firstName, setFirstName } = useUserStore();
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
    if (!firstName) {
      const timer = setTimeout(() => {
        setShowNamePrompt(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [firstName]);

  const handleSaveName = (name: string) => {
    setFirstName(name);
    setShowNamePrompt(false);
  };

  const handleSkipName = () => {
    setShowNamePrompt(false);
  };

  const handleStartScanning = () => {
    router.push('/(tabs)/scan');
  };

  const displayName = firstName || t('common.unknown');

  return (
    <View style={[styles.container, { backgroundColor: '#C4DECC' }]}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo_eatsok.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Greeting */}
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>
          {t('welcomeScreen.greeting', { name: displayName })}
        </Text>

        {/* Question */}
        <Text style={[styles.question, { color: colors.textSecondary }]}>
          {t('welcomeScreen.question')}
        </Text>

        {/* Start Button */}
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: colors.accent }]}
          onPress={handleStartScanning}
          activeOpacity={0.8}
        >
          <Text style={[styles.startButtonText, { color: colors.surface }]}>
            {t('welcomeScreen.startScanning')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Name Prompt Modal */}
      <NamePromptModal
        visible={showNamePrompt}
        onSave={handleSaveName}
        onSkip={handleSkipName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60
  },
  logoContainer: {
    marginBottom: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
    maxWidth: 220,
    maxHeight: 220,
    borderRadius: 40
  },
  greeting: {
    fontFamily: 'Lora_700Bold',
    fontSize: 38,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 48,
    paddingHorizontal: 20
  },
  startButton: {
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 260
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5
  }
});
