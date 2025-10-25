import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { useTheme } from '../theme/themeContext';
import { ScannedProduct } from '../types';

type Filter = 'all' | 'recalled' | 'safe' | 'unknown';

export function HistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { products } = useScannedProducts();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') {
      return products;
    }
    return products.filter((product) => product.recallStatus === filter);
  }, [filter, products]);

  const renderItem = ({ item }: { item: ScannedProduct }) => (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.surface }]}
      onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.id } })}
    >
      <View style={styles.itemHeader}>
        <Text style={[styles.brand, { color: colors.textPrimary }]}>{item.brand}</Text>
        <Text style={[styles.status, { color: colors.accent }]}>{item.recallStatus.toUpperCase()}</Text>
      </View>
      <Text style={[styles.lot, { color: colors.textSecondary }]}>Lot {item.lotNumber}</Text>
      <Text style={[styles.date, { color: colors.textSecondary }]}>
        {new Date(item.scannedAt).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Historique complet</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Filtrez vos scans selon leur statut rappel.
            </Text>

            <View style={styles.filters}>
              {(['all', 'recalled', 'safe', 'unknown'] as Filter[]).map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: filter === item ? colors.accentSoft : colors.surfaceAlt,
                      borderColor: filter === item ? colors.accent : colors.surfaceAlt
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: filter === item ? colors.accent : colors.textSecondary }
                    ]}
                  >
                    {item.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune donnée disponible. Lancez un scan pour alimenter l'historique.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  list: {
    padding: 24
  },
  title: {
    fontSize: 26,
    fontWeight: '700'
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 18
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700'
  },
  item: {
    padding: 18,
    borderRadius: 18,
    marginBottom: 16
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  brand: {
    fontSize: 18,
    fontWeight: '700'
  },
  status: {
    fontSize: 12,
    fontWeight: '700'
  },
  lot: {
    fontSize: 16
  },
  date: {
    fontSize: 13,
    marginTop: 8
  },
  empty: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 24
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24
  }
});
