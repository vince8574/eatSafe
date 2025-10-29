import { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../theme/themeContext';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { useQuery } from '@tanstack/react-query';
import { fetchAllRecalls } from '../services/apiService';

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
  const recallLink = recall?.link ?? null;

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.brand, { color: colors.textPrimary }]}>{product.brand}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Numéro de lot</Text>
        <Text style={[styles.lot, { color: colors.accent }]}>{product.lotNumber}</Text>
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Statut rappel</Text>
        <Text style={[styles.status, { color: colors.textPrimary }]}>{product.recallStatus.toUpperCase()}</Text>
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Dernière vérification</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {product.lastCheckedAt
            ? new Date(product.lastCheckedAt).toLocaleString()
            : 'Jamais'}
        </Text>
      </View>

      {recall ? (
        <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Détails rappel</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{recall.title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{recall.description}</Text>

          {recallLink ? (
            <TouchableOpacity onPress={() => Linking.openURL(recallLink)}>
              <Text style={[styles.link, { color: colors.accent }]}>Ouvrir la fiche officielle</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 24
  },
  card: {
    borderRadius: 24,
    padding: 24
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
