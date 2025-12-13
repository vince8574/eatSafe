import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useTheme } from '../theme/themeContext';

type ScannerProps = {
  onCapture: (uri: string) => Promise<void> | void;
  onBarcodeScanned?: (barcode: string) => void;
  isProcessing?: boolean;
  enableBarcodeScanning?: boolean;
};

export function Scanner({ onCapture, onBarcodeScanned, isProcessing = false, enableBarcodeScanning = false }: ScannerProps) {
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
          <View style={[styles.frame, { borderColor: colors.accent }]} />
        </View>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.captureButton, { borderColor: colors.textPrimary }]}
          onPress={handleCapture}
          disabled={!cameraReady || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <View style={[styles.captureInner, { backgroundColor: colors.accent }]} />
          )}
        </TouchableOpacity>
      </View>
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
  controls: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  captureInner: {
    width: 48,
    height: 48,
    borderRadius: 24
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
