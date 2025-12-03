import { memo, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { ScannedProduct } from '../types';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';

type ProductCardProps = {
  product: ScannedProduct;
  onPress?: (product: ScannedProduct) => void;
  onRemove?: (product: ScannedProduct) => void;
};

const statusColors = {
  unknown: '#FFC857',
  safe: '#35F2A9',
  recalled: '#FF647C',
  warning: '#FFC857'
};

export const ProductCard = memo(({ product, onPress, onRemove }: ProductCardProps) => {
  const { colors } = useTheme();
  const { t, locale } = useI18n();

  const statusLabels = useMemo(
    () => ({
      unknown: t('recallStatus.unknown'),
      safe: t('recallStatus.safe'),
      recalled: t('recallStatus.recalled'),
      warning: t('recallStatus.warning')
    }),
    [t, locale]
  );

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

      <Text style={[styles.lot, { color: colors.textSecondary }]}>
        {t('productCard.lot', { lot: product.lotNumber })}
      </Text>
      <Text style={[styles.date, { color: colors.textSecondary }]}>
        {t('productCard.scannedAt', {
          date: new Date(product.scannedAt).toLocaleDateString(locale || undefined)
        })}
      </Text>

      <View style={[styles.infoBox, { backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          {t('productCard.privacy')}
        </Text>
      </View>

      {onRemove && (
        <TouchableOpacity
          onPress={() => onRemove(product)}
          style={[styles.removeButton, { backgroundColor: colors.surfaceAlt }]}
        >
          <Text style={[styles.removeText, { color: colors.textSecondary }]}>
            {t('common.delete')}
          </Text>
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
  infoBox: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 16
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20
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
