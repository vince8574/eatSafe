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
  ScrollView,
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

function AnimatedInput({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  editable = true,
  showToggle,
  onToggle,
  toggleIcon,
  hint,
  colors,
  delay = 0,
}: {
  icon: string;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  editable?: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  toggleIcon?: string;
  hint?: string;
  colors: any;
  delay?: number;
}) {
  const focusAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleFocus = () => {
    Animated.spring(focusAnim, { toValue: 1, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    Animated.spring(focusAnim, { toValue: 0, useNativeDriver: false }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.accent],
  });

  return (
    <Animated.View
      style={[styles.inputContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor,
            shadowColor: colors.accent,
            shadowOpacity: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] }),
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
          },
        ]}
      >
        <Ionicons name={icon as any} size={20} color={colors.textSecondary} style={{ opacity: 0.7 }} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary + '80'}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={toggleIcon as any} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {hint && (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>
      )}
    </Animated.View>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ['#FF647C', '#FFC857', '#35F2A9'];
  const fillColor = strength === 0 ? 'transparent' : strengthColors[strength - 1];

  if (password.length === 0) return null;

  return (
    <View style={styles.strengthContainer}>
      {[1, 2, 3].map((level) => (
        <View
          key={level}
          style={[
            styles.strengthBar,
            {
              backgroundColor: level <= strength ? fillColor : 'rgba(255,255,255,0.1)',
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function SignupScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const bottomAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true }),
      Animated.spring(bottomAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, []);

  const validateForm = () => {
    if (!email || !password || !confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('auth.error'), t('auth.fillAllFields'));
      return false;
    }
    if (password.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('auth.error'), t('auth.passwordTooShort'));
      return false;
    }
    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('auth.error'), t('auth.passwordsDoNotMatch'));
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      let errorMessage = t('auth.signupFailed');
      if (error.code === 'auth/email-already-in-use') errorMessage = t('auth.emailAlreadyInUse');
      else if (error.code === 'auth/invalid-email') errorMessage = t('auth.invalidEmail');
      else if (error.code === 'auth/weak-password') errorMessage = t('auth.weakPassword');
      Alert.alert(t('auth.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      if (error?.code !== 'SIGN_IN_CANCELLED') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const errorDetail = error?.message || error?.code || 'Unknown error';
        Alert.alert(
          t('auth.error'),
          `${t('auth.googleSignInFailed')}\n\nCode: ${error?.code || 'N/A'}\nDetail: ${errorDetail}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const scaleAnim = useRef(new Animated.Value(1)).current;

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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
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
            <Text style={styles.title}>{t('auth.createAccount')}</Text>
            <Text style={styles.subtitle}>{t('auth.signupSubtitle')}</Text>
          </Animated.View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <AnimatedInput
              icon="mail-outline"
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              editable={!loading}
              colors={colors}
              delay={200}
            />

            <AnimatedInput
              icon="lock-closed-outline"
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry={!showPassword}
              editable={!loading}
              showToggle
              onToggle={() => setShowPassword(!showPassword)}
              toggleIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              hint={t('auth.passwordHint')}
              colors={colors}
              delay={300}
            />

            <PasswordStrength password={password} />

            <AnimatedInput
              icon="shield-checkmark-outline"
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
              showToggle
              onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
              toggleIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              colors={colors}
              delay={400}
            />

            {/* Match indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchRow}>
                <Ionicons
                  name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={password === confirmPassword ? '#35F2A9' : '#FF647C'}
                />
                <Text
                  style={[
                    styles.matchText,
                    { color: password === confirmPassword ? '#35F2A9' : '#FF647C' },
                  ]}
                >
                  {password === confirmPassword
                    ? t('auth.passwordsMatch') || 'Passwords match'
                    : t('auth.passwordsDoNotMatch')}
                </Text>
              </View>
            )}

            {/* Sign Up Button */}
            <Animated.View
              style={{
                transform: [{ scale: scaleAnim }],
                marginTop: 8,
              }}
            >
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleSignUp();
                }}
                onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()}
                onPressOut={() =>
                  Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start()
                }
                disabled={loading}
              >
                <LinearGradient
                  colors={['#35F2A9', '#0BAE86']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t('auth.signUp')}</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Divider */}
            <Animated.View style={[styles.divider, { opacity: bottomAnim }]}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
                {t('auth.orContinueWith')}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </Animated.View>

            {/* Google */}
            <Animated.View style={{ opacity: bottomAnim }}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleGoogleSignUp();
                }}
                disabled={loading}
                style={({ pressed }) => [
                  styles.socialButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={[styles.socialButtonText, { color: colors.text }]}>
                  {t('auth.continueWithGoogle')}
                </Text>
              </Pressable>
            </Animated.View>

            {/* Login Link */}
            <Animated.View style={[styles.loginContainer, { opacity: bottomAnim }]}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                {t('auth.alreadyHaveAccount')}{' '}
              </Text>
              <TouchableOpacity onPress={() => router.back()} disabled={loading} activeOpacity={0.6}>
                <Text style={[styles.loginLink, { color: colors.accent }]}>
                  {t('auth.login')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontFamily: 'Lora_700Bold',
    color: '#F7FBFA',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#A5C9C7',
  },
  formCard: {
    backgroundColor: 'rgba(16, 45, 44, 0.6)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputContainer: {
    marginBottom: 18,
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
  hint: {
    fontSize: 12,
    marginTop: 6,
    opacity: 0.7,
  },
  strengthContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
    marginTop: -10,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginTop: -10,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0BAE86',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#0A1F1F',
    fontSize: 16,
    fontFamily: 'Lora_600SemiBold',
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
  },
  socialButton: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
