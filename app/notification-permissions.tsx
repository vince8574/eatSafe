import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/theme/themeContext';
import { useI18n } from '../src/i18n/I18nContext';
import { usePreferencesStore } from '../src/stores/usePreferencesStore';
import { requestNotificationPermissions } from '../src/services/notificationService';
import { GradientBackground } from '../src/components/GradientBackground';

export default function NotificationPermissionsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const setNotificationsEnabled = usePreferencesStore((state) => state.setNotificationsEnabled);
  const setHasSeenNotificationPrompt = usePreferencesStore((state) => state.setHasSeenNotificationPrompt);

  const iconScale = useRef(new Animated.Value(0.3)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(40)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const benefit1Opacity = useRef(new Animated.Value(0)).current;
  const benefit2Opacity = useRef(new Animated.Value(0)).current;
  const benefit3Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 500, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(contentSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true })
      ]),
      Animated.stagger(150, [
        Animated.timing(benefit1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(benefit2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(benefit3Opacity, { toValue: 1, duration: 300, useNativeDriver: true })
      ])
    ]).start();
  }, []);

  const handleEnableNotifications = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsLoading(true);
      const granted = await requestNotificationPermissions();
      setHasSeenNotificationPrompt(true);

      if (granted) {
        setNotificationsEnabled(true);
      }

      router.replace('/auth/login');
    } catch (error) {
      console.error('[NotificationPermissions] Error:', error);
      setHasSeenNotificationPrompt(true);
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHasSeenNotificationPrompt(true);
    setNotificationsEnabled(false);
    router.replace('/(tabs)/home');
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.accent + '20', transform: [{ scale: iconScale }], opacity: iconOpacity }
            ]}
          >
            <Ionicons name="notifications" size={64} color={colors.accent} />
          </Animated.View>

          <Animated.View style={[styles.textContainer, { opacity: contentOpacity, transform: [{ translateY: contentSlide }] }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('notificationPermissions.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('notificationPermissions.subtitle')}
            </Text>
          </Animated.View>

          <View style={styles.benefitsList}>
            <Animated.View style={[styles.benefitItem, { backgroundColor: colors.surface, opacity: benefit1Opacity }]}>
              <View style={[styles.benefitIconContainer, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="shield-checkmark" size={22} color={colors.success} />
              </View>
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                {t('notificationPermissions.benefit1')}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.benefitItem, { backgroundColor: colors.surface, opacity: benefit2Opacity }]}>
              <View style={[styles.benefitIconContainer, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="time" size={22} color={colors.accent} />
              </View>
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                {t('notificationPermissions.benefit2')}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.benefitItem, { backgroundColor: colors.surface, opacity: benefit3Opacity }]}>
              <View style={[styles.benefitIconContainer, { backgroundColor: '#6C63FF20' }]}>
                <Ionicons name="people" size={22} color="#6C63FF" />
              </View>
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                {t('notificationPermissions.benefit3')}
              </Text>
            </Animated.View>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleEnableNotifications}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.surface }]}>
                {t('notificationPermissions.enableButton')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
              {t('notificationPermissions.skipButton')}
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  textContainer: {
    alignItems: 'center',
    gap: 10
  },
  title: {
    fontSize: 26,
    fontFamily: 'Lora_700Bold',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 10
  },
  benefitsList: {
    width: '100%',
    gap: 12,
    marginTop: 10,
    marginBottom: 20
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16
  },
  benefitIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  button: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  skipButton: {
    paddingVertical: 12
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600'
  }
});
