import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Image, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Scanner } from '../components/Scanner';
import { performOcr } from '../services/ocrService';
import { fetchRecallsByCountry } from '../services/apiService';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';
import { GradientBackground } from '../components/GradientBackground';
import { ImmediateRecallAlert } from '../components/ImmediateRecallAlert';
import { saveLotPattern, validateLotAgainstBrandPatterns } from '../services/lotPatternService';
import { useSubscription } from '../hooks/useSubscription';
import { decrementScanCounter } from '../services/subscriptionService';

function normalizeLotValue(lot: string) {
  return lot.replace(/\s+/g, '').replace(/[-_\.]/g, '').toUpperCase();
}

export function ScanLotScreen() {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { brand, productName, productImage } = useLocalSearchParams<{
    brand: string;
    productName?: string;
    productImage?: string;
  }>();
  const { addProduct, updateRecall } = useScannedProducts();
  const country = usePreferencesStore((state) => state.country);
  const { subscription, buyPack, refresh, loading: subLoading } = useSubscription();

  const [ocrText, setOcrText] = useState('');
  const [ocrSource, setOcrSource] = useState<string>('');
  const [lotNumber, setLotNumber] = useState('');
  const [lotCandidates, setLotCandidates] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isConfirmModalVisible, setConfirmModalVisible] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isEditingLot, setIsEditingLot] = useState(false);
  const [editedLot, setEditedLot] = useState('');
  const [isCheckingRecall, setIsCheckingRecall] = useState(false);
  const [hasRecall, setHasRecall] = useState<boolean | null>(null);
  const [matchedLot, setMatchedLot] = useState<string>('');
  const [matchedRecall, setMatchedRecall] = useState<any>(null);
  const [showRecallAlert, setShowRecallAlert] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);
  const [scannerResetToken, setScannerResetToken] = useState(0);

  const ensureScanQuota = useCallback(async (): Promise<boolean> => {
    const remaining = subscription?.scansRemaining ?? 0;
    if (remaining > 0) return true;

    return new Promise((resolve) => {
      Alert.alert(
        t('quota.reached'),
        t('quota.addPack'),
        [
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
          {
            text: t('quota.pack500'),
            onPress: async () => {
              try {
                await buyPack(500);
                await refresh();
                resolve(true);
              } catch (error) {
                Alert.alert(t('auth.error'), t('quota.cannotAdd'));
                resolve(false);
              }
            }
          }
        ],
        { cancelable: true }
      );
    });
  }, [subscription?.scansRemaining, buyPack, refresh, t]);

  const lotMutation = useMutation({
    mutationFn: async (lotPhoto: string) => {
      setErrorMessage('');
      const { lot, result, candidates } = await performOcr(lotPhoto, brand);
      setOcrText(result.text);
      setOcrSource(result.source || 'unknown');
      setLotNumber(lot);
      setLotCandidates(candidates || []);

      // Ne pas exiger qu'un lot soit dÃ©tectÃ© - on affiche tout le texte OCR
      // if (!lot) {
      //   throw new Error(t('scan.errors.lotExtractFailed'));
      // }

      try {
        await FileSystem.deleteAsync(lotPhoto, { idempotent: true });
      } catch (error) {
        console.warn('Failed to delete lot photo', error);
      }

      // VÃ©rifier les rappels en arriÃ¨re-plan
      if (candidates && candidates.length > 0) {
        setIsCheckingRecall(true);
        setHasRecall(null);

        const { checkAllCandidates } = await import('../services/candidateMatcherService');

        try {
          const matchResult = await checkAllCandidates(candidates, brand, country);
          setHasRecall(matchResult.hasRecall);
          setVerifiedAt(Date.now());
          if (matchResult.matchedCandidate) {
            setMatchedLot(matchResult.matchedCandidate);
          }
          if (matchResult.hasRecall && matchResult.matchedRecall) {
            setMatchedRecall(matchResult.matchedRecall);
            // Afficher immÃ©diatement l'alerte de rappel
            setShowRecallAlert(true);
          }
        } catch (error) {
          console.error('Error checking recalls:', error);
        } finally {
          setIsCheckingRecall(false);
        }
      }

      return result.text; // Retourner le texte OCR complet
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || t('scan.errors.lotExtractFailed'));
    },
    onSuccess: () => {
      setConfirmModalVisible(true);
    }
  });

  const resetFlow = useCallback(() => {
    setOcrText('');
    setOcrSource('');
    setLotNumber('');
    setLotCandidates([]);
    setErrorMessage('');
    setConfirmModalVisible(false);
    setIsEditingLot(false);
    setEditedLot('');
    setVerifiedAt(null);
    setScannerResetToken((token) => token + 1);
  }, []);

  const handleCapture = useCallback(
    async (uri: string) => {
      if (!brand) {
        setErrorMessage(t('scan.errors.brandFirst'));
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (error) {
          console.warn('Failed to delete unexpected capture', error);
        }
        return;
      }

      lotMutation.mutate(uri);
    },
    [brand, lotMutation, t]
  );

  const isProcessing = lotMutation.isPending || isFinalizing;

  const handleConfirm = useCallback(async () => {
    const finalLot = isEditingLot ? editedLot.trim().toUpperCase() : lotNumber;
    const normalizedOcrText = normalizeLotValue(ocrText || '');
    const candidatesForMatch = [finalLot, ...lotCandidates]
      .filter(Boolean)
      .map((candidate) => normalizeLotValue(candidate));

    if (!finalLot) {
      setErrorMessage(t('scan.errors.lotExtractFailed'));
      setConfirmModalVisible(false);
      return;
    }

    // Allow empty brand (user skipped brand step) - will be set to "Unknown"
    const finalBrand = brand && brand.trim() ? brand.trim() : t('common.unknown');

    const hasQuota = await ensureScanQuota();
    if (!hasQuota) {
      setConfirmModalVisible(false);
      return;
    }

    setIsFinalizing(true);

    try {
      const validation = await validateLotAgainstBrandPatterns(finalBrand, finalLot);

      if (validation.isValid) {
        console.log(`[ScanLotScreen] Lot ${finalLot} validated against existing patterns for ${finalBrand}`);
      } else {
        console.log(`[ScanLotScreen] New lot pattern detected for ${finalBrand}: ${finalLot}`);
        await saveLotPattern(finalBrand, finalLot);
      }

      const recallList = await fetchRecallsByCountry(country);
      const product = await addProduct({
        brand: finalBrand,
        lotNumber: finalLot,
        ...(productName && { productName }),
        ...(productImage && { productImage })
      });

      const matchingRecalls = recallList.filter((recall) => {
        // Check lot match first (most reliable indicator)
        if (!recall.lotNumbers || recall.lotNumbers.length === 0) {
          // If no lot numbers in recall, fallback to brand match only
          return recall.brand ? recall.brand.toLowerCase() === finalBrand.toLowerCase() : false;
        }

        const lotMatch = recall.lotNumbers.some((lot) => {
          const normalizedRecallLot = normalizeLotValue(lot);
          if (!normalizedRecallLot) {
            return false;
          }

          const candidateHit = candidatesForMatch.some(
            (candidate) =>
              candidate.includes(normalizedRecallLot) || normalizedRecallLot.includes(candidate)
          );
          const inFullText = normalizedOcrText.includes(normalizedRecallLot);

          return candidateHit || inFullText;
        });

        // If lot matches, accept the recall regardless of brand
        // (brand names can vary: product name vs manufacturer name)
        if (lotMatch) {
          return true;
        }

        return false;
      });

      if (matchingRecalls.length > 0) {
        await updateRecall(product, matchingRecalls);
      }

      await decrementScanCounter();

      resetFlow();
      router.replace({ pathname: '/details/[id]', params: { id: product.id } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('scan.errors.scanFailed'));
    } finally {
      setConfirmModalVisible(false);
      setIsFinalizing(false);
      setIsEditingLot(false);
      setEditedLot('');
    }
  }, [
    addProduct,
    brand,
    country,
    lotNumber,
    isEditingLot,
    editedLot,
    ocrText,
    lotCandidates,
    productName,
    productImage,
    ensureScanQuota,
    decrementScanCounter,
    resetFlow,
    router,
    t,
    updateRecall
  ]);

  const handleRestart = useCallback(() => {
    setLotNumber('');
    setOcrText('');
    setOcrSource('');
    setLotCandidates([]);
    setErrorMessage('');
    setConfirmModalVisible(false);
    setIsEditingLot(false);
    setEditedLot('');
    setVerifiedAt(null);
    setScannerResetToken((token) => token + 1);
  }, []);

  const handleEditLot = useCallback(() => {
    // Utiliser le texte OCR brut au lieu du lot dÃ©tectÃ©
    setEditedLot(ocrText);
    setIsEditingLot(true);
  }, [ocrText]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingLot(false);
    setEditedLot('');
  }, []);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleManualEntry = useCallback(() => {
    setEditedLot('');
    setIsEditingLot(true);
    setConfirmModalVisible(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setScannerResetToken((token) => token + 1);
      return () => {};
    }, [])
  );

  return (
    <GradientBackground>
      <Scanner
        key={`lot-scanner-${scannerResetToken}`}
        onCapture={handleCapture}
        enableBarcodeScanning={false}
        isProcessing={isProcessing}
        mode="band"
        resetToken={scannerResetToken}
        flashPosition="top-right"
        onBack={handleGoBack}
        onRestart={handleRestart}
        onManualEntry={handleManualEntry}
      />

      <ScrollView style={styles.feedback} contentContainerStyle={styles.feedbackContent}>
        {/* Compteur de scans */}
        {subscription && (
          <View style={[styles.scanCounter, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
            <Text style={[styles.scanCounterLabel, { color: colors.textSecondary }]}>
              {t('subscription.scansRemaining')}
            </Text>
            <Text style={[styles.scanCounterValue, { color: colors.accent }]}>
              {subscription.scansRemaining} / {subscription.scansIncluded}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.instructions,
            {
              backgroundColor: 'rgba(255,200,87,0.18)',
              borderColor: colors.warning,
              shadowColor: colors.warning
            }
          ]}
        >
          <Text
            style={[
              styles.stepLabel,
              { color: colors.warning }
            ]}
          >
            {t('scan.lotStep')}
          </Text>
          <Text
            style={[
              styles.instructionText,
              { color: colors.textPrimary }
            ]}
          >
            {isProcessing ? t('scan.lotAnalyzing') : t('scan.lotInstruction')}
          </Text>
        </View>

        {(productImage || productName) && (
          <View style={[styles.productInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                style={styles.productImageSmall}
                resizeMode="contain"
              />
            ) : null}
            {productName ? (
              <Text style={[styles.productNameSmall, { color: colors.textPrimary }]}>
                {productName}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: brand ? colors.surface : colors.surfaceAlt,
                borderColor: brand ? colors.accent : colors.surfaceAlt
              }
            ]}
          >
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{t('scan.brandLabel')}</Text>
            <Text style={[styles.statusValue, { color: brand ? colors.success : colors.textSecondary }]}>
              {brand || t('scan.waiting')}
            </Text>
          </View>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: lotNumber ? colors.surface : colors.surfaceAlt,
                borderColor: lotNumber ? colors.accent : colors.surfaceAlt
              }
            ]}
          >
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{t('scan.lotLabel')}</Text>
            <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
              {lotNumber || (lotMutation.isPending ? t('scan.analyzing') : t('scan.waiting'))}
            </Text>
          </View>
        </View>

        {lotNumber && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('scan.detectedLot')}</Text>
            <Text style={[styles.lotText, { color: colors.accent }]}>{lotNumber}</Text>
          </>
        )}

        {errorMessage ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
        ) : null}

        <View style={[styles.appDisclaimerBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.appDisclaimerText, { color: colors.textSecondary }]}>
            ⚠️ {t('common.appDisclaimer')}
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={isConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('scan.confirmLotTitle')}
            </Text>

            {isEditingLot ? (
              <>
                <Text style={[styles.modalMessage, { color: colors.textSecondary, marginTop: 12 }]}>
                  {t('scanLot.editManually')}
                </Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.accent }]}
                  value={editedLot}
                  onChangeText={setEditedLot}
                  placeholder={t('scanLot.enterLot')}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  autoFocus
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}
                    onPress={handleCancelEdit}
                    disabled={isFinalizing}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                      {t('common.cancel')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.accent }]}
                    onPress={handleConfirm}
                    disabled={isFinalizing}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.surface }]}>
                      {t('scan.validate')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                  {t('scanLot.ocrDetected')}
                </Text>
                <View style={[styles.ocrTextContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[styles.ocrText, { color: colors.textPrimary }]}>
                    {ocrText || t('scanLot.noText')}
                  </Text>
                </View>

                {ocrSource && (
                  <View style={[styles.ocrSourceContainer, { backgroundColor: ocrSource === 'vision-fallback' ? '#e8f5e9' : '#e3f2fd' }]}>
                    <Text style={[styles.ocrSourceText, { color: ocrSource === 'vision-fallback' ? '#2e7d32' : '#1565c0' }]}>
                      {ocrSource === 'vision-fallback' ? t('scanLot.ocrSourceVision') : ocrSource === 'mlkit' ? t('scanLot.ocrSourceMlKit') : t('scanLot.ocrSource', { source: ocrSource })}
                    </Text>
                    {verifiedAt && (
                      <Text style={[styles.recallMeta, { color: colors.textSecondary }]}>
                        {t('productCard.scannedAt', {
                          date: new Date(verifiedAt).toLocaleDateString(locale || undefined),
                          time: new Date(verifiedAt).toLocaleTimeString(locale || undefined, {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        })}
                      </Text>
                    )}
                    <Text style={[styles.recallDisclaimer, { color: colors.textSecondary }]}>
                      {t('common.noRecallDisclaimer')}
                    </Text>
                  </View>
                )}

                {isCheckingRecall && (
                  <View style={styles.checkingContainer}>
                    <Text style={[styles.checkingText, { color: colors.textSecondary }]}>
                      ðŸ” {t('scanLot.checkingRecalls')}
                    </Text>
                  </View>
                )}

                {!isCheckingRecall && hasRecall !== null && (
                  <View style={[
                    styles.recallStatusContainer,
                    {
                      backgroundColor: hasRecall ? '#fee' : '#efe',
                      borderColor: hasRecall ? '#f44' : '#4a4'
                    }
                  ]}>
                    <Text style={[styles.recallStatusText, { color: hasRecall ? '#f44' : '#4a4' }]}>
                      {hasRecall
                        ? matchedLot ? t('scanLot.recallDetectedWithLot', { lot: matchedLot }) : t('scanLot.recallDetected')
                        : t('scanLot.productSafe')}
                    </Text>
                  </View>
                )}


                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.accent }]}
                  onPress={handleEditLot}
                >
                  <Text style={[styles.editButtonText, { color: colors.accent }]}>
                    {t('scanLot.edit')}
                  </Text>
                </TouchableOpacity>

              </>
            )}
          </View>
        </View>
      </Modal>

      <ImmediateRecallAlert
        visible={showRecallAlert}
        recall={matchedRecall}
        matchedLot={matchedLot}
        onClose={() => setShowRecallAlert(false)}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  feedback: {
    maxHeight: 380,
    paddingHorizontal: 24
  },
  feedbackContent: {
    paddingVertical: 16,
    paddingBottom: 48,
    gap: 16
  },
  instructions: {
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600'
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12
  },
  statusPill: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  statusValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700'
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22
  },
  lotText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8
  },
  resetButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center'
  },
  resetText: {
    fontSize: 16,
    fontWeight: '700'
  },
  backButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700'
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
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },
  editInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 8,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top'
  },
  candidatesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12
  },
  candidateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 4
  },
  candidateText: {
    fontSize: 14,
    fontWeight: '600'
  },
  editButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    marginVertical: 8
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },
  ocrTextContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    maxHeight: 120
  },
  ocrText: {
    fontSize: 14,
    lineHeight: 20
  },
  ocrSourceContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8
  },
  ocrSourceText: {
    fontSize: 12,
    fontWeight: '600'
  },
  checkingContainer: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  checkingText: {
    fontSize: 14,
    fontStyle: 'italic'
  },
  recallStatusContainer: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    alignItems: 'center'
  },
  recallStatusText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  },
  recallMeta: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center'
  },
  recallDisclaimer: {
    marginTop: 6,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center'
  },
  productInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginVertical: 8
  },
  productImageSmall: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5'
  },
  productNameSmall: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18
  },
  appDisclaimerBox: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 8
  },
  appDisclaimerText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center'
  },
  scanCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12
  },
  scanCounterLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  scanCounterValue: {
    fontSize: 18,
    fontWeight: '800'
  }
});
