import { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../theme/themeContext';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { useQuery } from '@tanstack/react-query';
import { fetchAllRecalls } from '../services/apiService';
import { RecallAlert } from '../components/RecallAlert';
import { extractRecallReason } from '../utils/recallUtils';

export function DetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, removeProduct } = useScannedProducts();
  const { data: recalls } = useQuery({
    queryKey: ['recalls'],
    queryFn: fetchAllRecalls
  });

  const product = useMemo(() => products.find((item) => item.id === id), [id, products]);
  const recall = useMemo(
    () => recalls?.find((item) => item.id === product?.recallReference),
    [product?.recallReference, recalls]
  );
  const recallReason = useMemo(() => recall ? extractRecallReason(recall) : undefined, [recall]);
  const isRecalled = product?.recallStatus === 'recalled';

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.missingText, { color: colors.textSecondary }]}>
          Produit introuvable ou supprimé.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Alerte de rappel en haut si le produit est contaminé */}
        {isRecalled && recall && (
          <RecallAlert recall={recall} reason={recallReason} />
        )}

        <View style={[styles.infoBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Les photos prises pendant le scan sont traitées localement puis supprimées immédiatement. Seuls la marque et
            le numéro de lot sont conservés sur cet appareil.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.brand, { color: colors.textPrimary }]}>{product.brand}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Numéro de lot</Text>
          <Text style={[styles.lot, { color: colors.accent }]}>{product.lotNumber}</Text>
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Statut rappel</Text>
          <Text style={[styles.status, getStatusColor(product.recallStatus, colors)]}>
            {getStatusLabel(product.recallStatus)}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Dernière vérification</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {product.lastCheckedAt
              ? new Date(product.lastCheckedAt).toLocaleString('fr-FR')
              : 'Jamais'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: colors.danger }]}
          onPress={async () => {
            await removeProduct(product.id);
            router.back();
          }}
        >
          <Text style={styles.deleteText}>Supprimer le scan</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'recalled':
      return '🚨 RAPPELÉ - NE PAS CONSOMMER';
    case 'safe':
      return '✅ SÉCURITAIRE';
    case 'warning':
      return '⚠️ AVERTISSEMENT';
    default:
      return '❓ INCONNU';
  }
}

function getStatusColor(status: string, colors: any) {
  switch (status) {
    case 'recalled':
      return { color: colors.danger };
    case 'safe':
      return { color: colors.success };
    case 'warning':
      return { color: colors.warning };
    default:
      return { color: colors.textSecondary };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  content: {
    padding: 24,
    gap: 24
  },
  card: {
    borderRadius: 24,
    padding: 24
  },
  infoBox: {
    borderRadius: 20,
    padding: 18
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22
  },
  brand: {
    fontSize: 24,
    fontWeight: '800'
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12
  },
  lot: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8
  },
  status: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8
  },
  value: {
    fontSize: 16,
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12
  },
  link: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600'
  },
  deleteButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 'auto'
  },
  deleteText: {
    fontSize: 16,
    color: '#0A1F1F',
    fontWeight: '700'
  },
  missingText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16
  }
});
