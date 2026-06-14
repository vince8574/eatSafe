import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';
import { fetchRecallsByCountry } from '../services/apiService';
import { BrandAutocomplete } from '../components/BrandAutocomplete';
import { incrementBrandUsage } from '../services/customBrandsService';
import { scheduleRecallNotification } from '../services/notificationService';
import { GradientBackground } from '../components/GradientBackground';
import { useSubscription } from '../hooks/useSubscription';
import { decrementScanCounter } from '../services/subscriptionService';

export function ManualEntryScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { addProduct, updateRecall } = useScannedProducts();
  const country = usePreferencesStore((state) => state.country);
  const [brand, setBrand] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { subscription, buyPack, refresh, loading: subLoading } = useSubscription();


  const ensureScanQuota = useCallback(async (): Promise<boolean> => {
    const remaining = subscription?.scansRemaining ?? 0;
    if (remaining > 0) return true;

    return new Promise((resolve) => {
      Alert.alert(
        t('quota.reached'),
        t('quota.addPack'),
        [
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
          {
            text: t('quota.pack500'),
            onPress: async () => {
              try {
                await buyPack(500);
                await refresh();
                resolve(true);
              } catch (error) {
                Alert.alert(t('auth.error'), t('quota.cannotAdd'));
                resolve(false);
              }
            }
          }
        ],
        { cancelable: true }
      );
    });
  }, [subscription?.scansRemaining, buyPack, refresh, t]);

  const handleSave = async () => {
    if (!lotNumber.trim()) {
      Alert.alert(t('manualEntry.errors.lotRequired'), t('manualEntry.errors.lotRequiredMessage'));
      return;
    }

    try {
      setIsSubmitting(true);
      const hasQuota = await ensureScanQuota();
      if (!hasQuota) {
        setIsSubmitting(false);
        return;
      }
      const finalBrand = brand.trim() || t('common.unknown');

      // SEULE étape essentielle : créer le produit. Si elle échoue → vraie
      // erreur affichée. Tout le reste (marque, rappel, notif, quota) est
      // best-effort et ne doit JAMAIS empêcher la navigation, sinon
      // l'utilisateur reste bloqué sur cet écran (cas réel : decrementScanCounter
      // = Firestore update() qui throw si le doc n'existe pas / scopeId divergent).
      const product = await addProduct({
        brand: finalBrand,
        lotNumber: lotNumber.trim()
      });

      if (brand.trim()) {
        void Promise.resolve(incrementBrandUsage(brand.trim())).catch((e) =>
          console.warn('[ManualEntry] incrementBrandUsage skipped', e)
        );
      }

      // Vérif rappel : best-effort. Le produit est créé ; si la vérif échoue
      // (réseau), l'écran détail la refera. On ne bloque pas la navigation.
      try {
        const recalls = await fetchRecallsByCountry(country);
        const recallStatus = await updateRecall(product, recalls);
        if (recallStatus.status === 'recalled') {
          const recall = recalls.find((r) => r.id === recallStatus.recallReference);
          if (recall) {
            await scheduleRecallNotification(product, recall);
          }
        }
      } catch (recallError) {
        console.warn('[ManualEntry] recall check skipped', recallError);
      }

      // Quota : non bloquant pour la navigation (comme ScanLotScreen).
      void decrementScanCounter().catch((e) =>
        console.warn('[ManualEntry] decrementScanCounter skipped', e)
      );

      router.replace({ pathname: '/details/[id]', params: { id: product.id } });
    } catch (error) {
      Alert.alert(
        t('manualEntry.errors.saveFailed'),
        error instanceof Error ? error.message : t('manualEntry.errors.checkFailed')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('manualEntry.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('manualEntry.subtitle')}
        </Text>

        <BrandAutocomplete
          value={brand}
          onChangeText={setBrand}
          placeholder={t('manualEntry.brandPlaceholder')}
          autoCapitalize="words"
        />

        <View style={[styles.field, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('manualEntry.lotLabel')}</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, letterSpacing: 1.2 }]}
            placeholder={t('manualEntry.lotPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={lotNumber}
            onChangeText={setLotNumber}
            autoCapitalize="characters"
          />
        </View>

        <View style={[styles.appDisclaimerBox, { backgroundColor: colors.surfaceAlt, borderColor: 'rgba(255,255,255,0.06)' }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <View style={styles.appDisclaimerContent}>
            <Text style={[styles.appDisclaimerText, { color: colors.textPrimary }]}>
              {t('common.appDisclaimer')}
            </Text>
            <Text style={[styles.quotaText, { color: colors.textSecondary }]}>
              {subLoading
                ? t('quota.loading')
                : `${t('quota.remaining')} ${subscription?.scansRemaining ?? 0}`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent, opacity: isSubmitting ? 0.5 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleSave();
          }}
          disabled={isSubmitting}
        >
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            {isSubmitting ? t('manualEntry.verifying') : t('manualEntry.save')}
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  container: {
    flexGrow: 1,
    padding: 24
  },
  title: {
    fontSize: 24,
    fontFamily: 'Lora_700Bold',
    fontWeight: '700'
  },
  subtitle: {
    fontSize: 15,
    marginVertical: 12,
    lineHeight: 22
  },
  field: {
    borderRadius: 18,
    marginTop: 20,
    padding: 16
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  input: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '600'
  },
  button: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center'
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  appDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    marginBottom: 16,
    borderWidth: 1
  },
  appDisclaimerContent: {
    flex: 1,
    gap: 4
  },
  appDisclaimerText: {
    fontSize: 12,
    lineHeight: 18
  },
  quotaText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600'
  }
});
