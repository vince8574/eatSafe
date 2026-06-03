import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';

type ScannerMode = 'barcode' | 'photo' | 'band';

export type CoachingHint = 'blur' | 'tooFar' | 'tooClose';

export type ScannerHandle = {
  triggerCapture: () => Promise<void>;
  setFlash: (on: boolean) => void;
  isFlashOn: () => boolean;
};

type ScannerProps = {
  onCapture: (uri: string) => Promise<void> | void;
  onBarcodeScanned?: (barcode: string) => void;
  isProcessing?: boolean;
  enableBarcodeScanning?: boolean;
  mode?: ScannerMode;
  resetToken?: number;
  enableFlashToggle?: boolean;
  aiMessage?: string;
  onSkip?: () => void;
  onReload?: () => void;
  onManualEntry?: () => void;
  onBack?: () => void;
  onRestart?: () => void;
  flashPosition?: 'top-left' | 'top-right';
  previewOcrEnabled?: boolean;
  previewOcrIntervalMs?: number;
  onPreviewOcrText?: (text: string) => void;
  lowLightDetectionEnabled?: boolean;
  onLowLight?: (isLow: boolean) => void;
  onCoachingHint?: (hint: CoachingHint) => void;
  hideCaptureButton?: boolean;
};

const DEFAULT_PREVIEW_OCR_INTERVAL_MS = 1800;
const LOW_LIGHT_EMPTY_THRESHOLD = 3;

