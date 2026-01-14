import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';
import { GradientBackground } from '../components/GradientBackground';
import { manualRecallCheck, sendTestNotification, getNotificationStatus } from '../services/testNotificationService';

export function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { products } = useScannedProducts();
  const [isChecking, setIsChecking] = useState(false);

  const stats = useMemo(() => {
    const total = products.length;
    const recalled = products.filter((product) => product.recallStatus === 'recalled').length;
    const pending = products.filter((product) => product.recallStatus === 'unknown').length;

    return { total, recalled, pending };
  }, [products]);

  const handleTestNotification = async () => {
    const status = await getNotificationStatus();

    if (!status.granted) {
      Alert.alert(
        'Notifications désactivées',
        'Les notifications ne sont pas autorisées. Activez-les dans les paramètres de l\'application.',
        [{ text: 'OK' }]
      );
      return;
    }

    const success = await sendTestNotification();
    if (!success) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la notification de test', [{ text: 'OK' }]);
    }
  };

  const handleManualCheck = async () => {
    const status = await getNotificationStatus();

    if (!status.granted) {
      Alert.alert(
        'Notifications désactivées',
        'Les notifications ne sont pas autorisées. Activez-les dans les paramètres de l\'application pour recevoir les alertes de rappel.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsChecking(true);
    const result = await manualRecallCheck();
    setIsChecking(false);

    if (!result.success) {
      Alert.alert('Erreur', result.error || 'Échec de la vérification', [{ text: 'OK' }]);
      return;
    }

    if (result.newRecallsFound > 0) {
      Alert.alert(
        '⚠️ Rappels détectés!',
        `${result.newRecallsFound} rappel(s) trouvé(s) sur ${result.productsChecked} produit(s). Vous recevrez des notifications.`,
        [{ text: 'Voir', onPress: () => router.push('/history') }]
      );
    }
  };

  return (
    <GradientBackground>
      <FlatList
        data={[]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {/* Logo centré en grand */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo_eatsok.png')}
                style={styles.logoBig}
                resizeMode="contain"
              />
            </View>

            {/* Titre centré */}
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
            >
              {t('home.title')}
            </Text>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('home.subtitle')}
            </Text>

            <View style={styles.statsContainer}>
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/history')}
              >
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.total}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home.stats.scanned')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push({ pathname: '/history', params: { filter: 'recalled' } })}
              >
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.recalled}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home.stats.recalled')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push({ pathname: '/history', params: { filter: 'unknown' } })}
              >
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.pending}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home.stats.pending')}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.appDisclaimerBox, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.appDisclaimerText, { color: colors.textSecondary }]}>
                ⚠️ {t('common.appDisclaimer')}
              </Text>
            </View>

            {/* Debug/Test Buttons */}
            <View style={styles.testButtonsContainer}>
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: colors.accent }]}
                onPress={handleTestNotification}
                activeOpacity={0.8}
              >
                <Text style={[styles.testButtonText, { color: colors.surface }]}>
                  🔔 Tester notification
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: colors.primary }]}
                onPress={handleManualCheck}
                activeOpacity={0.8}
                disabled={isChecking}
              >
                {isChecking ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={[styles.testButtonText, { color: colors.surface }]}>
                    🔍 Vérifier rappels
                  </Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        }
        renderItem={() => null}
        ListEmptyComponent={null}
        scrollEnabled={false}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  list: {
    padding: 24
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10
  },
  logoBig: {
    width: 140,
    height: 140,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12
  },
  title: {
    fontFamily: 'Lora_700Bold',
    fontSize: 46,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    marginBottom: 28,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 12
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    marginRight: 12,
    padding: 16
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800'
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 18
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22
  },
  appDisclaimerBox: {
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    marginBottom: 16
  },
  appDisclaimerText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center'
  },
  testButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  testButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '700'
  }
});
