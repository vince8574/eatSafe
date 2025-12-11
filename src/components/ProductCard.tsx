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
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.brand, { color: colors.textPrimary }]}>{product.brand}</Text>
          <View
            style={[
              styles.statusTag,
              {
                backgroundColor: statusColors[product.recallStatus]
              }
            ]}
          >
            <View style={styles.statusHighlight} />
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
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    borderRadius: 24,
    padding: 20
  },
  content: {
    flex: 1
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
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4
  },
  statusHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(255,255,255,0.3)'
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
    marginBottom: 16,
    padding: 12
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20
  },
  removeButton: {
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center'
  },
  removeText: {
    fontSize: 14,
    fontWeight: '600'
  }
});
