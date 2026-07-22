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
// NB : "restaurant_premium(_yearly)" (Advanced) retiré de l'offre le 22/07/2026.
export const SUBSCRIPTION_PRODUCT_IDS = [
  // Monthly
  'starter_basic',
  'foodtruck_starter',
  'foodtruck_pro',
  'restaurant_standard',
  'school_security',
  // Yearly (2 months free)
  'starter_basic_yearly',
  'foodtruck_starter_yearly',
  'foodtruck_pro_yearly',
  'restaurant_standard_yearly',
  'school_security_yearly',
];

// Nouvelle grille de packs (22/07/2026). Nouveaux SKUs — les anciens
// pack_small/medium/large/xlarge sont abandonnés.
export const CONSUMABLE_PRODUCT_IDS = [
  'pack_10',
  'pack_50',
  'pack_100',
  'pack_210',
];

// Map pack IDs to scan quantities
export const PACK_QUANTITIES: Record<string, number> = {
  pack_10: 10,
  pack_50: 50,
  pack_100: 100,
  pack_210: 210,
};

export type BillingProduct = ProductOrSubscription;

let isConnected = false;
let purchaseUpdateSubscription: EventSubscription | null = null;
let purchaseErrorSubscription: EventSubscription | null = null;

/**
 * Initialize connection to the store (Google Play or App Store)
 */
export async function initializeBilling(): Promise<boolean> {
  try {
    const result = await initConnection();
    isConnected = true;
    console.log('[billingService] Store connection established:', result);
    return true;
  } catch (error) {
    console.error('[billingService] Failed to connect to store:', error);
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
 * Get available subscription products from Google Play / App Store.
 *
 * Resilient strategy: try a single batch call first, but if the store returns
 * an empty list (often because one SKU is misconfigured and the whole batch
 * fails silently on iOS), fall back to fetching SKUs one-by-one so that
 * correctly-configured products still surface to the user.
 */
export async function getAvailableSubscriptions(): Promise<BillingProduct[]> {
  if (!isConnected) {
    await initializeBilling();
  }

  // Try batch fetch first (fastest happy path)
  try {
    const subscriptions = await fetchProducts({ skus: SUBSCRIPTION_PRODUCT_IDS, type: 'subs' });
    console.log(
      `[billingService] Batch fetch returned ${subscriptions?.length ?? 0} subscriptions out of ${SUBSCRIPTION_PRODUCT_IDS.length} requested`
    );
    if (subscriptions && subscriptions.length > 0) {
      return subscriptions;
    }
    console.warn('[billingService] Batch fetch returned 0 subscriptions, falling back to per-SKU fetch');
  } catch (error) {
    console.error('[billingService] Batch subscription fetch failed:', error);
  }

  // Fallback: fetch SKUs one by one. Slow but resilient to a single broken SKU.
  const results: BillingProduct[] = [];
  for (const sku of SUBSCRIPTION_PRODUCT_IDS) {
    try {
      const single = await fetchProducts({ skus: [sku], type: 'subs' });
      if (single && single.length > 0) {
        results.push(...single);
      } else {
        console.warn(`[billingService] SKU not available in store: ${sku}`);
      }
    } catch (err) {
      console.warn(`[billingService] Failed to fetch SKU ${sku}:`, err);
    }
  }
  console.log(`[billingService] Per-SKU fallback recovered ${results.length} subscriptions`);
  return results;
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
      request: Platform.OS === 'android'
        ? {
            google: {
              skus: [productId],
              ...(offerToken && { subscriptionOffers: [{ sku: productId, offerToken }] }),
            },
          }
        : {
            // react-native-iap v14: iOS expects a single `sku`, not `skus`.
            // Passing `skus` silently fails type-validation and the purchase
            // dialog never opens — root cause of part of Apple's 2.1(b) flag.
            apple: { sku: productId },
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
      request: Platform.OS === 'android'
        ? { google: { skus: [productId] } }
        : { apple: { sku: productId } },
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
  return isConnected;
}

/**
 * Get the quantity of scans for a pack ID
 */
export function getScanPackQuantity(packId: string): number {
  return PACK_QUANTITIES[packId] || 0;
}
