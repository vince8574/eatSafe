import { useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { useQuery } from '@tanstack/react-query';
import { fetchAllRecalls } from '../services/apiService';
import { RecallAlert } from '../components/RecallAlert';
import { extractRecallReason } from '../utils/recallUtils';
import { GradientBackground } from '../components/GradientBackground';
import { ResultBottomNav } from '../components/ResultBottomNav';
import { Ionicons } from '@expo/vector-icons';

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
  // 'warning' : rappel FDA/USDA SANS numéros de lot publiés dont la marque et le
  // type de produit recoupent ce produit — à vérifier par l'utilisateur.
  const isWarning = product?.recallStatus === 'warning';

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
      <KeyboardAvoidingView
        style={styles.scroll}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
        {/* Retour. Cet écran n'en avait AUCUN : ses deux boutons de bas de page
            font `router.replace` vers l'accueil ou le scan, ce qui détruit la
            pile — arrivé depuis l'historique, on ne pouvait donc plus y revenir.
            Repli sur l'accueil si la pile est vide (ouverture par notification). */}
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          <Text style={[styles.backLabel, { color: colors.textPrimary }]}>{t('common.back')}</Text>
        </TouchableOpacity>

        {/* Alerte de rappel en haut si le produit est contaminé */}
        {isRecalled && recall && (
          <View style={styles.section}>
            <RecallAlert recall={recall} reason={recallReason} />
          </View>
        )}

        {/* Rappel possible SANS numéros de lot publiés (ex. Taylor Farms) :
            la FDA/USDA n'a pas fourni de lots exploitables → on affiche EN
            ÉVIDENCE les données d'identification publiées (dates "Best if
            Used By", descriptions produit…) pour que l'utilisateur vérifie
            lui-même, + lien vers l'avis officiel. */}
        {isWarning && (
          <View style={styles.section}>
            <View style={[styles.warningCard, { backgroundColor: 'rgba(255,165,0,0.12)', borderColor: colors.warning }]}>
              <View style={styles.warningHeader}>
                <Ionicons name="warning" size={24} color={colors.warning} />
                <Text style={[styles.warningTitle, { color: colors.warning }]}>
                  {t('details.lotlessWarning.title')}
                </Text>
              </View>
              <Text style={[styles.warningText, { color: colors.textPrimary }]}>
                {t('details.lotlessWarning.explanation')}
              </Text>
              {recall && (
                <>
                  <Text style={[styles.warningRecallTitle, { color: colors.textPrimary }]}>
                    {recall.title}
                  </Text>
                  {recall.description ? (
                    <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                      {recall.description}
                    </Text>
                  ) : null}
                  {recall.codeInfo ? (
                    <View style={[styles.warningInfoBox, { borderColor: colors.warning, backgroundColor: 'rgba(255,165,0,0.10)' }]}>
                      <Text style={[styles.warningInfoLabel, { color: colors.warning }]}>
                        {t('details.lotlessWarning.identifyLabel')}
                      </Text>
                      <Text style={[styles.warningInfoText, { color: colors.textPrimary }]}>
                        {recall.codeInfo}
                      </Text>
                    </View>
                  ) : null}
                  {recall.link ? (
                    <TouchableOpacity
                      style={[styles.warningLinkBtn, { borderColor: colors.warning }]}
                      onPress={() => Linking.openURL(recall.link!)}
                      accessibilityRole="button"
                    >
                      <Ionicons name="open-outline" size={16} color={colors.warning} />
                      <Text style={[styles.warningLinkText, { color: colors.warning }]}>
                        {t('details.lotlessWarning.viewNotice')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.brand, { color: colors.textPrimary }]}>{product.brand}</Text>
            {product.productName ? (
              <Text style={[styles.productNameSub, { color: colors.textSecondary }]}>{product.productName}</Text>
            ) : null}
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
            ) : product.recallStatus === 'warning' ? (
              <View style={[styles.noRecallBadge, { backgroundColor: 'rgba(255,165,0,0.12)', borderColor: colors.warning }]}>
                <Text style={[styles.noRecallText, { color: colors.warning }]}>
                  ⚠️ {t('details.lotlessWarning.statusBadge')}
                </Text>
              </View>
            ) : (
              <View style={[styles.noRecallBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.textSecondary }]}>
                <Text style={[styles.noRecallText, { color: colors.textPrimary }]}>
                  ℹ️ {t('recallStatus.safe')}
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

          <TouchableOpacity
            style={[styles.scanAnotherButton, { backgroundColor: colors.accent, borderColor: 'rgba(255,255,255,0.9)', shadowColor: colors.accent }]}
            onPress={() => router.replace('/(tabs)/scan')}
          >
            <Text style={[styles.scanAnotherText, { color: colors.onAccent }]}>{t('details.actions.scanAnother')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.okButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text style={[styles.okText, { color: colors.textPrimary }]}>{t('details.actions.ok')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: colors.danger }]}
            onPress={async () => {
              await removeProduct(product.id);
              router.back();
            }}
          >
            <Text style={[styles.deleteText, { color: colors.surface }]}>{t('details.actions.delete')}</Text>
          </TouchableOpacity>

          <View style={[styles.verifyBox, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
            <Text style={[styles.verifyText, { color: colors.textPrimary }]}>
              ℹ️ {t('common.verifyWithSources')}
            </Text>
          </View>

          <View style={[styles.governmentInfoBox, { backgroundColor: '#FFA50020', borderColor: '#FFA500' }]}>
            <Ionicons name="alert-circle" size={16} color="#FFA500" />
            <Text style={[styles.governmentInfoText, { color: colors.textPrimary }]}>
              {t('common.governmentInfoDisclaimer')}
            </Text>
          </View>

          <View style={[styles.appDisclaimerBox, { backgroundColor: colors.surfaceAlt, borderColor: 'rgba(255,255,255,0.06)' }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.appDisclaimerText, { color: colors.textPrimary }]}>
              {t('common.appDisclaimer')}
            </Text>
          </View>

        </View>

        <View style={styles.section}>
          <View style={[styles.infoBox, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {t('details.privacyInfo')}
            </Text>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
      <ResultBottomNav />
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
      // "No recall found" is NEUTRAL, not green — green would imply "safe" (liability).
      return { color: colors.textSecondary };
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
  scroll: {
    flex: 1
  },
  content: {
    padding: 24
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    alignSelf: 'flex-start'
  },
  backLabel: {
    fontSize: 16,
    fontWeight: '700'
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
  productNameSub: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6
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
  warningCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    gap: 10
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  warningTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800'
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20
  },
  warningRecallTitle: {
    fontSize: 15,
    fontWeight: '700'
  },
  warningInfoBox: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    gap: 4
  },
  warningInfoLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  warningInfoText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22
  },
  warningLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  warningLinkText: {
    fontSize: 14,
    fontWeight: '700'
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2
  },
  governmentInfoText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '700'
  },
  appDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1
  },
  appDisclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1
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
  scanAnotherButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    // Bordure claire + ombre colorée → le CTA se détache nettement du fond vert.
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6
  },
  scanAnotherText: {
    fontSize: 16,
    fontWeight: '700'
  },
  okButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2
  },
  okText: {
    fontSize: 16,
    fontWeight: '700'
  },
  deleteButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center'
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '700'
  },
  missingText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16
  }
});
