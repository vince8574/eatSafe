import { memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { ScannedProduct } from '../types';
import { useTheme } from '../theme/themeContext';

type ProductCardProps = {
  product: ScannedProduct;
  onPress?: (product: ScannedProduct) => void;
  onRemove?: (product: ScannedProduct) => void;
};

const statusLabels: Record<ScannedProduct['recallStatus'], string> = {
  unknown: 'Analyse en cours',
  safe: 'Aucun rappel connu',
  recalled: 'Produit rappelé',
  warning: 'A surveiller'
};

const statusColors = {
  unknown: '#FFC857',
  safe: '#35F2A9',
  recalled: '#FF647C',
  warning: '#FFC857'
};

export const ProductCard = memo(({ product, onPress, onRemove }: ProductCardProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => onPress?.(product)}
      style={[styles.container, { backgroundColor: colors.surface }]}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <Text style={[styles.brand, { color: colors.textPrimary }]}>{product.brand}</Text>
        <View style={[styles.statusTag, { backgroundColor: statusColors[product.recallStatus] }]}>
          <Text style={styles.statusText}>{statusLabels[product.recallStatus]}</Text>
        </View>
      </View>

      <Text style={[styles.lot, { color: colors.textSecondary }]}>Lot {product.lotNumber}</Text>
      <Text style={[styles.date, { color: colors.textSecondary }]}>
        Scanné le {new Date(product.scannedAt).toLocaleDateString()}
      </Text>

      {product.photoUri ? (
        <Image source={{ uri: product.photoUri }} style={styles.photo} />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>Photo non disponible</Text>
        </View>
      )}

      {onRemove && (
        <TouchableOpacity
          onPress={() => onRemove(product)}
          style={[styles.removeButton, { backgroundColor: colors.surfaceAlt }]}
        >
          <Text style={[styles.removeText, { color: colors.textSecondary }]}>Supprimer</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 18
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  brand: {
    fontSize: 20,
    fontWeight: '700'
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0C1413',
    textTransform: 'uppercase'
  },
  lot: {
    fontSize: 16,
    marginBottom: 4
  },
  date: {
    fontSize: 13,
    marginBottom: 16
  },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 16
  },
  placeholder: {
    height: 160,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  placeholderText: {
    fontSize: 13
  },
  removeButton: {
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center'
  },
  removeText: {
    fontSize: 14,
    fontWeight: '600'
  }
});
