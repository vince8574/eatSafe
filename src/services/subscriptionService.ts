import firestore from '@react-native-firebase/firestore';
import { getFirestore } from './firebaseService';
import { getCurrentUserId } from './authService';
import { getCurrentOrganization } from './organizationService';
import { SUBSCRIPTION_PLANS, SCAN_PACKS, getPlanById as getSubscriptionPlanById } from '../constants/subscriptionPlans';

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
