import { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Scanner } from '../components/Scanner';
import { performOcr, performOcrForBrand } from '../services/ocrService';
import { fetchRecallsByCountry } from '../services/apiService';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';
import { DEFAULT_BRAND_NAME } from '../constants/defaults';
import { addCustomBrand } from '../services/customBrandsService';
import { addBrandToFirestore } from '../services/firestoreBrandsService';

type Step = 'brand' | 'lot';

export function ScanScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { addProduct, updateRecall } = useScannedProducts();
  const country = usePreferencesStore((state) => state.country);
  const [step, setStep] = useState<Step>('brand');
  const [brandCaptured, setBrandCaptured] = useState(false);
  const [brandText, setBrandText] = useState('');
  const [brandConfidence, setBrandConfidence] = useState(0);
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [brandIsKnown, setBrandIsKnown] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationStep, setConfirmationStep] = useState<Step | null>(null);
  const [isConfirmModalVisible, setConfirmModalVisible] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const brandMutation = useMutation({
    mutationFn: async (brandPhoto: string) => {
      console.log('[Brand] Starting OCR for brand photo:', brandPhoto);
      setErrorMessage('');

      console.log('[Brand] Calling performOcrForBrand...');
      const result = await performOcrForBrand(brandPhoto);
      console.log('[Brand] OCR result:', result);

      const { brand, confidence, isKnownBrand, suggestions } = result;
      setBrandText(brand);
      setBrandConfidence(confidence);
      setBrandSuggestions(suggestions || []);
      setBrandIsKnown(isKnownBrand);

      if (!isKnownBrand && suggestions && suggestions.length > 0) {
        console.log(`⚠️ Brand not recognized with high confidence. Suggestions: ${suggestions.join(', ')}`);
      }

      return { brand };
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : t('scan.errors.brandCaptureFailed'));
      setBrandText(t('common.unknown'));
    },
    onSuccess: () => {
      setBrandCaptured(true);
      setConfirmationStep('brand');
      setConfirmModalVisible(true);
    }
  });

  const lotMutation = useMutation({
    mutationFn: async (lotPhoto: string) => {
      setErrorMessage('');
      const { lot, result } = await performOcr(lotPhoto);
      setOcrText(result.text);
      setLotNumber(lot);

      if (!lot) {
        throw new Error(t('scan.errors.lotExtractFailed'));
      }

    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : t('scan.errors.scanFailed'));
    },
    onSuccess: () => {
      setConfirmationStep('lot');
      setConfirmModalVisible(true);
    }
  });

  const resetFlow = useCallback(() => {
    setBrandCaptured(false);
    setBrandText('');
    setBrandConfidence(0);
    setBrandSuggestions([]);
    setBrandIsKnown(false);
    setOcrText('');
    setLotNumber('');
    setErrorMessage('');
    setStep('brand');
    setConfirmationStep(null);
    setConfirmModalVisible(false);
  }, []);

  const selectSuggestion = useCallback((suggestion: string) => {
    setBrandText(suggestion);
    setBrandConfidence(0.95);
    setBrandSuggestions([]);
    setBrandIsKnown(true);
  }, []);

  const handleCapture = useCallback(
    async (uri: string) => {
      if (step === 'brand') {
        try {
          await brandMutation.mutateAsync(uri);
        } finally {
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          } catch (error) {
            console.warn('Failed to delete brand capture', error);
          }
        }
        return;
      }

      if (step === 'lot') {
        if (!brandCaptured) {
          setErrorMessage(t('scan.errors.brandFirst'));
          setStep('brand');
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          } catch (error) {
            console.warn('Failed to delete unexpected capture', error);
          }
          return;
        }

        try {
          await lotMutation.mutateAsync(uri);
        } finally {
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          } catch (error) {
            console.warn('Failed to delete lot capture', error);
          }
        }
      }
    },
    [brandCaptured, brandMutation, lotMutation, step, t]
  );

  const isProcessing = brandMutation.isPending || lotMutation.isPending || isFinalizing;
  const stepLabel = step === 'brand' ? t('scan.brandStep') : t('scan.lotStep');
  const stepInstruction = isProcessing
    ? step === 'brand'
      ? t('scan.brandAnalyzing')
      : t('scan.lotAnalyzing')
    : step === 'brand'
      ? t('scan.brandInstruction')
      : t('scan.lotInstruction');

  const resetDisabled = isProcessing;

  const getBrandStatusColor = () => {
    if (!brandText) return colors.textSecondary;
    if (brandConfidence >= 0.85) return colors.success;
    if (brandConfidence >= 0.7) return colors.warning;
    return colors.textSecondary;
  };

  const handleConfirm = useCallback(async () => {
    if (!confirmationStep) return;
    if (confirmationStep === 'brand') {
      setIsFinalizing(true);
      try {
        if (!brandIsKnown && brandText && brandText !== DEFAULT_BRAND_NAME) {
          await addCustomBrand(brandText);
          await addBrandToFirestore(brandText);
        }
      } catch (error) {
        console.warn('Failed to persist brand', error);
      } finally {
        setConfirmModalVisible(false);
        setStep('lot');
        setConfirmationStep(null);
        setIsFinalizing(false);
      }
      return;
    }

    if (confirmationStep === 'lot') {
      if (!lotNumber) {
        setErrorMessage(t('scan.errors.lotExtractFailed'));
        setConfirmModalVisible(false);
        return;
      }

      setIsFinalizing(true);
      try {
        const recalls = await fetchRecallsByCountry(country);
        const product = await addProduct({
          brand: brandText || DEFAULT_BRAND_NAME,
          lotNumber
        });

        await updateRecall(product, recalls);

        const productId = product.id;
        resetFlow();
        router.push({ pathname: '/details/[id]', params: { id: productId } });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : t('scan.errors.scanFailed'));
      } finally {
        setConfirmModalVisible(false);
        setConfirmationStep(null);
        setIsFinalizing(false);
      }
    }
  }, [
    addBrandToFirestore,
    addCustomBrand,
    addProduct,
    brandIsKnown,
    brandText,
    confirmationStep,
    country,
    fetchRecallsByCountry,
    lotNumber,
    resetFlow,
    router,
    t,
    updateRecall
  ]);

  const handleRestart = useCallback(() => {
    if (confirmationStep === 'brand') {
      resetFlow();
    } else if (confirmationStep === 'lot') {
      setLotNumber('');
      setOcrText('');
      setErrorMessage('');
      setStep('lot');
    }
    setConfirmModalVisible(false);
    setConfirmationStep(null);
  }, [confirmationStep, resetFlow]);

  const handleManualFromModal = useCallback(() => {
    setConfirmModalVisible(false);
    resetFlow();
    router.push('/manual-entry');
  }, [resetFlow, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Scanner onCapture={handleCapture} isProcessing={isProcessing} />

      <ScrollView style={styles.feedback} contentContainerStyle={styles.feedbackContent}>
        <View
          style={[
            styles.instructions,
            step === 'brand'
              ? {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accent,
                  shadowColor: colors.accent
                }
              : {
                  backgroundColor: 'rgba(255,200,87,0.18)',
                  borderColor: colors.warning,
                  shadowColor: colors.warning
                }
          ]}
        >
          <Text
            style={[
              styles.stepLabel,
              { color: step === 'brand' ? colors.accent : colors.warning }
            ]}
          >
            {stepLabel}
          </Text>
          <Text
            style={[
              styles.instructionText,
              step === 'brand' && styles.instructionHighlight,
              { color: colors.textPrimary }
            ]}
          >
            {stepInstruction}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: brandCaptured ? colors.surface : colors.surfaceAlt,
                borderColor: brandCaptured ? colors.accent : colors.surfaceAlt
              }
            ]}
          >
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{t('scan.brandLabel')}</Text>
            <Text style={[styles.statusValue, { color: getBrandStatusColor() }]}>
              {brandText || (brandMutation.isPending ? t('scan.analyzing') : t('scan.waiting'))}
            </Text>
            {brandConfidence > 0 && brandConfidence < 0.85 && (
              <Text style={[styles.confidenceText, { color: colors.warning }]}>
                {t('scan.confidence', { value: (brandConfidence * 100).toFixed(0) })}
              </Text>
            )}
          </View>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: lotNumber ? colors.surface : colors.surfaceAlt,
                borderColor: lotNumber ? colors.accent : colors.surfaceAlt
              }
            ]}
          >
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{t('scan.lotLabel')}</Text>
            <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
              {lotNumber || (lotMutation.isPending ? t('scan.analyzing') : t('scan.waiting'))}
            </Text>
          </View>
        </View>

        {brandSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={[styles.suggestionsTitle, { color: colors.textSecondary }]}>
              {t('scan.suggestions')}
            </Text>
            <View style={styles.suggestionsRow}>
              {brandSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestionChip, { backgroundColor: colors.surface, borderColor: colors.accent }]}
                  onPress={() => selectSuggestion(suggestion)}
                >
                  <Text style={[styles.suggestionText, { color: colors.accent }]}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 'lot' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('scan.ocrExtraction')}</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              {ocrText || t('scan.waitingForCapture')}
            </Text>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('scan.detectedLot')}</Text>
            <Text style={[styles.lotText, { color: colors.accent }]}>{lotNumber || '--'}</Text>
          </>
        )}

        {errorMessage ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: colors.surface, opacity: resetDisabled ? 0.5 : 1 }]}
          onPress={resetFlow}
          disabled={resetDisabled}
        >
          <Text style={[styles.resetText, { color: colors.textPrimary }]}>{t('scan.restart')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.manualButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/manual-entry')}
        >
          <Text style={[styles.manualButtonText, { color: colors.textPrimary }]}>{t('scan.manualEntry')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={isConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {confirmationStep === 'brand' ? t('scan.confirmBrandTitle') : t('scan.confirmLotTitle')}
            </Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              {confirmationStep === 'brand'
                ? t('scan.confirmBrandMessage', { brand: brandText || t('common.unknown') })
                : t('scan.confirmLotMessage', { lot: lotNumber || t('common.unknown') })}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}
                onPress={handleRestart}
                disabled={isFinalizing}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                  {t('scan.restart')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.accent }]}
                onPress={handleConfirm}
                disabled={isFinalizing}
              >
                <Text style={[styles.modalButtonText, { color: colors.surface }]}>
                  {t('scan.validate')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.manualModalButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.accent
                }
              ]}
              onPress={handleManualFromModal}
              disabled={isFinalizing}
            >
              <Text style={[styles.manualModalButtonText, { color: colors.accent }]}>
                {t('scan.manualEntry')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  feedback: {
    maxHeight: 380,
    paddingHorizontal: 24
  },
  feedbackContent: {
    paddingVertical: 16,
    gap: 16
  },
  instructions: {
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '700'
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 22
  },
  instructionHighlight: {
    fontWeight: '800'
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12
  },
  statusPill: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  statusValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700'
  },
  confidenceText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600'
  },
  suggestionsContainer: {
    gap: 8
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600'
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700'
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22
  },
  lotText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1.1
  },
  errorText: {
    fontSize: 15,
    marginTop: 8
  },
  resetButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center'
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600'
  },
  manualButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center'
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContent: {
    width: '92%',
    maxHeight: '90%',
    borderRadius: 22,
    padding: 24,
    gap: 14
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800'
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 22
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center'
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '700'
  },
  manualModalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 12
  },
  manualModalButtonText: {
    fontSize: 15,
    fontWeight: '700'
  }
});
