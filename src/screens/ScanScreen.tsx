import { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Scanner } from '../components/Scanner';
import { performOcr } from '../services/ocrService';
import { fetchRecallsByCountry } from '../services/apiService';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useTheme } from '../theme/themeContext';

type Step = 'brand' | 'lot';

export function ScanScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { addProduct, updateRecall } = useScannedProducts();
  const country = usePreferencesStore((state) => state.country);
  const [step, setStep] = useState<Step>('brand');
  const [brandCaptured, setBrandCaptured] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const mutation = useMutation({
    mutationFn: async (lotPhoto: string) => {
      setErrorMessage('');
      const { lot, result } = await performOcr(lotPhoto);
      setOcrText(result.text);
      setLotNumber(lot);

      if (!lot) {
        throw new Error("Impossible d'extraire le numero de lot automatiquement.");
      }

      const recalls = await fetchRecallsByCountry(country);
      const product = await addProduct({
        brand: 'Produit scanne',
        lotNumber: lot
      });

      const status = await updateRecall(product, recalls);
      return { productId: product.id, status };
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : 'Le scan a echoue.');
      setStep('lot');
    },
    onSuccess: ({ productId }) => {
      setOcrText('');
      setLotNumber('');
      setErrorMessage('');
      setBrandCaptured(false);
      setStep('brand');
      router.push({ pathname: '/details/[id]', params: { id: productId } });
    }
  });

  const resetFlow = useCallback(() => {
    setBrandCaptured(false);
    setOcrText('');
    setLotNumber('');
    setErrorMessage('');
    setStep('brand');
  }, []);

  const handleCapture = useCallback(
    async (uri: string) => {
      if (step === 'brand') {
        setBrandCaptured(true);
        setOcrText('');
        setLotNumber('');
        setErrorMessage('');
        setStep('lot');

        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (error) {
          console.warn('Failed to delete brand capture', error);
        }

        return;
      }

      if (!brandCaptured) {
        setErrorMessage("Capturez d'abord la marque avant le numero de lot.");
        setStep('brand');
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (error) {
          console.warn('Failed to delete unexpected capture', error);
        }
        return;
      }

      try {
        await mutation.mutateAsync(uri);
      } finally {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (error) {
          console.warn('Failed to delete lot capture', error);
        }
      }
    },
    [brandCaptured, mutation, step]
  );

  const stepLabel = step === 'brand' ? 'Etape 1/2' : 'Etape 2/2';
  const stepInstruction =
    mutation.isPending
      ? 'Analyse du numero de lot en cours...'
      : step === 'brand'
        ? 'Cadrez la marque du produit (photo supprimee apres capture).'
        : 'Cadrez clairement le numero de lot et capturez la photo.';

  const resetDisabled = mutation.isPending && step === 'lot';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Scanner onCapture={handleCapture} isProcessing={mutation.isPending} />

      <ScrollView style={styles.feedback} contentContainerStyle={styles.feedbackContent}>
        <View style={styles.instructions}>
          <Text style={[styles.stepLabel, { color: colors.accent }]}>{stepLabel}</Text>
          <Text style={[styles.instructionText, { color: colors.textPrimary }]}>{stepInstruction}</Text>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Les photos sont traitee uniquement en local puis supprimees immediatement. Aucune image n'est stockee sur
            l'appareil.
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
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Marque</Text>
            <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
              {brandCaptured ? 'Capture realisee' : 'En attente'}
            </Text>
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
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Lot</Text>
            <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
              {lotNumber ? 'Numero detecte' : mutation.isPending ? 'Analyse...' : 'En attente'}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Extraction OCR</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          {ocrText || 'En attente de capture...'}
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Numero de lot detecte</Text>
        <Text style={[styles.lotText, { color: colors.accent }]}>{lotNumber || '--'}</Text>

        {errorMessage ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: colors.surface, opacity: resetDisabled ? 0.5 : 1 }]}
          onPress={resetFlow}
          disabled={resetDisabled}
        >
          <Text style={[styles.resetText, { color: colors.textPrimary }]}>Recommencer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.manualButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/manual-entry')}
        >
          <Text style={[styles.manualButtonText, { color: colors.textPrimary }]}>Saisie manuelle du lot</Text>
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
    maxHeight: 320,
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
  infoBox: {
    borderRadius: 16,
    padding: 14
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20
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
