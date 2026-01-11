import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
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

      const product = await addProduct({
        brand: finalBrand,
        lotNumber: lotNumber.trim()
      });

      // IncrÃ©menter le compteur d'utilisation si c'est une marque personnalisÃ©e
      if (brand.trim()) {
        await incrementBrandUsage(brand.trim());
      }

      const recalls = await fetchRecallsByCountry(country);
      const recallStatus = await updateRecall(product, recalls);

      // Send notification if product is recalled
      if (recallStatus.status === 'recalled') {
        const recall = recalls.find(r => r.id === recallStatus.recallReference);
        if (recall) {
          await scheduleRecallNotification(product, recall);
        }
      }

      await decrementScanCounter();

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
      <View style={styles.container}>
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

      <View style={[styles.appDisclaimerBox, { backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.appDisclaimerText, { color: colors.textSecondary }]}>
          âš ï¸ {t('common.appDisclaimer')}
        </Text>
        <Text style={[styles.appDisclaimerText, { color: colors.textSecondary, marginTop: 4 }]}>
          {subLoading
            ? t('quota.loading')
            : `${t('quota.remaining')} ${subscription?.scansRemaining ?? 0}`}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent, opacity: isSubmitting ? 0.5 : 1 }]}
        onPress={handleSave}
        disabled={isSubmitting}
      >
        <Text style={[styles.buttonText, { color: colors.surface }]}>
          {isSubmitting ? t('manualEntry.verifying') : t('manualEntry.save')}
        </Text>
      </TouchableOpacity>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24
  },
  title: {
    fontSize: 24,
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
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    marginBottom: 16
  },
  appDisclaimerText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center'
  }
});
