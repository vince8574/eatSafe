import firestore from '@react-native-firebase/firestore';
import { getFirestore } from './firebaseService';
import { getCurrentUserId } from './authService';
import { getCurrentOrganization } from './organizationService';
import { SUBSCRIPTION_PLANS, SCAN_PACKS, getPlanById as getSubscriptionPlanById } from '../constants/subscriptionPlans';
import {
  initializeBilling,
  endBilling,
  setupPurchaseListeners,
  getAvailableSubscriptions,
  getAvailableScanPacks,
  purchaseSubscription as billingPurchaseSubscription,
  purchaseScanPack as billingPurchaseScanPack,
  restorePurchases,
  getScanPackQuantity,
  isBillingAvailable,
  type BillingProduct,
} from './billingService';

export type SubscriptionStatus = 'none' | 'active' | 'expired';

export type Subscription = {
  planId: string | null;
  planName: string | null;
  status: SubscriptionStatus;
  expiresAt: number | null;
  scansIncluded: number;
  scansRemaining: number;
  historyRetentionDays: number | 'unlimited';
  exportEnabled: boolean;
  exportFormats: ('pdf' | 'csv' | 'xlsx')[];
  regulatoryFormat: boolean;
  employeesLimit: number | null;
  sitesLimit: number | null;
  updatedAt: number;
};

// Exporter les plans et packs pour useSubscription
export const PLANS = SUBSCRIPTION_PLANS.map(plan => ({
  id: plan.id,
  labelKey: plan.labelKey,
  price: plan.price,
  scansIncluded: plan.scansIncluded,
  historyRetentionDays: plan.historyRetentionDays,
  exportEnabled: plan.exportEnabled,
  employeesLimit: plan.employeesLimit,
  sitesLimit: plan.sitesLimit,
  descriptionKeys: plan.descriptionKeys
}));

export { SCAN_PACKS };

const COLLECTION = 'subscriptions';

/**
 * Récupère l'ID de scope pour l'abonnement
 * Si l'utilisateur fait partie d'une organisation, retourne l'ID de l'organisation
 * Sinon, retourne l'ID de l'utilisateur (pour les utilisateurs individuels)
 */
async function getSubscriptionScopeId(): Promise<string> {
  const organization = await getCurrentOrganization();

  if (organization) {
    return organization.id; // Abonnement au niveau organisation
  }

  // Fallback: abonnement au niveau utilisateur
  return await getCurrentUserId();
}

function buildSubscriptionFromPlan(planId: string): Subscription {
  const plan = getSubscriptionPlanById(planId);
  if (!plan) {
    throw new Error('Plan inconnu');
  }

  return {
    planId: plan.id,
    planName: plan.labelKey, // Store the translation key
    status: 'active',
    // Placeholder: 30 jours de validité simulée pour dev (les stores prendront le relais plus tard)
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    scansIncluded: plan.scansIncluded,
    scansRemaining: plan.scansIncluded,
    historyRetentionDays: plan.historyRetentionDays,
    exportEnabled: plan.exportEnabled,
    exportFormats: plan.exportFormats,
    regulatoryFormat: plan.regulatoryFormat,
    employeesLimit: plan.employeesLimit,
    sitesLimit: plan.sitesLimit,
    updatedAt: Date.now()
  };
}

export async function fetchSubscription(): Promise<Subscription> {
  const db = getFirestore();
  const scopeId = await getSubscriptionScopeId();
  const docRef = db.collection(COLLECTION).doc(scopeId);
  const snap = await docRef.get();

  if (!snap.exists) {
    const base: Subscription = {
      planId: null,
      planName: null,
      status: 'none',
      expiresAt: null,
      scansIncluded: 0,
      scansRemaining: 0,
      historyRetentionDays: 0,
      exportEnabled: true,  // Activé pour les tests
      exportFormats: ['pdf', 'csv', 'xlsx'],
      regulatoryFormat: true,
      employeesLimit: null,
      sitesLimit: null,
      updatedAt: Date.now()
    };
    await docRef.set(base);
    return base;
  }

  const data = snap.data() as Subscription;
  return {
    ...data,
    planId: data.planId ?? null,
    planName: data.planName ?? null,
    status: data.status ?? 'none',
    expiresAt: data.expiresAt ?? null,
    scansIncluded: data.scansIncluded ?? 0,
    scansRemaining: data.scansRemaining ?? 0,
    historyRetentionDays: (data as any).historyRetentionDays ?? 0,
    exportEnabled: data.exportEnabled ?? true,  // Activé par défaut pour les tests
    exportFormats: data.exportFormats ?? ['pdf', 'csv', 'xlsx'],
    regulatoryFormat: data.regulatoryFormat ?? true,
    employeesLimit: data.employeesLimit ?? null,
    sitesLimit: data.sitesLimit ?? null,
    updatedAt: data.updatedAt ?? Date.now()
  };
}

export async function selectPlan(planId: string): Promise<Subscription> {
  const db = getFirestore();
  const scopeId = await getSubscriptionScopeId();
  const docRef = db.collection(COLLECTION).doc(scopeId);
  const payload = buildSubscriptionFromPlan(planId);
  await docRef.set(payload, { merge: true });

  console.log(`[subscriptionService] Plan ${planId} selected for scope ${scopeId}`);
  return payload;
}

export async function addScanPack(quantity: number): Promise<Subscription> {
  const db = getFirestore();
  const scopeId = await getSubscriptionScopeId();
  const docRef = db.collection(COLLECTION).doc(scopeId);

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists) {
      throw new Error('Aucun abonnement trouvé');
    }
    const data = snap.data() as Subscription;
    const nextRemaining = (data.scansRemaining ?? 0) + quantity;
    transaction.update(docRef, {
      scansRemaining: nextRemaining,
      updatedAt: Date.now()
    });
  });

  const updated = await docRef.get();
  return updated.data() as Subscription;
}

