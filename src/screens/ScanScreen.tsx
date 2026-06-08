import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Image, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { Scanner } from '../components/Scanner';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import { getProductByBarcode } from '../services/productLookupService';
import { useFocusEffect } from '@react-navigation/native';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useVoiceGuide } from '../hooks/useVoiceGuide';
import { useKeepAwake } from 'expo-keep-awake';

// Hands-free voice coaching for blind users on the barcode screen: after the
// intro, repeat rotating guidance every few seconds until a barcode is read.
// After MAX_BARCODE_COACH cues with nothing found, fall back to the lot scan —
// the accessible equivalent of the on-screen "Skip" button a blind user can't see.
const BARCODE_COACH_KEYS = ['barcodeCoach1', 'barcodeCoach2', 'barcodeCoach3'];
const BARCODE_COACH_INTERVAL_MS = 9000;
const MAX_BARCODE_COACH = 5;

export function ScanScreen() {
  // Prevent the screen from sleeping during scanning (detection can be long).
  useKeepAwake();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const accessibilityMode = usePreferencesStore((s) => s.accessibilityMode);
  const { speak } = useVoiceGuide();
  const [brandText, setBrandText] = useState('');
  const [productName, setProductName] = useState('');
  const [productImage, setProductImage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isConfirmModalVisible, setConfirmModalVisible] = useState(false);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [editedBrand, setEditedBrand] = useState('');
  const [scannerResetToken, setScannerResetToken] = useState(0);

  const resetFlow = useCallback(() => {
    setBrandText('');
    setProductName('');
    setProductImage('');
    setErrorMessage('');
    setConfirmModalVisible(false);
    setIsEditingBrand(false);
    setEditedBrand('');
    setScannerResetToken((t) => t + 1);
    // Re-arm barcode handling for the next scan (e.g. the Reload button, which
    // resets the flow without re-focusing the screen).
    barcodeHandledRef.current = false;
  }, []);

  // Track if we navigated away so we only reset when coming BACK
  const hasNavigatedAway = useRef(false);

  // Accessibility (blind users): keep guiding by voice until a barcode is read.
  const isFocusedRef = useRef(false);
  const barcodeHandledRef = useRef(false);
  const coachTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coachCountRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  const stopBarcodeCoaching = useCallback(() => {
    if (coachTimerRef.current) {
      clearInterval(coachTimerRef.current);
      coachTimerRef.current = null;
    }
  }, []);

  const startBarcodeCoaching = useCallback(() => {
    if (!accessibilityMode) return;
    stopBarcodeCoaching();
    coachCountRef.current = 0;
    coachTimerRef.current = setInterval(() => {
      if (!isFocusedRef.current || barcodeHandledRef.current) return;
      coachCountRef.current += 1;
      const n = coachCountRef.current;
      if (n >= MAX_BARCODE_COACH) {
        // Stuck without a barcode → switch to the lot scan (which guides too).
        stopBarcodeCoaching();
        barcodeHandledRef.current = true;
        speak(t('accessibility.voice.barcodeGiveUp'), { priority: true });
        setTimeout(() => {
          if (isFocusedRef.current) {
            hasNavigatedAway.current = true;
            router.push('/scan-lot' as any);
          }
        }, 2600);
        return;
      }
      const key = BARCODE_COACH_KEYS[(n - 1) % BARCODE_COACH_KEYS.length];
      speak(t(`accessibility.voice.${key}`), { priority: false, dedupeMs: 7000 });
    }, BARCODE_COACH_INTERVAL_MS);
  }, [accessibilityMode, speak, t, router, stopBarcodeCoaching]);

  useFocusEffect(
    useCallback(() => {
      if (hasNavigatedAway.current) {
        resetFlow();
        hasNavigatedAway.current = false;
      }
      isFocusedRef.current = true;
      barcodeHandledRef.current = false;
      if (accessibilityMode) {
        speak(t('accessibility.voice.scanBarcodeReady'), { priority: true });
        startBarcodeCoaching();
      }
      return () => {
        isFocusedRef.current = false;
        stopBarcodeCoaching();
        hasNavigatedAway.current = true;
      };
    }, [resetFlow, accessibilityMode, speak, t, startBarcodeCoaching, stopBarcodeCoaching])
  );

  // Blind users: useFocusEffect does NOT fire when the app is merely backgrounded
  // and resumed (no navigation), so the guidance would go silent. Re-announce the
  // intro and restart coaching when the app returns to the foreground on this screen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (
        prev.match(/inactive|background/) &&
        next === 'active' &&
        accessibilityMode &&
        isFocusedRef.current &&
        !barcodeHandledRef.current &&
        !brandText
      ) {
        speak(t('accessibility.voice.scanBarcodeReady'), { priority: true });
        startBarcodeCoaching();
      }
    });
    return () => sub.remove();
  }, [accessibilityMode, speak, t, brandText, startBarcodeCoaching]);

  const handleConfirm = useCallback(() => {
    const finalBrand = isEditingBrand ? editedBrand.trim() : brandText;

    if (!finalBrand) {
      setErrorMessage(t('scan.errors.brandFirst'));
      setConfirmModalVisible(false);
      return;
    }

    // Rediriger vers l'écran de scan du lot avec la marque et les infos produit
    setConfirmModalVisible(false);
    const params = new URLSearchParams({
      brand: finalBrand,
      ...(productName && { productName }),
      ...(productImage && { productImage })
    });
    router.push(`/scan-lot?${params.toString()}` as any);
  }, [brandText, isEditingBrand, editedBrand, productName, productImage, router, t]);

  const handleRestart = useCallback(() => {
    resetFlow();
  }, [resetFlow]);

  const handleEditBrand = useCallback(() => {
    setEditedBrand(brandText);
    setIsEditingBrand(true);
  }, [brandText]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingBrand(false);
    setEditedBrand('');
  }, []);

  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    // Synchronous re-entry guard: the camera fires onBarcodeScanned several times
    // within a few ms (multiple codes in view, or before brandText commits — and
    // the product-not-found path never sets brandText). Without this, each call
    // pushed a new /scan-lot → stacked pages → the iOS camera couldn't activate on
    // the lot screen (green screen). barcodeHandledRef is set synchronously below.
    if (brandText || barcodeHandledRef.current) {
      return;
    }

    // A barcode was read → stop the hands-free voice coaching loop.
    barcodeHandledRef.current = true;
    stopBarcodeCoaching();

    console.log('[ScanScreen] Barcode scanned:', barcode);
    setErrorMessage('');

    try {
      const productInfo = await getProductByBarcode(barcode);

      if (productInfo) {
        console.log('[ScanScreen] Product found:', productInfo);
        setBrandText(productInfo.brand);
        setProductName(productInfo.productName);
        setProductImage(productInfo.imageUrl || '');
        if (accessibilityMode) {
          // Accessibility mode: no "OK" button to aim for → automatically move on
          // to the lot scan. (Sighted mode: show the modal to verify/edit brand.)
          speak(t('accessibility.voice.productFound', { brand: productInfo.brand }), { priority: true });
          const params = new URLSearchParams({
            brand: productInfo.brand || '',
            ...(productInfo.productName && { productName: productInfo.productName }),
            ...(productInfo.imageUrl && { productImage: productInfo.imageUrl })
          });
          // Delay so "Product found: … Now scan the lot number." is heard in full
          // before navigation cuts the voice. The next screen announces the lot intro.
          setTimeout(() => {
            router.push(`/scan-lot?${params.toString()}` as any);
          }, 2800);
        } else {
          setConfirmModalVisible(true);
        }
      } else {
        // Produit non trouvé dans les bases publiques
        // Passer directement au scan du lot pour vérifier les rappels
        console.log('[ScanScreen] Product not found in databases, proceeding to lot scan');
        setErrorMessage(t('scan.productNotPubliclyListed'));
        if (accessibilityMode) {
          speak(t('accessibility.voice.productNotFound'), { priority: true });
        }

        // Attendre 2 secondes pour que l'utilisateur lise le message
        setTimeout(() => {
          router.push('/scan-lot' as any);
        }, 1500);
      }
    } catch (error) {
      console.error('[ScanScreen] Barcode scan error:', error);
      // Passer également au scan de lot en cas d'erreur
      setErrorMessage(t('scan.productNotPubliclyListed'));
      setTimeout(() => {
        router.push('/scan-lot' as any);
      }, 1500);
    }
  }, [brandText, t, router, accessibilityMode, speak]);

  const handleCapture = useCallback(async (uri: string | string[]) => {
    // Pas de capture de photo pour l'écran de scan de code-barres
    console.log('[ScanScreen] Photo capture not needed for barcode screen');
  }, []);

  return (
    <GradientBackground>
      <Scanner
        onCapture={handleCapture}
        onBarcodeScanned={handleBarcodeScanned}
        enableBarcodeScanning={true}
        isProcessing={isConfirmModalVisible || !!brandText}
        mode="barcode"
        resetToken={scannerResetToken}
        onSkip={() => router.push('/scan-lot' as any)}
        onReload={resetFlow}
        onManualEntry={() => router.push('/manual-entry')}
        flashPosition="top-right"
      />

      <ScrollView style={styles.feedback} contentContainerStyle={styles.feedbackContent}>
        <View
          style={[
            styles.instructions,
            {
              backgroundColor: colors.accentSoft,
              borderColor: colors.accent,
              shadowColor: colors.accent
            }
          ]}
        >
          <Text
            style={[
              styles.stepLabel,
              { color: colors.accent }
            ]}
          >
            {t('scan.brandStep')}
          </Text>
          <Text
            style={[
              styles.instructionText,
              styles.instructionHighlight,
              { color: colors.textPrimary }
            ]}
          >
            {t('scan.barcodeInstruction')}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: brandText ? colors.surface : colors.surfaceAlt,
                borderColor: brandText ? colors.accent : colors.surfaceAlt
              }
            ]}
          >
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{t('scan.brandLabel')}</Text>
            <Text style={[styles.statusValue, { color: brandText ? colors.success : colors.textSecondary }]}>
              {brandText || t('scan.waiting')}
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
        ) : null}

        <View style={[styles.appDisclaimerBox, { backgroundColor: colors.surfaceAlt, borderColor: 'rgba(255,255,255,0.06)' }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.appDisclaimerText, { color: colors.textPrimary }]}>
            {t('common.appDisclaimer')}
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
              {t('scan.confirmBrandTitle')}
            </Text>

            {isEditingBrand ? (
              <>
                <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                  {t('scanScreen.editBrand')}
                </Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.accent }]}
                  value={editedBrand}
                  onChangeText={setEditedBrand}
                  placeholder={t('scanScreen.enterBrand')}
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}
                    onPress={handleCancelEdit}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                      {t('common.cancel')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.accent }]}
                    onPress={handleConfirm}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.surface }]}>
                      {t('scan.validate')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {productImage ? (
                  <Image
                    source={{ uri: productImage }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                ) : null}

                {productName ? (
                  <Text style={[styles.productName, { color: colors.textPrimary }]}>
                    {productName}
                  </Text>
                ) : null}

                <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                  {t('scanScreen.brandDetected')}
                </Text>

                <TouchableOpacity
                  style={[styles.brandDisplayContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.accent }]}
                  onPress={handleEditBrand}
                >
                  <Text style={[styles.brandDisplayText, { color: colors.textPrimary }]}>
                    {brandText || t('common.unknown')}
                  </Text>
                  <Text style={[styles.brandEditIcon, { color: colors.accent }]}>✏️</Text>
                </TouchableOpacity>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}
                    onPress={handleRestart}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                      {t('scan.restart')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.accent }]}
                    onPress={handleConfirm}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.surface }]}>
                      {t('scan.validate')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  instructionHighlight: {
    fontWeight: '900'
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
  manualButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center'
  },
  manualButtonText: {
    fontSize: 15,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 8
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
  productImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#f5f5f5'
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8
  },
  brandDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 8
  },
  brandDisplayText: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1
  },
  brandEditIcon: {
    fontSize: 20,
    marginLeft: 12
  },
  appDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1
  },
  appDisclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1
  }
});
