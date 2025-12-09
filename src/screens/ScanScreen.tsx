import { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
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
  const [ocrText, setOcrText] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
      setStep('lot');
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

      const recalls = await fetchRecallsByCountry(country);
      const product = await addProduct({
        brand: brandText || DEFAULT_BRAND_NAME,
        lotNumber: lot
      });

      const status = await updateRecall(product, recalls);
      return { productId: product.id, status };
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : t('scan.errors.scanFailed'));
    },
    onSuccess: ({ productId }) => {
      setOcrText('');
      setLotNumber('');
      setErrorMessage('');
      setBrandCaptured(false);
      setBrandText('');
      setBrandConfidence(0);
      setBrandSuggestions([]);
      setStep('brand');
      router.push({ pathname: '/details/[id]', params: { id: productId } });
    }
  });

  const resetFlow = useCallback(() => {
    setBrandCaptured(false);
    setBrandText('');
    setBrandConfidence(0);
    setBrandSuggestions([]);
    setOcrText('');
    setLotNumber('');
    setErrorMessage('');
    setStep('brand');
  }, []);

  const selectSuggestion = useCallback((suggestion: string) => {
    setBrandText(suggestion);
    setBrandConfidence(0.95);
    setBrandSuggestions([]);
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
    [brandCaptured, brandMutation, lotMutation, step]
  );

  const isProcessing = brandMutation.isPending || lotMutation.isPending;
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Scanner onCapture={handleCapture} isProcessing={isProcessing} />

      <ScrollView style={styles.feedback} contentContainerStyle={styles.feedbackContent}>
        <View style={styles.instructions}>
          <Text style={[styles.stepLabel, { color: colors.accent }]}>{stepLabel}</Text>
          <Text style={[styles.instructionText, { color: colors.textPrimary }]}>{stepInstruction}</Text>
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
    gap: 6
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '700'
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 22
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
  }
});