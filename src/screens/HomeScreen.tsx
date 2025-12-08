import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ProductCard } from '../components/ProductCard';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';

export function HomeScreen() {
  const { colors, typography } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { products, isLoading, refetch } = useScannedProducts();

  const stats = useMemo(() => {
    const total = products.length;
    const recalled = products.filter((product) => product.recallStatus === 'recalled').length;
    const pending = products.filter((product) => product.recallStatus === 'unknown').length;

    return { total, recalled, pending };
  }, [products]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.titleContainer}>
              <Image
                source={require('../../assets/logo_eatsok.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text
                style={[styles.title, { color: colors.textPrimary, fontSize: typography.title }]}
              >
                {t('home.title')}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('home.subtitle')}
            </Text>

            <View style={styles.statsContainer}>
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/history')}
              >
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.total}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home.stats.scanned')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push({ pathname: '/history', params: { filter: 'recalled' } })}
              >
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.recalled}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home.stats.recalled')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push({ pathname: '/history', params: { filter: 'unknown' } })}
              >
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.pending}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('home.stats.pending')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('home.historyTitle')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('home.emptyState')}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor={colors.accent} />
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  logo: {
    width: 40,
    height: 40
  },
  title: {
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 24
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    marginRight: 12,
    padding: 16
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800'
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 18
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22
  }
});
