import { useEffect, useMemo, useState } from 'react';
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
import { useUsageQuota } from '../hooks/useUsageQuota';
import { extractBestByDate, findBestByRecalls } from '../utils/bestByDate';

export function ManualEntryScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { addProduct, updateRecall, updateProduct } = useScannedProducts();
  const country = usePreferencesStore((state) => state.country);
  const [brand, setBrand] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  // Beaucoup de produits (frais, marques distributeur) n'ont PAS de lot : les
  // rappels FDA/USDA les identifient alors par leur date limite. Le même choix
  // qu'à l'écran de scan doit exister ici, sinon la saisie manuelle est un
  // cul-de-sac pour exactement les produits qui en ont le plus besoin.
  const [bestByMode, setBestByMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedBestBy = useMemo(
    () => (bestByMode && lotNumber.trim() ? extractBestByDate(lotNumber) : null),
    [bestByMode, lotNumber]
  );

  // Préchauffe le cache des rappels DÈS l'ouverture. Sans ça, tout le réseau
  // (FDA + USDA + flux des communiqués et leurs pages) démarrait seulement APRÈS
  // la validation : l'utilisateur attendait, écran figé, alors que ce temps peut
  // être couvert par sa saisie. Le fetch est mutualisé et mis en cache.
  useEffect(() => {
    void fetchRecallsByCountry(country);
  }, [country]);

  // La saisie manuelle du lot est GRATUITE ET ILLIMITÉE : elle n'appelle aucun
  // modèle et n'interroge que des bases publiques. Le compteur n'est conservé
  // qu'à titre informatif — plus aucun plafond ne s'y applique.
  const { incrementManualLot } = useUsageQuota();

  const handleSave = async () => {
    if (!lotNumber.trim()) {
      Alert.alert(t('manualEntry.errors.lotRequired'), t('manualEntry.errors.lotRequiredMessage'));
      return;
    }

    if (bestByMode) {
      if (!parsedBestBy) {
        Alert.alert(t('scanLot.confirmBestByTitle'), t('scanLot.bestByParseFailed'));
        return;
      }
      // Sans marque, une date ne distingue rien : des milliers de produits
      // partagent la même date limite. On refuse plutôt que de rendre un
      // « aucun rappel » qui n'a rien vérifié.
      if (!brand.trim()) {
        Alert.alert(t('manualEntry.errors.brandRequired'), t('manualEntry.errors.brandRequiredMessage'));
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const finalBrand = brand.trim() || t('common.unknown');

      // SEULE étape essentielle : créer le produit. Si elle échoue → vraie
      // erreur affichée. Tout le reste (marque, rappel, notif, quota) est
      // best-effort et ne doit JAMAIS empêcher la navigation, sinon
      // l'utilisateur reste bloqué sur cet écran (cas réel : decrementScanCounter
      // = Firestore update() qui throw si le doc n'existe pas / scopeId divergent).
      const product = await addProduct({
        brand: finalBrand,
        // En mode date, on enregistre la date normalisée ("Apr 15, 2027") plutôt
        // que la frappe brute : c'est ce que l'écran détail affichera.
        lotNumber: parsedBestBy ? parsedBestBy.display : lotNumber.trim()
      });

      // La saisie manuelle est GRATUITE ET ILLIMITÉE : aucun scan consommé.
      // Seul le compteur local est incrémenté, à titre informatif.
      incrementManualLot();

      if (brand.trim()) {
        void Promise.resolve(incrementBrandUsage(brand.trim())).catch((e) =>
          console.warn('[ManualEntry] incrementBrandUsage skipped', e)
        );
      }

      // Vérif rappel : best-effort. Le produit est créé ; si la vérif échoue
      // (réseau), l'écran détail la refera. On ne bloque pas la navigation.
      try {
        const recalls = await fetchRecallsByCountry(country);
        if (parsedBestBy) {
          // Mode date : le matching par lot ne s'applique pas. On compare la
          // MARQUE et la fenêtre de dates publiée par le rappel — même règle
          // exacte qu'à l'écran de scan (fonction partagée).
          const matching = findBestByRecalls(recalls, finalBrand, parsedBestBy.iso);
          await updateProduct(product.id, {
            recallStatus: matching.length > 0 ? 'recalled' : 'safe',
            ...(matching.length > 0 && { recallReference: matching[0].id }),
            lastCheckedAt: Date.now()
          });
          if (matching.length > 0) {
            await scheduleRecallNotification(product, matching[0]);
          }
        } else {
          const recallStatus = await updateRecall(product, recalls);
          if (recallStatus.status === 'recalled') {
            const recall = recalls.find((r) => r.id === recallStatus.recallReference);
            if (recall) {
              await scheduleRecallNotification(product, recall);
            }
          }
        }
      } catch (recallError) {
        console.warn('[ManualEntry] recall check skipped', recallError);
      }

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

        <View style={[styles.modeSwitch, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          {[
            { on: false, icon: 'pricetag-outline' as const, label: t('scanLot.modeLot') },
            { on: true, icon: 'calendar-outline' as const, label: t('scanLot.modeBestBy') }
          ].map((opt) => {
            const active = bestByMode === opt.on;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[styles.modeSegment, active && { backgroundColor: colors.accent }]}
                onPress={() => setBestByMode(opt.on)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={opt.icon} size={16} color={active ? colors.onAccent : colors.textSecondary} />
                <Text
                  style={[styles.modeSegmentText, { color: active ? colors.onAccent : colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.modeHelp, { color: colors.textSecondary }]}>
          {bestByMode ? t('scanLot.modeBestByHelp') : t('scanLot.modeLotHelp')}
        </Text>

        <View style={[styles.field, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {bestByMode ? t('scanLot.bestByLabel') : t('manualEntry.lotLabel')}
          </Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, letterSpacing: 1.2 }]}
            placeholder={bestByMode ? t('scanLot.enterBestBy') : t('manualEntry.lotPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={lotNumber}
            onChangeText={setLotNumber}
            autoCapitalize="characters"
          />
          {bestByMode && lotNumber.trim().length > 0 ? (
            <Text
              style={[styles.bestByPreview, { color: parsedBestBy ? colors.success : colors.textSecondary }]}
            >
              {parsedBestBy
                ? t('scanLot.bestByPreview', { date: parsedBestBy.display })
                : t('scanLot.bestByNotParsed')}
            </Text>
          ) : null}
        </View>

        <View style={[styles.appDisclaimerBox, { backgroundColor: colors.surfaceAlt, borderColor: 'rgba(255,255,255,0.06)' }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <View style={styles.appDisclaimerContent}>
            <Text style={[styles.appDisclaimerText, { color: colors.textPrimary }]}>
              {t('common.appDisclaimer')}
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

        {/* Bouton ANNULER : l'écran est un modal plein écran SANS header ni tab
            bar → sans ça l'utilisateur reste bloqué (aucun moyen visible de
            sortir). Retour à l'écran précédent (qui a le menu), avec repli sur
            l'accueil si la pile est vide. */}
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.accent, backgroundColor: colors.surface }]}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/home');
          }}
          disabled={isSubmitting}
        >
          <Text style={[styles.cancelButtonText, { color: colors.accent }]}>
            {t('common.cancel')}
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
  modeSwitch: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 20
  },
  modeSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10
  },
  modeSegmentText: { fontSize: 13, fontWeight: '700' },
  modeHelp: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8
  },
  bestByPreview: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10
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
  cancelButton: {
    marginTop: 14,
    marginBottom: 8,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
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