export const Scanner = forwardRef<ScannerHandle, ScannerProps>(function Scanner(
  {
    onCapture,
    onBarcodeScanned,
    isProcessing = false,
    enableBarcodeScanning = false,
    mode = 'photo',
    resetToken,
    enableFlashToggle = true,
    aiMessage,
    onSkip,
    onReload,
    onManualEntry,
    onBack,
    onRestart,
    flashPosition = 'top-left',
    previewOcrEnabled = false,
    previewOcrIntervalMs = DEFAULT_PREVIEW_OCR_INTERVAL_MS,
    onPreviewOcrText,
    lowLightDetectionEnabled = false,
    onLowLight,
    onCoachingHint,
    hideCaptureButton = false
  },
  ref
) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);

  const flashOnRef = useRef(flashOn);
  flashOnRef.current = flashOn;

  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;

  const previewOcrLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewOcrInFlightRef = useRef(false);
  const emptyOcrStreakRef = useRef(0);
  const lowLightActiveRef = useRef(false);
  const lastCoachingHintRef = useRef<{ hint: CoachingHint; at: number } | null>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = useCallback(
    (scanningResult: BarcodeScanningResult) => {
      if (!enableBarcodeScanning || isProcessing || !onBarcodeScanned) {
        return;
      }
      const barcode = scanningResult.data;
      if (barcode && barcode !== scannedBarcode) {
        console.log('[Scanner] Barcode scanned:', barcode);
        setScannedBarcode(barcode);
        onBarcodeScanned(barcode);
      }
    },
    [enableBarcodeScanning, isProcessing, onBarcodeScanned, scannedBarcode]
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isProcessingRef.current || !cameraReady) {
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0,
        skipProcessing: false,
        shutterSound: false
      });
      if (photo?.uri) {
        await onCapture(photo.uri);
      }
    } catch (error) {
      console.warn('Capture failed', error);
    }
  }, [cameraReady, onCapture]);

  const emitCoachingHint = useCallback(
    (hint: CoachingHint) => {
      if (!onCoachingHint) return;
      const now = Date.now();
      const last = lastCoachingHintRef.current;
      if (last && last.hint === hint && now - last.at < 4000) return;
      lastCoachingHintRef.current = { hint, at: now };
      onCoachingHint(hint);
    },
    [onCoachingHint]
  );

  const runPreviewOcrTick = useCallback(async () => {
    if (previewOcrInFlightRef.current) return;
    if (isProcessingRef.current) return;
    if (!cameraRef.current) return;

    previewOcrInFlightRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        skipProcessing: true,
        shutterSound: false,
        exif: false
      });
      if (!photo?.uri) return;

      const result = await TextRecognition.recognize(photo.uri);
      const text = (result?.text ?? '').trim();

      if (lowLightDetectionEnabled && onLowLight) {
        if (text.length === 0) {
          emptyOcrStreakRef.current += 1;
          if (
            !lowLightActiveRef.current &&
            emptyOcrStreakRef.current >= LOW_LIGHT_EMPTY_THRESHOLD
          ) {
            lowLightActiveRef.current = true;
            onLowLight(true);
          }
        } else {
          emptyOcrStreakRef.current = 0;
          if (lowLightActiveRef.current) {
            lowLightActiveRef.current = false;
            onLowLight(false);
          }
        }
      }

      if (onCoachingHint && text.length > 0 && photo.width) {
        if (text.length < 5) {
          emitCoachingHint('tooFar');
        } else {
          const widestBlock = result.blocks.reduce((max, b) => {
            const w = b.frame?.width ?? 0;
            return w > max ? w : max;
          }, 0);
          if (widestBlock > 0 && widestBlock > photo.width * 0.85) {
            emitCoachingHint('tooClose');
          }
        }
      }

      if (text.length > 0 && onPreviewOcrText) {
        onPreviewOcrText(text);
      }
    } catch (error) {
      // ML Kit failures on partial frames are expected — don't spam logs.
    } finally {
      previewOcrInFlightRef.current = false;
    }
  }, [emitCoachingHint, lowLightDetectionEnabled, onCoachingHint, onLowLight, onPreviewOcrText]);

  useEffect(() => {
    if (!previewOcrEnabled || !cameraReady) {
      if (previewOcrLoopRef.current) {
        clearTimeout(previewOcrLoopRef.current);
        previewOcrLoopRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      previewOcrLoopRef.current = setTimeout(async () => {
        await runPreviewOcrTick();
        if (!cancelled) schedule();
      }, previewOcrIntervalMs);
    };
    schedule();

    return () => {
      cancelled = true;
      if (previewOcrLoopRef.current) {
        clearTimeout(previewOcrLoopRef.current);
        previewOcrLoopRef.current = null;
      }
    };
  }, [previewOcrEnabled, cameraReady, previewOcrIntervalMs, runPreviewOcrTick]);

  useEffect(() => {
    setScannedBarcode(null);
    setCameraReady(false);
    setFlashOn(false);
    emptyOcrStreakRef.current = 0;
    lowLightActiveRef.current = false;
    lastCoachingHintRef.current = null;
  }, [resetToken]);

  useImperativeHandle(
    ref,
    () => ({
      triggerCapture: handleCapture,
      setFlash: (on: boolean) => setFlashOn(on),
      isFlashOn: () => flashOnRef.current
    }),
    [handleCapture]
  );

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={[styles.permissionText, { color: colors.textPrimary }]}>
          {t('scanner.cameraLoading')}
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    // iOS ne réaffiche pas le prompt système une fois la permission refusée
    // (canAskAgain === false) : on renvoie alors vers les Réglages du téléphone.
    const handlePermissionPress = permission.canAskAgain
      ? requestPermission
      : () => Linking.openSettings();
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={48} color={colors.accent} style={{ marginBottom: 16 }} />
        <Text style={[styles.permissionText, { color: colors.textPrimary }]}>
          {permission.canAskAgain
            ? t('scanner.cameraPermissionNeeded')
            : t('scanner.cameraPermissionDenied')}
        </Text>
        <TouchableOpacity style={[styles.permissionButton, { backgroundColor: colors.accent }]} onPress={handlePermissionPress}>
          <Text style={[styles.permissionButtonText, { color: colors.surface }]}>
            {permission.canAskAgain ? t('scanner.allowCamera') : t('scanner.openSettings')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showCapture = (mode === 'photo' || mode === 'band') && !hideCaptureButton;

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrapper}>
        <CameraView
          key={resetToken}
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          flash={flashOn ? 'on' : 'off'}
          enableTorch={flashOn}
          onCameraReady={() => setCameraReady(true)}
          barcodeScannerSettings={
            enableBarcodeScanning
              ? {
                  barcodeTypes: [
                    'qr',
                    'ean13',
                    'ean8',
                    'upc_a',
                    'upc_e',
                    'code128',
                    'code39',
                    'code93',
                    'codabar',
                    'itf14',
                    'aztec',
                    'pdf417',
                    'datamatrix'
                  ]
                }
              : undefined
          }
          onBarcodeScanned={enableBarcodeScanning ? handleBarcodeScanned : undefined}
        />

        {/* Back button */}
        {onBack && (
          <TouchableOpacity
            style={[styles.backButtonTop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={24} color={colors.surface} />
          </TouchableOpacity>
        )}

        {/* Flash button */}
        {enableFlashToggle && (
          <TouchableOpacity
            style={flashPosition === 'top-right' ? styles.flashButtonTopRight : styles.flashButtonTop}
            onPress={() => setFlashOn((prev) => !prev)}
            disabled={!cameraReady}
          >
            <View style={[styles.flashIconContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <Ionicons
                name={flashOn ? 'flash' : 'flash-off'}
                size={22}
                color={flashOn ? '#FFD700' : colors.surface}
              />
              {flashOn && <View style={styles.flashActiveDot} />}
            </View>
          </TouchableOpacity>
        )}

        {/* Reload button */}
        {onReload && (
          <TouchableOpacity
            style={[styles.reloadButtonCamera, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={onReload}
          >
            <Ionicons name="refresh" size={24} color={colors.surface} />
          </TouchableOpacity>
        )}

        {/* Manual entry button */}
        {onManualEntry && (
          <TouchableOpacity
            style={[styles.manualEntryButtonCamera, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={onManualEntry}
          >
            <Ionicons name="create-outline" size={22} color={colors.surface} />
          </TouchableOpacity>
        )}

        {/* Restart button */}
        {onRestart && (
          <TouchableOpacity
            style={[styles.restartButtonCamera, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={onRestart}
          >
            <Ionicons name="refresh-circle" size={28} color={colors.surface} />
          </TouchableOpacity>
        )}

        {/* Skip button */}
        {onSkip && (
          <TouchableOpacity
            style={[styles.skipButtonCamera, { backgroundColor: colors.accent }]}
            onPress={onSkip}
          >
            <Text style={[styles.skipButtonText, { color: colors.surface }]}>{t('scanner.skip')}</Text>
            <Ionicons name="play-skip-forward" size={18} color={colors.surface} />
          </TouchableOpacity>
        )}

        <View pointerEvents="none" style={styles.tipContainer}>
          <View style={styles.tipBubble}>
            <Ionicons name="information-circle-outline" size={16} color="#FFF" />
            <Text style={styles.tipText}>
              {mode === 'barcode'
                ? t('scanner.tipBarcode')
                : mode === 'band'
                  ? t('scanner.tipBand')
                  : t('scanner.tipPhoto')}
            </Text>
          </View>
        </View>

        <View pointerEvents="none" style={styles.overlay}>
          {mode === 'barcode' ? (
            <View style={styles.barcodeTarget}>
              <View style={[styles.corner, styles.topLeft, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: colors.accent }]} />
            </View>
          ) : mode === 'band' ? (
            <>
              <View style={[styles.bandFrame, { borderColor: colors.accent }]}>
                <View style={[styles.bandCorner, styles.bandTopLeft, { borderColor: colors.accent }]} />
                <View style={[styles.bandCorner, styles.bandTopRight, { borderColor: colors.accent }]} />
                <View style={[styles.bandCorner, styles.bandBottomLeft, { borderColor: colors.accent }]} />
                <View style={[styles.bandCorner, styles.bandBottomRight, { borderColor: colors.accent }]} />
              </View>
              {aiMessage && (
                <View style={[styles.aiMessageContainer, { backgroundColor: 'rgba(46, 125, 50, 0.9)' }]}>
                  <Ionicons name="sparkles" size={14} color="#FFF" />
                  <Text style={[styles.aiMessageText, { color: colors.surface }]}>
                    {aiMessage}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={[styles.frame, { borderColor: colors.accent }]} />
          )}
        </View>
      </View>

      {showCapture && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.captureButton, { borderColor: colors.surface, backgroundColor: 'rgba(0,0,0,0.3)' }]}
            onPress={handleCapture}
            disabled={!cameraReady || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Ionicons name="camera" size={28} color={colors.surface} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  cameraWrapper: {
    flex: 1
  },
  camera: {
    ...StyleSheet.absoluteFillObject
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center'
  },
  frame: {
    width: '75%',
    aspectRatio: 1,
    borderWidth: 3,
    borderRadius: 24
  },
  barcodeTarget: {
    width: 280,
    height: 280,
    position: 'relative'
  },
  bandFrame: {
    width: '90%',
    height: '22%',
    borderWidth: 3,
    borderRadius: 14,
    position: 'relative'
  },
  bandCorner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderWidth: 4
  },
  bandTopLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  bandTopRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0
  },
  bandBottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0
  },
  bandBottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderWidth: 4
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  controls: {
    position: 'absolute',
    bottom: 32,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  flashButtonTop: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10
  },
  flashIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  flashActiveDot: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700'
  },
  flashButtonTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10
  },
  backButtonTop: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    zIndex: 10
  },
  restartButtonCamera: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    zIndex: 10
  },
  skipButtonCamera: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    zIndex: 10
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  reloadButtonCamera: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    zIndex: 10
  },
  manualEntryButtonCamera: {
    position: 'absolute',
    bottom: 20,
    left: 88,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    zIndex: 10
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  permissionText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24
  },
  permissionButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },
  aiMessageContainer: {
    position: 'absolute',
    bottom: -60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: '80%'
  },
  aiMessageText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18
  },
  tipContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5
  },
  tipBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    maxWidth: '85%'
  },
  tipText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1
  }
});
