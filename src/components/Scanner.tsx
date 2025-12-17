import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useTheme } from '../theme/themeContext';

type ScannerMode = 'barcode' | 'photo';

type ScannerProps = {
  onCapture: (uri: string) => Promise<void> | void;
  onBarcodeScanned?: (barcode: string) => void;
  isProcessing?: boolean;
  enableBarcodeScanning?: boolean;
  mode?: ScannerMode; // 'barcode' pour scan code-barres, 'photo' pour capture photo
  resetToken?: number; // change pour forcer un remount de la camÇ¸ra
};

export function Scanner({ onCapture, onBarcodeScanned, isProcessing = false, enableBarcodeScanning = false, mode = 'photo', resetToken }: ScannerProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = useCallback((scanningResult: BarcodeScanningResult) => {
    if (!enableBarcodeScanning || isProcessing || !onBarcodeScanned) {
      return;
    }

    const barcode = scanningResult.data;

    // Éviter les scans multiples du même code-barres
    if (barcode && barcode !== scannedBarcode) {
      console.log('[Scanner] Barcode scanned:', barcode);
      setScannedBarcode(barcode);
      onBarcodeScanned(barcode);
    }
  }, [enableBarcodeScanning, isProcessing, onBarcodeScanned, scannedBarcode]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isProcessing || !cameraReady) {
      return;
    }

    try {
      console.log('Starting capture...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8
      });
      console.log('Photo captured:', photo);

      if (photo?.uri) {
        await onCapture(photo.uri);
      }
    } catch (error) {
      console.warn('Capture failed', error);
      console.error('Full error:', JSON.stringify(error, null, 2));
    }
  }, [isProcessing, onCapture, cameraReady]);

  // Forcer un reset (remontage) du composant camÇ¸ra
  useEffect(() => {
    setScannedBarcode(null);
    setCameraReady(false);
  }, [resetToken]);

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={[styles.permissionText, { color: colors.textPrimary }]}>
          Chargement des autorisations caméra...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={[styles.permissionText, { color: colors.textPrimary }]}>
          Nous avons besoin d'accéder à votre appareil photo pour scanner les emballages.
        </Text>
        <TouchableOpacity style={[styles.permissionButton, { backgroundColor: colors.accent }]} onPress={requestPermission}>
          <Text style={[styles.permissionButtonText, { color: colors.surface }]}>Autoriser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrapper}>
        <CameraView
          key={resetToken}
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
          barcodeScannerSettings={
            enableBarcodeScanning
              ? {
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39']
                }
              : undefined
          }
          onBarcodeScanned={enableBarcodeScanning ? handleBarcodeScanned : undefined}
        />
        <View pointerEvents="none" style={styles.overlay}>
          {mode === 'barcode' ? (
            // Cible carrée pour le scan de code-barres
            <View style={styles.barcodeTarget}>
              <View style={[styles.corner, styles.topLeft, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: colors.accent }]} />
            </View>
          ) : (
            // Cadre classique pour la capture photo
            <View style={[styles.frame, { borderColor: colors.accent }]} />
          )}
        </View>
      </View>
      {mode === 'photo' && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.captureButton, { borderColor: colors.surface, backgroundColor: 'rgba(0,0,0,0.3)' }]}
            onPress={handleCapture}
            disabled={!cameraReady || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={styles.cameraIcon}>📸</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

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
    bottom: 40,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  captureInner: {
    width: 48,
    height: 48,
    borderRadius: 24
  },
  cameraIcon: {
    fontSize: 36
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
    marginBottom: 16
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600'
  }
});
