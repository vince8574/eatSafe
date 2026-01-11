import { useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { useQuery } from '@tanstack/react-query';
import { fetchAllRecalls } from '../services/apiService';
import { RecallAlert } from '../components/RecallAlert';
import { extractRecallReason } from '../utils/recallUtils';
import { GradientBackground } from '../components/GradientBackground';

export function DetailScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, removeProduct, updateProduct } = useScannedProducts();
  const [isEditingLot, setIsEditingLot] = useState(false);
  const [editedLot, setEditedLot] = useState('');
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
      <GradientBackground>
        <Text style={[styles.missingText, { color: colors.textSecondary }]}>
          {t('details.notFound')}
        </Text>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Alerte de rappel en haut si le produit est contaminé */}
        {isRecalled && recall && (
          <View style={styles.section}>
            <RecallAlert recall={recall} reason={recallReason} />
          </View>
        )}

        <View style={styles.section}>
          <View style={[styles.infoBox, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {t('details.privacyInfo')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.brand, { color: colors.textPrimary }]}>{product.brand}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('details.lotNumber')}</Text>
            {isEditingLot ? (
              <View style={styles.lotEditContainer}>
                <TextInput
                  style={[styles.lotInput, { color: colors.accent, borderColor: colors.accent, backgroundColor: colors.surfaceAlt }]}
                  value={editedLot}
                  onChangeText={setEditedLot}
                  autoCapitalize="characters"
                  autoFocus
                />
                <View style={styles.lotEditButtons}>
                  <TouchableOpacity
                    style={[styles.lotEditButton, { backgroundColor: colors.surfaceAlt }]}
                    onPress={() => {
                      setIsEditingLot(false);
                      setEditedLot('');
                    }}
                  >
                    <Text style={[styles.lotEditButtonText, { color: colors.textPrimary }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.lotEditButton, { backgroundColor: colors.accent }]}
                    onPress={async () => {
                      if (editedLot.trim() && editedLot.trim() !== product.lotNumber) {
                        await updateProduct(product.id, { lotNumber: editedLot.trim().toUpperCase() });
                        Alert.alert(t('detailsScreen.lotModified'), `${t('detailsScreen.lotUpdated')} ${editedLot.trim().toUpperCase()}`);
                      }
                      setIsEditingLot(false);
                      setEditedLot('');
                    }}
                  >
                    <Text style={[styles.lotEditButtonText, { color: colors.surface }]}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.lotContainer}
                onPress={() => {
                  setEditedLot(product.lotNumber);
                  setIsEditingLot(true);
                }}
              >
                <Text style={[styles.lot, { color: colors.accent }]}>{product.lotNumber}</Text>
                <Text style={[styles.editIcon, { color: colors.textSecondary }]}>✏️</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('details.recallStatusLabel')}</Text>
            {product.recallStatus === 'recalled' ? (
              <Text style={[styles.status, getStatusColor(product.recallStatus, colors)]}>
                {t('details.status.recalled')}
              </Text>
            ) : (
              <View style={[styles.noRecallBadge, { backgroundColor: colors.success + '15', borderColor: colors.success }]}>
                <Text style={[styles.noRecallText, { color: colors.success }]}>
                  {t('recallStatus.safe')}
                </Text>
              </View>
            )}
            <Text style={[styles.disclaimer, { color: colors.textSecondary, marginTop: 8 }]}>
              {t('common.dataDisclaimer')}
            </Text>
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('details.lastChecked')}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {product.lastCheckedAt
                ? new Date(product.lastCheckedAt).toLocaleString('fr-FR')
                : t('details.never')}
            </Text>
          </View>

          <View style={[styles.verifyBox, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
            <Text style={[styles.verifyText, { color: colors.textPrimary }]}>
              ℹ️ {t('common.verifyWithSources')}
            </Text>
          </View>

          <View style={[styles.governmentInfoBox, { backgroundColor: '#FFA50020', borderColor: '#FFA500' }]}>
            <Text style={[styles.governmentInfoText, { color: colors.textPrimary }]}>
              ⚠️ {t('common.governmentInfoDisclaimer')}
            </Text>
          </View>

          <View style={[styles.appDisclaimerBox, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.appDisclaimerText, { color: colors.textSecondary }]}>
              ⚠️ {t('common.appDisclaimer')}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: colors.danger }]}
            onPress={async () => {
              await removeProduct(product.id);
              router.back();
            }}
          >
            <Text style={styles.deleteText}>{t('details.actions.delete')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

function getStatusLabel(status: string, t: any): string {
  switch (status) {
    case 'recalled':
      return t('details.status.recalled');
    case 'safe':
      return t('details.status.safe');
    case 'warning':
      return t('details.status.warning');
    default:
      return t('details.status.unknown');
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
    padding: 24
  },
  section: {
    marginBottom: 24
  },
  card: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16
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
  lotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8
  },
  editIcon: {
    fontSize: 18
  },
  lotEditContainer: {
    marginTop: 8,
    gap: 12
  },
  lotInput: {
    fontSize: 18,
    fontWeight: '700',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2
  },
  lotEditButtons: {
    flexDirection: 'row',
    gap: 12
  },
  lotEditButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  lotEditButtonText: {
    fontSize: 14,
    fontWeight: '700'
  },
  status: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8
  },
  noRecallBadge: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 2
  },
  noRecallText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22
  },
  disclaimer: {
    fontSize: 12,
    fontStyle: 'italic'
  },
  value: {
    fontSize: 16,
    marginTop: 8
  },
  verifyBox: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2
  },
  verifyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600'
  },
  governmentInfoBox: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 3
  },
  governmentInfoText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '700'
  },
  appDisclaimerBox: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16
  },
  appDisclaimerText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center'
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
    alignItems: 'center'
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
