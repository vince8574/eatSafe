import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAllProductsForRecalls } from './recallCheckService';
import type { ScannedProduct, CountryCode } from '../types';

/**
 * Test notification service to manually trigger recall checks and notifications
 * Useful for debugging and testing without waiting for background tasks
 */

/**
 * Send a test notification to verify notifications are working
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    console.log('[TestNotification] Sending test notification...');

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Test de notification',
        body: 'Les notifications fonctionnent correctement! Vous recevrez des alertes si un produit scanné est rappelé.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'test'
        }
      },
      trigger: null // Send immediately
    });

    console.log('[TestNotification] Test notification sent successfully');
    return true;
  } catch (error) {
    console.error('[TestNotification] Failed to send test notification:', error);
    return false;
  }
}

/**
 * Manually trigger a recall check for all scanned products
 * This simulates what the background task does
 */
export async function manualRecallCheck(): Promise<{
  success: boolean;
  productsChecked: number;
  newRecallsFound: number;
  error?: string;
}> {
  try {
    console.log('[TestNotification] Starting manual recall check...');

    // Get products from AsyncStorage (same as background task)
    const productsJson = await AsyncStorage.getItem('scanned-products');
    const country = (await AsyncStorage.getItem('country')) as CountryCode | null;

    if (!productsJson) {
      console.log('[TestNotification] No products found in AsyncStorage');
      return {
        success: false,
        productsChecked: 0,
        newRecallsFound: 0,
        error: 'Aucun produit trouvé. Scannez un produit d\'abord.'
      };
    }

    if (!country) {
      console.log('[TestNotification] No country set');
      return {
        success: false,
        productsChecked: 0,
        newRecallsFound: 0,
        error: 'Pays non configuré'
      };
    }

    const products: ScannedProduct[] = JSON.parse(productsJson);
    console.log(`[TestNotification] Found ${products.length} products to check`);

    if (products.length === 0) {
      return {
        success: false,
        productsChecked: 0,
        newRecallsFound: 0,
        error: 'Aucun produit à vérifier. Scannez un produit d\'abord.'
      };
    }

    // Check for recalls
    const results = await checkAllProductsForRecalls(products, country);
    console.log(`[TestNotification] Check complete. ${results.length} products with recalls found`);

    let totalNewRecalls = 0;

    // Send notifications for new recalls
    for (const result of results) {
      if (result.newRecalls.length > 0) {
        const product = products.find((p) => p.id === result.productId);
        if (product) {
          totalNewRecalls += result.newRecalls.length;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🚨 ALERTE PRODUIT RAPPELÉ',
              body: `⚠️ ${product.brand} - Lot ${product.lotNumber}\n\n🚫 NE PAS CONSOMMER\nOuvrez l'application pour plus de détails.`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: [0, 250, 250, 250],
              data: {
                productId: product.id,
                type: 'recall-alert'
              }
            },
            trigger: null
          });

          console.log(`[TestNotification] Sent notification for product ${product.id}`);
        }
      }
    }

    if (totalNewRecalls === 0) {
      // Send success notification if no recalls found
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Vérification terminée',
          body: `Aucun rappel détecté pour vos ${products.length} produit(s) scanné(s). Tout est OK!`,
          sound: false,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          data: {
            type: 'check-complete'
          }
        },
        trigger: null
      });
    }

    return {
      success: true,
      productsChecked: products.length,
      newRecallsFound: totalNewRecalls
    };
  } catch (error) {
    console.error('[TestNotification] Manual check failed:', error);
    return {
      success: false,
      productsChecked: 0,
      newRecallsFound: 0,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Get notification permissions status
 */
export async function getNotificationStatus(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();

    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
      status
    };
  } catch (error) {
    console.error('[TestNotification] Failed to get notification status:', error);
    return {
      granted: false,
      canAskAgain: false,
      status: 'error'
    };
  }
}
