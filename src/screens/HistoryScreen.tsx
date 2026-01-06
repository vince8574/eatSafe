import { useMemo, useState, useCallback, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { useTheme } from '../theme/themeContext';
import { ScannedProduct } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { StatusTag } from '../components/StatusTag';
import { GradientBackground } from '../components/GradientBackground';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { checkAllProductsForRecalls } from '../services/recallCheckService';
import * as Notifications from 'expo-notifications';
import { useSubscription } from '../hooks/useSubscription';
import { enableExportForTesting } from '../services/subscriptionService';
import { exportProducts, canExport as canExportFormat, ExportFormat } from '../services/exportService';
import { Ionicons } from '@expo/vector-icons';
import { cleanOldScans } from '../services/historyRetentionService';

type Filter = 'all' | 'recalled' | 'safe' | 'unknown';

export function HistoryScreen() {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { products, updateRecall } = useScannedProducts();
  const { subscription, loading: subLoading } = useSubscription();
  const country = usePreferencesStore((state) => state.country);
  const [filter, setFilter] = useState<Filter>('all');
  const [isCheckingRecalls, setIsCheckingRecalls] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Enable export for testing on mount
  useEffect(() => {
    enableExportForTesting().catch(console.error);
  }, []);

  // Nettoyage automatique de l'historique selon le plan
  useEffect(() => {
    if (subscription) {
      cleanOldScans(subscription)
        .then((deletedCount) => {
          if (deletedCount > 0) {
            console.log(`[HistoryScreen] Cleaned ${deletedCount} expired scan(s)`);
          }
        })
        .catch((error) => {
          console.error('[HistoryScreen] Error cleaning old scans:', error);
        });
    }
  }, [subscription]);

  const formatDate = useCallback(
    (value: string | number) => {
      const date = new Date(value);
      return {
        date: date.toLocaleDateString(locale || undefined),
        time: date.toLocaleTimeString(locale || undefined, { hour: '2-digit', minute: '2-digit' })
      };
    },
    [locale]
  );

  const statusLabels: Record<ScannedProduct['recallStatus'], string> = {
    safe: t('recallStatus.safe'),
    recalled: t('recallStatus.recalled'),
    unknown: t('recallStatus.unknown'),
    warning: t('recallStatus.warning')
  };

  // Automatic recall checking when screen is focused
  useFocusEffect(
    useCallback(() => {
      async function checkForNewRecalls() {
        if (products.length === 0) return;

        setIsCheckingRecalls(true);
        console.log('[HistoryScreen] Checking for new recalls...');

        try {
          const results = await checkAllProductsForRecalls(products, country);

          if (results.length > 0) {
            console.log(`[HistoryScreen] Found ${results.length} products with status changes`);

            // Update each product with new recalls
            for (const result of results) {
              if (result.newRecalls.length > 0) {
                // Product now has recalls
                const product = products.find((p) => p.id === result.productId);
                if (product) {
                  updateRecall(product, result.newRecalls);
                }

                // Send notification
                if (product) {
                  await Notifications.scheduleNotificationAsync({
                    content: {
                      title: t('notifications.newRecallTitle'),
                      body: t('notifications.newRecallBody', {
                        brand: product.brand,
                        lot: product.lotNumber
                      })
                    },
                    trigger: null
                  });
                }
              } else {
                // Product no longer recalled (rare case)
                console.log(
                  `[HistoryScreen] Product ${result.productId} is no longer recalled`
                );
              }
            }
          } else {
            console.log('[HistoryScreen] No status changes detected');
          }
        } catch (error) {
          console.error('[HistoryScreen] Error checking recalls:', error);
        } finally {
          setIsCheckingRecalls(false);
        }
      }

      checkForNewRecalls();
    }, [products, country, updateRecall, t])
  );

  const filtered = useMemo(() => {
    if (filter === 'all') {
      return products;
    }
    return products.filter((product) => product.recallStatus === filter);
  }, [filter, products]);

  const canExport = subscription?.exportEnabled === true;
  const exportFormats = subscription?.exportFormats || [];
  const regulatoryFormat = subscription?.regulatoryFormat || false;

  const handleOpenExportModal = useCallback(() => {
    if (!canExport) {
      Alert.alert('Export réservé', 'L\'export est disponible avec un forfait incluant l\'option export.');
      return;
    }

    if (filtered.length === 0) {
      Alert.alert('Aucune donnée', 'Il n\'y a rien à exporter pour l\'instant.');
      return;
    }

    setShowExportModal(true);
  }, [canExport, filtered]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!canExportFormat(format, exportFormats)) {
      Alert.alert('Format non disponible', `Le format ${format.toUpperCase()} n'est pas inclus dans votre forfait.`);
      return;
    }

    try {
      setIsExporting(true);
      setShowExportModal(false);

      await exportProducts({
        products: filtered,
        format,
        regulatoryFormat
      });

      Alert.alert('Export réussi', `Le fichier ${format.toUpperCase()} a été généré et est prêt à être partagé.`);
    } catch (error) {
      console.error('[HistoryScreen] Export error', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de générer le fichier export.');
    } finally {
      setIsExporting(false);
    }
  }, [filtered, exportFormats, regulatoryFormat]);

  const renderItem = ({ item }: { item: ScannedProduct }) => {
    const scannedAt = formatDate(item.scannedAt);

    return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.surface }]}
      onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.id } })}
    >
      <View style={styles.itemContent}>
        {item.productImage ? (
          <Image
            source={{ uri: item.productImage }}
            style={styles.productThumbnail}
            resizeMode="contain"
          />
        ) : null}
        <View style={styles.itemDetails}>
          {item.productName ? (
            <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>
              {item.productName}
            </Text>
          ) : null}
          <View style={styles.itemHeader}>
            <Text style={[styles.brand, { color: colors.textPrimary }]}>{item.brand}</Text>
            <StatusTag status={item.recallStatus} label={statusLabels[item.recallStatus]} />
          </View>
          <Text style={[styles.dataDisclaimer, { color: colors.textSecondary }]}>
            {t('common.dataDisclaimer')}
          </Text>
          <Text style={[styles.lot, { color: colors.textSecondary }]}>
            {t('productCard.lot', { lot: item.lotNumber })}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {t('productCard.scannedAt', scannedAt)}
          </Text>
          <Text style={[styles.noRecallDisclaimer, { color: colors.textSecondary }]}>
            {t('common.noRecallDisclaimer')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <GradientBackground>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.titleContainer}>
              <Image
                source={require('../../assets/logo_eatsok.png')}
                style={styles.logo}
                resizeMode="cover"
              />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('history.fullTitle')}
              </Text>
              {isCheckingRecalls && (
                <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
              )}
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('history.subtitle')}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  {
                    backgroundColor: canExport ? colors.surface : colors.surfaceAlt,
                    borderColor: canExport ? colors.accent : colors.surfaceAlt,
                    opacity: isExporting ? 0.6 : 1
                  }
                ]}
                onPress={handleOpenExportModal}
                disabled={!canExport || isExporting || subLoading}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color={canExport ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.exportButtonText, { color: canExport ? colors.accent : colors.textSecondary }]}>
                      Exporter l'historique
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {!canExport && !subLoading ? (
                <Text style={[styles.exportInfo, { color: colors.textSecondary }]}>
                  Disponible avec un forfait incluant l'export
                </Text>
              ) : null}
            </View>

            <View style={styles.filters}>
              {(['all', 'recalled', 'safe', 'unknown'] as Filter[]).map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: filter === item ? colors.accent : colors.surfaceAlt,
                      borderColor: filter === item ? colors.accent : colors.surfaceAlt
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: filter === item ? colors.surface : colors.textSecondary }
                    ]}
                  >
                    {t(`history.filters.${item}`)}
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
              {t('history.emptyStateDetailed')}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={[styles.appDisclaimerBox, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.appDisclaimerText, { color: colors.textSecondary }]}>
              ⚠️ {t('common.appDisclaimer')}
            </Text>
          </View>
        }
      />

      {/* Modale d'export */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Choisir le format d'export
            </Text>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {regulatoryFormat ? 'Format réglementaire activé' : `${filtered.length} produits à exporter`}
            </Text>

            <View style={styles.exportFormats}>
              {/* Bouton PDF */}
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  {
                    backgroundColor: canExportFormat('pdf', exportFormats) ? colors.accentSoft : colors.surfaceAlt,
                    borderColor: canExportFormat('pdf', exportFormats) ? colors.accent : colors.border,
                    opacity: canExportFormat('pdf', exportFormats) ? 1 : 0.5
                  }
                ]}
                onPress={() => handleExport('pdf')}
                disabled={!canExportFormat('pdf', exportFormats)}
              >
                <Ionicons name="document-text" size={32} color={canExportFormat('pdf', exportFormats) ? colors.accent : colors.textSecondary} />
                <Text style={[styles.formatButtonLabel, { color: canExportFormat('pdf', exportFormats) ? colors.accent : colors.textSecondary }]}>
                  PDF
                </Text>
                {!canExportFormat('pdf', exportFormats) && (
                  <Text style={[styles.formatLocked, { color: colors.textSecondary }]}>
                    Non inclus
                  </Text>
                )}
              </TouchableOpacity>

              {/* Bouton XLSX */}
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  {
                    backgroundColor: canExportFormat('xlsx', exportFormats) ? colors.accentSoft : colors.surfaceAlt,
                    borderColor: canExportFormat('xlsx', exportFormats) ? colors.accent : colors.border,
                    opacity: canExportFormat('xlsx', exportFormats) ? 1 : 0.5
                  }
                ]}
                onPress={() => handleExport('xlsx')}
                disabled={!canExportFormat('xlsx', exportFormats)}
              >
                <Ionicons name="grid" size={32} color={canExportFormat('xlsx', exportFormats) ? colors.accent : colors.textSecondary} />
                <Text style={[styles.formatButtonLabel, { color: canExportFormat('xlsx', exportFormats) ? colors.accent : colors.textSecondary }]}>
                  Excel
                </Text>
                {!canExportFormat('xlsx', exportFormats) && (
                  <Text style={[styles.formatLocked, { color: colors.textSecondary }]}>
                    Non inclus
                  </Text>
                )}
              </TouchableOpacity>

              {/* Bouton CSV */}
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  {
                    backgroundColor: canExportFormat('csv', exportFormats) ? colors.accentSoft : colors.surfaceAlt,
                    borderColor: canExportFormat('csv', exportFormats) ? colors.accent : colors.border,
                    opacity: canExportFormat('csv', exportFormats) ? 1 : 0.5
                  }
                ]}
                onPress={() => handleExport('csv')}
                disabled={!canExportFormat('csv', exportFormats)}
              >
                <Ionicons name="list" size={32} color={canExportFormat('csv', exportFormats) ? colors.accent : colors.textSecondary} />
                <Text style={[styles.formatButtonLabel, { color: canExportFormat('csv', exportFormats) ? colors.accent : colors.textSecondary }]}>
                  CSV
                </Text>
                {!canExportFormat('csv', exportFormats) && (
                  <Text style={[styles.formatLocked, { color: colors.textSecondary }]}>
                    Non inclus
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GradientBackground>
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
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden'
  },
  spinner: {
    marginLeft: 8
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
  actionsRow: {
    gap: 6,
    marginBottom: 10
  },
  exportButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '800'
  },
  exportInfo: {
    fontSize: 12,
    lineHeight: 16
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
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  item: {
    marginBottom: 16,
    borderRadius: 24,
    padding: 18
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 8
  },
  lot: {
    fontSize: 16
  },
  dataDisclaimer: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4
  },
  date: {
    fontSize: 13,
    marginTop: 8
  },
  noRecallDisclaimer: {
    fontSize: 12,
    fontStyle: 'italic',
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
  },
  itemContent: {
    flexDirection: 'row',
    gap: 12
  },
  productThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#f5f5f5'
  },
  itemDetails: {
    flex: 1
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6
  },
  appDisclaimerBox: {
    borderRadius: 16,
    padding: 16,
    marginTop: 24
  },
  appDisclaimerText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    gap: 20
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center'
  },
  modalSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: -10
  },
  exportFormats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  formatButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8
  },
  formatButtonLabel: {
    fontSize: 14,
    fontWeight: '700'
  },
  formatLocked: {
    fontSize: 11,
    fontStyle: 'italic'
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700'
  }
});
