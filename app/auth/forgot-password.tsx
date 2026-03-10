import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { useI18n } from '../../src/i18n/I18nContext';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function ForgotPasswordScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.spring(formAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleResetPassword = async () => {
    if (!email) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('auth.error'), t('auth.enterEmail'));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setEmailSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(successAnim, { toValue: 1, useNativeDriver: true }).start();
      Alert.alert(t('auth.success'), t('auth.resetEmailSent'), [
        { text: t('auth.ok'), onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      let errorMessage = t('auth.resetPasswordFailed');
      if (error.code === 'auth/invalid-email') errorMessage = t('auth.invalidEmail');
      else if (error.code === 'auth/user-not-found') errorMessage = t('auth.userNotFound');
      Alert.alert(t('auth.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.accent],
  });

  return (
    <LinearGradient
      colors={['#C4DECC', '#0BAE86', '#0A1F1F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <Animated.View
            style={{
              opacity: headerAnim,
              transform: [
                {
                  translateX: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              disabled={loading}
              activeOpacity={0.6}
            >
              <View style={styles.backButtonCircle}>
                <Ionicons name="arrow-back" size={20} color="#F7FBFA" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Icon + Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [{ scale: iconScale }],
                },
              ]}
            >
              {emailSent ? (
                <Animated.View style={{ transform: [{ scale: successAnim }] }}>
                  <Ionicons name="checkmark-circle" size={44} color="#35F2A9" />
                </Animated.View>
              ) : (
                <Ionicons name="lock-closed-outline" size={40} color="#35F2A9" />
              )}
            </Animated.View>
            <Text style={styles.title}>{t('auth.forgotPassword')}</Text>
            <Text style={styles.subtitle}>{t('auth.forgotPasswordSubtitle')}</Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            style={[
              styles.formCard,
              {
                opacity: formAnim,
                transform: [
                  {
                    translateY: formAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('auth.email')}
              </Text>
              <Animated.View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surface,
                    borderColor,
                    shadowColor: colors.accent,
                    shadowOpacity: focusAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.15],
                    }),
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 8,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={{ opacity: 0.7 }}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor={colors.textSecondary + '80'}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading && !emailSent}
                  onFocus={() =>
                    Animated.spring(focusAnim, { toValue: 1, useNativeDriver: false }).start()
                  }
                  onBlur={() =>
                    Animated.spring(focusAnim, { toValue: 0, useNativeDriver: false }).start()
                  }
                />
              </Animated.View>
            </View>

            {/* Reset Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleResetPassword();
                }}
                onPressIn={() =>
                  Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true }).start()
                }
                onPressOut={() =>
                  Animated.spring(buttonScale, {
                    toValue: 1,
                    friction: 3,
                    tension: 100,
                    useNativeDriver: true,
                  }).start()
                }
                disabled={loading || emailSent}
              >
                <LinearGradient
                  colors={emailSent ? ['#A5C9C7', '#546866'] : ['#35F2A9', '#0BAE86']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.resetButton, (loading || emailSent) && { opacity: 0.7 }]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      {emailSent && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#0A1F1F"
                          style={{ marginRight: 8 }}
                        />
                      )}
                      <Text style={styles.resetButtonText}>
                        {emailSent ? t('auth.emailSent') : t('auth.sendResetEmail')}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.backToLogin}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              disabled={loading}
              activeOpacity={0.6}
            >
              <Ionicons name="arrow-back" size={16} color={colors.accent} />
              <Text style={[styles.backToLoginText, { color: colors.accent }]}>
                {t('auth.backToLogin')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 24,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(53, 242, 169, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(53, 242, 169, 0.2)',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Lora_700Bold',
    color: '#F7FBFA',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#A5C9C7',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: 'rgba(16, 45, 44, 0.6)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputContainer: {
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  resetButton: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#0BAE86',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 22,
  },
  resetButtonText: {
    color: '#0A1F1F',
    fontSize: 16,
    fontFamily: 'Lora_600SemiBold',
    letterSpacing: 0.3,
  },
  backToLogin: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
