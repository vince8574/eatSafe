import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { getFirestore } from './firebaseService';

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
  employeesLimit: number | null;
  sitesLimit: number | null;
  updatedAt: number;
};

export type Plan = {
  id: string;
  label: string;
  price: string;
  scansIncluded: number;
  historyRetentionDays: number | 'unlimited';
  exportEnabled: boolean;
  employeesLimit: number | null;
  sitesLimit: number | null;
  description: string[];
};

export const PLANS: Plan[] = [
  {
    id: 'plan_foodtruck_starter',
    label: 'Food trucks • Starter',
    price: '$19 / mois',
    scansIncluded: 500,
    historyRetentionDays: 30,
    exportEnabled: false,
    employeesLimit: 1,
    sitesLimit: null,
    description: ['500 scans inclus', 'Historique 30 jours', '+ packs pour les scans supplémentaires']
  },
  {
    id: 'plan_foodtruck_pro',
    label: 'Food trucks • Pro',
    price: '$29 / mois',
    scansIncluded: 1000,
    historyRetentionDays: 90,
    exportEnabled: true,
    employeesLimit: 1,
    sitesLimit: null,
    description: ['1000 scans inclus', 'Export PDF / CSV', 'Historique 90 jours', '+ packs pour les scans supplémentaires']
  },
  {
    id: 'plan_restaurant_standard',
    label: 'Restaurants • Standard',
    price: '$39 / mois',
    scansIncluded: 1500,
    historyRetentionDays: 365,
    exportEnabled: true,
    employeesLimit: 3,
    sitesLimit: null,
    description: ['1500 scans inclus', 'Alertes + historique 1 an', 'Export PDF/Excel', 'Multi-employés (jusqu’à 3)', '+ packs pour les scans supplémentaires']
  },
  {
    id: 'plan_restaurant_premium',
    label: 'Restaurants • Premium',
    price: '$69 / mois',
    scansIncluded: 5000,
    historyRetentionDays: 365,
    exportEnabled: true,
    employeesLimit: 10,
    sitesLimit: null,
    description: ['5000 scans inclus', 'Multi-employés (jusqu’à 10)', '+ packs pour les scans supplémentaires']
  },
  {
    id: 'plan_ecole_standard',
    label: 'Crèches / Écoles • Sécurité',
    price: '$59 / mois',
    scansIncluded: 2000,
    historyRetentionDays: 'unlimited',
    exportEnabled: true,
    employeesLimit: 10,
    sitesLimit: null,
    description: ['2000 scans inclus', 'Alertes + historique illimité', 'PDF/CSV réglementaire', 'Multi-employés (jusqu’à 10)', '+ packs pour les scans supplémentaires']
  },
  {
    id: 'plan_ecole_premium',
    label: 'Écoles • Premium',
    price: '$99 / mois',
    scansIncluded: 5000,
    historyRetentionDays: 'unlimited',
    exportEnabled: true,
    employeesLimit: 10,
    sitesLimit: 3,
    description: ['5000 scans inclus', 'Multi-sites (jusqu’à 3 établissements)', 'Multi-employés (jusqu’à 10)', '+ packs pour les scans supplémentaires']
  }
];

export const SCAN_PACKS = [
  { id: 'pack_scans_500', label: 'Pack 500 scans', quantity: 500 },
  { id: 'pack_scans_1000', label: 'Pack 1000 scans', quantity: 1000 },
  { id: 'pack_scans_5000', label: 'Pack 5000 scans', quantity: 5000 }
];

const DEVICE_ID_KEY = '@subscription_device_id';
const COLLECTION = 'subscriptions';

async function getDeviceId(): Promise<string> {
  const cached = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (cached) return cached;

  const generated = `device_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function buildSubscriptionFromPlan(plan: Plan): Subscription {
  return {
    planId: plan.id,
    planName: plan.label,
    status: 'active',
    // Placeholder: 30 jours de validité simulée pour dev (les stores prendront le relais plus tard)
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    scansIncluded: plan.scansIncluded,
    scansRemaining: plan.scansIncluded,
    historyRetentionDays: plan.historyRetentionDays,
    exportEnabled: plan.exportEnabled,
    employeesLimit: plan.employeesLimit,
    sitesLimit: plan.sitesLimit,
    updatedAt: Date.now()
  };
}

function getPlanById(planId: string | null): Plan | null {
  if (!planId) return null;
  return PLANS.find((plan) => plan.id === planId) ?? null;
}

export async function fetchSubscription(): Promise<Subscription> {
  const db = getFirestore();
  const deviceId = await getDeviceId();
  const docRef = db.collection(COLLECTION).doc(deviceId);
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
      exportEnabled: false,
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
    exportEnabled: data.exportEnabled ?? false,
    employeesLimit: data.employeesLimit ?? null,
    sitesLimit: data.sitesLimit ?? null,
    updatedAt: data.updatedAt ?? Date.now()
  };
}

export async function selectPlan(planId: string): Promise<Subscription> {
  const plan = getPlanById(planId);
  if (!plan) {
    throw new Error('Plan inconnu');
  }

  const db = getFirestore();
  const deviceId = await getDeviceId();
  const docRef = db.collection(COLLECTION).doc(deviceId);
  const payload = buildSubscriptionFromPlan(plan);
  await docRef.set(payload, { merge: true });
  return payload;
}

export async function addScanPack(quantity: number): Promise<Subscription> {
  const db = getFirestore();
  const deviceId = await getDeviceId();
  const docRef = db.collection(COLLECTION).doc(deviceId);

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
  const deviceId = await getDeviceId();
  const docRef = db.collection(COLLECTION).doc(deviceId);
  await docRef.update({
    scansRemaining: firestore.FieldValue.increment(-count),
    updatedAt: Date.now()
  });
}
