import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/themeContext';
import { usePreferencesStore } from '../src/stores/usePreferencesStore';
import { requestNotificationPermissions } from '../src/services/notificationService';

export default function NotificationPermissionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const setNotificationsEnabled = usePreferencesStore((state) => state.setNotificationsEnabled);
  const setHasSeenNotificationPrompt = usePreferencesStore((state) => state.setHasSeenNotificationPrompt);

  const handleEnableNotifications = async () => {
    try {
      setIsLoading(true);
      const granted = await requestNotificationPermissions();
      setHasSeenNotificationPrompt(true);

      if (granted) {
        setNotificationsEnabled(true);
      }

      router.replace('/auth/login');
    } catch (error) {
      console.error('[NotificationPermissions] Error:', error);
      // Continue anyway
      setHasSeenNotificationPrompt(true);
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setHasSeenNotificationPrompt(true);
    setNotificationsEnabled(false);
    router.replace('/(tabs)/home');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Notification Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
          <Ionicons name="notifications" size={64} color={colors.accent} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Restez informé des rappels
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Recevez des notifications en temps réel lorsqu'un produit que vous avez scanné fait l'objet d'un rappel sanitaire.
        </Text>

        {/* Benefits List */}
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Ionicons name="shield-checkmark" size={24} color={colors.success} />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              Alertes de sécurité immédiates
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="time" size={24} color={colors.accent} />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              Vérifications automatiques toutes les heures
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              Partagez avec votre équipe (organisations)
            </Text>
          </View>
        </View>

        {/* Primary Button */}
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
              Activer les notifications
            </Text>
          )}
        </TouchableOpacity>

        {/* Secondary Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
            Plus tard
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
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
    gap: 16,
    marginTop: 10,
    marginBottom: 20
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  button: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700'
  },
  skipButton: {
    paddingVertical: 12
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600'
  }
});
