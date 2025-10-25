import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Scanner } from '../components/Scanner';
import { performOcr } from '../services/ocrService';
import { fetchRecallsByCountry } from '../services/apiService';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useTheme } from '../theme/themeContext';

export function ScanScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { addProduct, updateRecall } = useScannedProducts();
  const country = usePreferencesStore((state) => state.country);
  const [ocrText, setOcrText] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const mutation = useMutation({
    mutationFn: async (uri: string) => {
      setErrorMessage('');
      const { lot, result } = await performOcr(uri);
      setOcrText(result.text);
      setLotNumber(lot);

      if (!lot) {
        throw new Error("Impossible d'extraire le numéro de lot automatiquement.");
      }

      const recalls = await fetchRecallsByCountry(country);
      const product = await addProduct({
        brand: 'Produit scanné',
        lotNumber: lot,
        country,
        photoUri: uri
      });

      const status = await updateRecall(product, recalls);
      return { productId: product.id, status };
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : 'Le scan a échoué.');
    },
    onSuccess: ({ productId }) => {
      router.push({ pathname: '/details/[id]', params: { id: productId } });
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Scanner
        onCapture={(uri) => mutation.mutateAsync(uri)}
        isProcessing={mutation.isPending}
      />

      <ScrollView style={styles.feedback} contentContainerStyle={styles.feedbackContent}>
        <Text style={[styles.feedbackTitle, { color: colors.textPrimary }]}>Extraction OCR</Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{ocrText || 'En attente de scan...'}</Text>

        <Text style={[styles.feedbackTitle, { color: colors.textPrimary }]}>Numéro de lot</Text>
        <Text style={[styles.lotText, { color: colors.accent }]}>{lotNumber || '--'}</Text>

        {errorMessage ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.manualButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/manual-entry')}
        >
          <Text style={[styles.manualButtonText, { color: colors.textPrimary }]}>
            Saisie manuelle du lot
          </Text>
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
    maxHeight: 260,
    paddingHorizontal: 24
  },
  feedbackContent: {
    paddingVertical: 16
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16
  },
  paragraph: {
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22
  },
  lotText: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    letterSpacing: 1.1
  },
  errorText: {
    marginTop: 12,
    fontSize: 15
  },
  manualButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center'
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600'
  }
});
