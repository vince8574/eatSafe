import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';
import { GradientBackground } from './GradientBackground';

interface NamePromptModalProps {
  visible: boolean;
  onSave: (name: string) => void;
  onSkip: () => void;
}

const MAX_NAME_LENGTH = 30;
const MIN_NAME_LENGTH = 2;
// Lettres (toutes langues), espaces, apostrophes, tirets
const NAME_REGEX = /^[\p{L}][\p{L} '\-]*$/u;

export function NamePromptModal({ visible, onSave, onSkip }: NamePromptModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validate = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_NAME_LENGTH) {
      return t('welcomeScreen.nameTooShort');
    }
    if (!NAME_REGEX.test(trimmed)) {
      return t('welcomeScreen.nameInvalid');
    }
    return null;
  };

  const handleChange = (value: string) => {
    setName(value);
    if (error) setError(null);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    const err = validate(trimmed);
    if (err) {
      setError(err);
      return;
    }
    onSave(trimmed);
    setName('');
    setError(null);
  };

  const handleSkip = () => {
    setName('');
    setError(null);
    onSkip();
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <GradientBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <View style={[styles.modalContent, { backgroundColor: 'rgba(255, 255, 255, 0.95)' }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('welcomeScreen.namePromptTitle')}
            </Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {t('welcomeScreen.namePromptMessage')}
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.textPrimary,
                  borderColor: error ? '#D64545' : colors.border
                }
              ]}
              placeholder={t('welcomeScreen.namePromptPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={handleChange}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              onSubmitEditing={handleSave}
            />
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.skipButton, { backgroundColor: colors.surfaceAlt }]}
                onPress={handleSkip}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                  {t('welcomeScreen.namePromptSkip')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  {
                    backgroundColor: colors.accent,
                    opacity: name.trim() ? 1 : 0.5
                  }
                ]}
                onPress={handleSave}
                disabled={!name.trim()}
              >
                <Text style={[styles.buttonText, { color: colors.surface }]}>
                  {t('welcomeScreen.namePromptSave')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </GradientBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    gap: 20
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center'
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center'
  },
  input: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 2,
    marginTop: 8
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  skipButton: {
    flex: 0.8
  },
  saveButton: {
    flex: 1.2
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700'
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D64545',
    marginTop: -12,
    textAlign: 'center'
  }
});
