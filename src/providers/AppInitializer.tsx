import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { registerBackgroundTask } from '../services/backgroundService';
import { setupNotificationHandler } from '../services/notificationService';
import { initializeAppCheck } from '../services/appCheckService';
import { useDatabaseWarmup } from '../services/dbService';
import { purgeExpiredScans } from '../utils/dataCleanup';
import { registerBackgroundRecallCheck, getAndClearNewRecalls } from '../services/backgroundRecallCheck';
import { RecallAlertModal } from '../components/RecallAlertModal';
import { useScannedProducts, syncProductsToAsyncStorage } from '../hooks/useScannedProducts';
import { migrateLocalScansToFirestore } from '../services/productMigrationService';
import { getAllProducts, updateProduct as updateFirestoreProduct } from '../services/firebaseProductsService';
import { fetchRecallsByCountry } from '../services/apiService';
import { getRecallStatus } from '../utils/lotMatcher';
import type { ScannedProduct } from '../types';

export function AppInitializer() {
  useDatabaseWarmup();
  const { products, updateRecall } = useScannedProducts();
  const [alertProducts, setAlertProducts] = useState<ScannedProduct[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  useEffect(() => {
    void initializeAppCheck();
    setupNotificationHandler();
    void registerBackgroundTask();
    // Notification permissions are now requested via dedicated screen
    void registerBackgroundRecallCheck();

    // Migrer les produits SQLite vers Firestore (une seule fois)
    void migrateLocalScansToFirestore().then((result) => {
      if (result.success && result.migrated > 0) {
        console.log(`[AppInitializer] Migration complete: ${result.migrated} products migrated`);
      }
    });

    // Synchroniser les produits Firestore vers AsyncStorage au démarrage
    void syncProductsToAsyncStorage();

    // Résoudre tous les produits bloqués en statut 'unknown'
    const resolveUnknownProducts = async () => {
      try {
        const allProducts = await getAllProducts();
        const unknownProducts = allProducts.filter((p) => p.recallStatus === 'unknown');
        if (unknownProducts.length === 0) return;

        console.log(`[AppInitializer] Resolving ${unknownProducts.length} unknown products`);
        const recalls = await fetchRecallsByCountry('US');

        for (const product of unknownProducts) {
          const result = getRecallStatus(product, recalls);
          if (result.status === 'recalled') {
            const matchingRecalls = recalls.filter((r) => getRecallStatus(product, [r]).status === 'recalled');
            await updateFirestoreProduct(product.id, {
              recallStatus: 'recalled',
              recallReference: result.recallReference,
              lastCheckedAt: Date.now()
            });
            // Notify the UI via the hook
            updateRecall(product, matchingRecalls);
          } else {
            await updateFirestoreProduct(product.id, { recallStatus: 'safe', lastCheckedAt: Date.now() });
          }
        }
        console.log(`[AppInitializer] Resolved ${unknownProducts.length} unknown products`);
      } catch (error) {
        console.error('[AppInitializer] Failed to resolve unknown products:', error);
      }
    };
    void resolveUnknownProducts();

    // Vérifier s'il y a de nouveaux rappels au démarrage
    const checkNewRecalls = async () => {
      const newRecalls = await getAndClearNewRecalls();
      if (newRecalls.length > 0) {
        console.log(`[AppInitializer] Found ${newRecalls.length} new recalls to display`);

        // Mettre à jour les produits avec les nouveaux rappels
        const recalledProducts: ScannedProduct[] = [];
        for (const result of newRecalls) {
          if (result.newRecalls.length > 0) {
            // Ajouter à la liste des produits à afficher
            const product = products.find((p) => p.id === result.productId);

            // Mettre à jour le produit
            if (product) {
              updateRecall(product, result.newRecalls);
            }
            if (product) {
              recalledProducts.push(product);
            }
          }
        }

        if (recalledProducts.length > 0) {
          setAlertProducts(recalledProducts);
          setShowAlert(true);
        }
      }
    };

    void checkNewRecalls();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void purgeExpiredScans();
        void syncProductsToAsyncStorage();
        void checkNewRecalls();
      }
    });

    void purgeExpiredScans();

    return () => subscription.remove();
  }, []);

  return (
    <RecallAlertModal
      visible={showAlert}
      onClose={() => setShowAlert(false)}
      products={alertProducts}
    />
  );
}