export async function decrementScanCounter(count: number = 1): Promise<void> {
  const db = getFirestore();
  const scopeId = await getSubscriptionScopeId();
  const docRef = db.collection(COLLECTION).doc(scopeId);
  await docRef.update({
    scansRemaining: firestore.FieldValue.increment(-count),
    updatedAt: Date.now()
  });
}

export async function enableExportForTesting(): Promise<void> {
  const db = getFirestore();
  const scopeId = await getSubscriptionScopeId();
  const docRef = db.collection(COLLECTION).doc(scopeId);
  await docRef.set({
    exportEnabled: true,
    updatedAt: Date.now()
  }, { merge: true });
  console.log(`[subscriptionService] Export enabled for testing (scope: ${scopeId})`);
}

// ============= GOOGLE PLAY BILLING INTEGRATION =============

let billingInitialized = false;

/**
 * Initialize the billing service and set up purchase listeners
 */
export async function initBilling(): Promise<boolean> {
  if (billingInitialized) {
    return true;
  }

  const success = await initializeBilling();
  if (success) {
    setupPurchaseListeners(handlePurchaseSuccess, handlePurchaseError);
    billingInitialized = true;
  }
  return success;
}

/**
 * Cleanup billing service
 */
export async function cleanupBilling(): Promise<void> {
  await endBilling();
  billingInitialized = false;
}

/**
 * Handle successful purchase from Google Play
 */
async function handlePurchaseSuccess(purchase: any): Promise<void> {
  const productId = purchase.productId;
  console.log('[subscriptionService] Processing successful purchase:', productId);

  // Check if it's a subscription or a scan pack
  const plan = getSubscriptionPlanById(productId);
  if (plan) {
    // It's a subscription
    await activateSubscription(productId, purchase.transactionId, purchase.purchaseToken);
  } else {
    // It's a scan pack
    const quantity = getScanPackQuantity(productId);
    if (quantity > 0) {
      await addScanPack(quantity);
      console.log(`[subscriptionService] Added ${quantity} scans from pack ${productId}`);
    }
  }
}

/**
 * Handle purchase error
 */
function handlePurchaseError(error: any): void {
  console.error('[subscriptionService] Purchase error:', error);
  // Error handling is done in the UI layer via the hook
}

/**
 * Activate a subscription after successful purchase
 */
async function activateSubscription(
  planId: string,
  transactionId?: string,
  purchaseToken?: string
): Promise<Subscription> {
  const db = getFirestore();
  const scopeId = await getSubscriptionScopeId();
  const docRef = db.collection(COLLECTION).doc(scopeId);
  const plan = getSubscriptionPlanById(planId);

  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  const payload: Subscription & { googlePlayTransactionId?: string; googlePlayPurchaseToken?: string } = {
    planId: plan.id,
    planName: plan.labelKey,
    status: 'active',
    // Google Play manages the actual expiration, this is just for reference
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    scansIncluded: plan.scansIncluded,
    scansRemaining: plan.scansIncluded,
    historyRetentionDays: plan.historyRetentionDays,
    exportEnabled: plan.exportEnabled,
    exportFormats: plan.exportFormats,
    regulatoryFormat: plan.regulatoryFormat,
    employeesLimit: plan.employeesLimit,
    sitesLimit: plan.sitesLimit,
    updatedAt: Date.now(),
    ...(transactionId && { googlePlayTransactionId: transactionId }),
    ...(purchaseToken && { googlePlayPurchaseToken: purchaseToken }),
  };

  await docRef.set(payload, { merge: true });
  console.log(`[subscriptionService] Subscription ${planId} activated for scope ${scopeId}`);

  return payload;
}

/**
 * Start subscription purchase flow via Google Play
 */
export async function purchaseSubscriptionViaStore(planId: string): Promise<void> {
  if (!billingInitialized) {
    await initBilling();
  }
  await billingPurchaseSubscription(planId);
  // The actual subscription activation happens in handlePurchaseSuccess
}

/**
 * Purchase a scan pack via Google Play
 */
export async function purchaseScanPackViaStore(packId: string): Promise<void> {
  if (!billingInitialized) {
    await initBilling();
  }
  await billingPurchaseScanPack(packId);
  // The actual scan addition happens in handlePurchaseSuccess
}

/**
 * Restore purchases from Google Play
 */
export async function restorePreviousPurchases(): Promise<Subscription | null> {
  if (!billingInitialized) {
    await initBilling();
  }

  const purchases = await restorePurchases();
  if (purchases.length === 0) {
    console.log('[subscriptionService] No purchases to restore');
    return null;
  }

  // Find the most recent subscription purchase
  for (const purchase of purchases) {
    const plan = getSubscriptionPlanById(purchase.productId);
    if (plan) {
      console.log('[subscriptionService] Restoring subscription:', purchase.productId);
      return await activateSubscription(
        purchase.productId,
        purchase.transactionId ?? undefined,
        purchase.purchaseToken ?? undefined
      );
    }
  }

  return null;
}

/**
 * Get available products from Google Play
 */
export async function getStoreProducts(): Promise<{
  subscriptions: BillingProduct[];
  scanPacks: BillingProduct[];
}> {
  if (!billingInitialized) {
    await initBilling();
  }

  const [subscriptions, scanPacks] = await Promise.all([
    getAvailableSubscriptions(),
    getAvailableScanPacks(),
  ]);

  return { subscriptions, scanPacks };
}

/**
 * Check if Google Play billing is available
 */
export function isStoreAvailable(): boolean {
  return isBillingAvailable();
}
