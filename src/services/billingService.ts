/**
 * Billing Service for Google Play In-App Purchases
 * Handles subscriptions and one-time purchases (scan packs)
 */
import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getAvailablePurchases,
  acknowledgePurchaseAndroid,
  type Purchase,
  type PurchaseAndroid,
  type Product,
  type ProductOrSubscription,
  type PurchaseError,
  type EventSubscription,
} from 'react-native-iap';

// Product IDs - must match Google Play Console
export const SUBSCRIPTION_PRODUCT_IDS = [
  'foodtruck_starter',
  'foodtruck_pro',
  'restaurant_standard',
  'restaurant_premium',
  'school_security',
];

export const CONSUMABLE_PRODUCT_IDS = [
  'pack_small',
  'pack_medium',
  'pack_large',
  'pack_xlarge',
];

// Map pack IDs to scan quantities
export const PACK_QUANTITIES: Record<string, number> = {
  pack_small: 100,
  pack_medium: 500,
  pack_large: 1000,
  pack_xlarge: 2500,
};

export type BillingProduct = ProductOrSubscription;

let isConnected = false;
let purchaseUpdateSubscription: EventSubscription | null = null;
let purchaseErrorSubscription: EventSubscription | null = null;

/**
 * Initialize connection to Google Play Billing
 */
export async function initializeBilling(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.log('[billingService] Not on Android, skipping IAP initialization');
    return false;
  }

  try {
    const result = await initConnection();
    isConnected = true;
    console.log('[billingService] Google Play Billing connected:', result);
    return true;
  } catch (error) {
    console.error('[billingService] Failed to connect to Google Play Billing:', error);
    isConnected = false;
    return false;
  }
}

/**
 * End connection to Google Play Billing
 */
export async function endBilling(): Promise<void> {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }

  if (isConnected) {
    await endConnection();
    isConnected = false;
    console.log('[billingService] Google Play Billing disconnected');
  }
}

/**
 * Setup purchase listeners
 */
export function setupPurchaseListeners(
  onPurchaseSuccess: (purchase: Purchase) => Promise<void>,
  onPurchaseError: (error: PurchaseError) => void
): void {
  // Remove existing listeners if any
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
  }

  purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
    console.log('[billingService] Purchase updated:', purchase);

    if (purchase.purchaseState === 'purchased') {
      try {
        // Acknowledge the purchase if not already acknowledged (Android)
        if (Platform.OS === 'android' && purchase.purchaseToken) {
          const androidPurchase = purchase as PurchaseAndroid;
          if (!androidPurchase.isAcknowledgedAndroid) {
            await acknowledgePurchaseAndroid(purchase.purchaseToken);
          }
        }

        // Notify the callback
        await onPurchaseSuccess(purchase);

        // Finish the transaction
        await finishTransaction({
          purchase,
          isConsumable: isConsumablePurchase(purchase),
        });
        console.log('[billingService] Transaction finished for:', purchase.productId);
      } catch (error) {
        console.error('[billingService] Error processing purchase:', error);
      }
    }
  });

  purchaseErrorSubscription = purchaseErrorListener((error) => {
    console.error('[billingService] Purchase error:', error);
    onPurchaseError(error);
  });
}

/**
 * Check if a purchase is a consumable (scan pack) vs subscription
 */
function isConsumablePurchase(purchase: Purchase): boolean {
  return CONSUMABLE_PRODUCT_IDS.includes(purchase.productId);
}

/**
 * Get available subscription products from Google Play
 */
export async function getAvailableSubscriptions(): Promise<BillingProduct[]> {
  if (!isConnected) {
    await initializeBilling();
  }

  try {
    const subscriptions = await fetchProducts({ skus: SUBSCRIPTION_PRODUCT_IDS, type: 'subs' });
    console.log('[billingService] Available subscriptions:', subscriptions);
    return subscriptions || [];
  } catch (error) {
    console.error('[billingService] Failed to get subscriptions:', error);
    return [];
  }
}

/**
 * Get available consumable products (scan packs) from Google Play
 */
export async function getAvailableScanPacks(): Promise<BillingProduct[]> {
  if (!isConnected) {
    await initializeBilling();
  }

  try {
    const products = await fetchProducts({ skus: CONSUMABLE_PRODUCT_IDS, type: 'in-app' });
    console.log('[billingService] Available scan packs:', products);
    return products || [];
  } catch (error) {
    console.error('[billingService] Failed to get scan packs:', error);
    return [];
  }
}

/**
 * Purchase a subscription
 */
export async function purchaseSubscription(productId: string, offerToken?: string): Promise<void> {
  if (!isConnected) {
    await initializeBilling();
  }

  if (!SUBSCRIPTION_PRODUCT_IDS.includes(productId)) {
    throw new Error(`Invalid subscription product ID: ${productId}`);
  }

  console.log('[billingService] Purchasing subscription:', productId);

  try {
    await requestPurchase({
      request: {
        google: {
          skus: [productId],
          ...(offerToken && { subscriptionOffers: [{ sku: productId, offerToken }] }),
        },
      },
      type: 'subs',
    });
  } catch (error) {
    console.error('[billingService] Subscription purchase failed:', error);
    throw error;
  }
}

/**
 * Purchase a scan pack (consumable)
 */
export async function purchaseScanPack(productId: string): Promise<void> {
  if (!isConnected) {
    await initializeBilling();
  }

  if (!CONSUMABLE_PRODUCT_IDS.includes(productId)) {
    throw new Error(`Invalid scan pack product ID: ${productId}`);
  }

  console.log('[billingService] Purchasing scan pack:', productId);

  try {
    await requestPurchase({
      request: {
        google: {
          skus: [productId],
        },
      },
      type: 'in-app',
    });
  } catch (error) {
    console.error('[billingService] Scan pack purchase failed:', error);
    throw error;
  }
}

/**
 * Restore previous purchases (subscriptions)
 */
export async function restorePurchases(): Promise<Purchase[]> {
  if (!isConnected) {
    await initializeBilling();
  }

  try {
    const purchases = await getAvailablePurchases();
    console.log('[billingService] Restored purchases:', purchases);
    return purchases || [];
  } catch (error) {
    console.error('[billingService] Failed to restore purchases:', error);
    return [];
  }
}

/**
 * Check if billing is available on this device
 */
export function isBillingAvailable(): boolean {
  return Platform.OS === 'android' && isConnected;
}

/**
 * Get the quantity of scans for a pack ID
 */
export function getScanPackQuantity(packId: string): number {
  return PACK_QUANTITIES[packId] || 0;
}
