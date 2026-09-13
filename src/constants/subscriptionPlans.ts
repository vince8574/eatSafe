export interface SubscriptionPlan {
  id: string; // Monthly product ID (Google Play / App Store)
  idYear: string; // Yearly product ID
  labelKey: string; // Translation key for the label
  category: 'starter' | 'foodtruck' | 'restaurant' | 'school';
  price: string; // Display price for monthly billing
  pricePerMonth: number; // en USD
  priceYear: string; // Display price for yearly billing (= 10 × monthly, 2 months free)
  pricePerYear: number; // en USD, equals pricePerMonth × 10
  descriptionKeys: string[]; // Translation keys for description lines
  scansIncluded: number;
  historyRetentionDays: number | 'unlimited';
  exportEnabled: boolean;
  exportFormats: ('pdf' | 'csv' | 'xlsx')[];
  employeesLimit: number | null;
  sitesLimit: number | null;
  regulatoryFormat: boolean; // Pour le format "réglementaire" des écoles/crèches
}

export type BillingPeriod = 'monthly' | 'yearly';

// Scans IA du lot offerts d'office à l'installation (Android et iOS), avant tout
// abonnement ou achat de pack. Attribués UNE SEULE FOIS, à vie : le document
// Firestore n'est créé qu'à la première ouverture du compte, jamais réécrit
// ensuite. C'est la ressource coûteuse (~0,02-0,04 $/scan) → une fois épuisés,
// la caméra IA se verrouille et l'écran d'abonnement est proposé (la saisie
// manuelle, elle, reste gratuite).
export const FREE_SCANS_ON_INSTALL = 10;

// ─── Quotas MENSUELS du palier gratuit (suivis en local, cf. useUsageStore) ───
// Scan de code-barres : 10 par mois, réinitialisés le 1er de chaque mois.
export const FREE_BARCODE_MONTHLY_LIMIT = 10;
// Saisie MANUELLE du lot : 9 le 1er mois, puis 10 par mois. Compteur totalement
// indépendant du scan IA. (Le 9 datait de l'époque où l'installation n'offrait
// qu'UN scan IA, pour arriver à 10 vérifications au total.)
export const FREE_MANUAL_LOT_FIRST_MONTH = 9;
export const FREE_MANUAL_LOT_MONTHLY = 10;

export interface ScanPack {
  id: string;
  labelKey: string; // Translation key for the label
  quantity: number;
  price: string;
  priceUSD: number;
}

// Plans listed in ascending price order (displayed as-is in the app and on the website).
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter_basic',
    idYear: 'starter_basic_yearly',
    labelKey: 'subscription.plans.starterBasic.label',
    category: 'starter',
    price: '$9.99 / mo',
    pricePerMonth: 9.99,
    priceYear: '$99.90 / yr',
    pricePerYear: 99.90,
    descriptionKeys: [
      'subscription.plans.starterBasic.desc1',
      'subscription.plans.starterBasic.desc2',
      'subscription.plans.starterBasic.desc3'
    ],
    scansIncluded: 100,
    historyRetentionDays: 30,
    exportEnabled: false,
    exportFormats: [],
    employeesLimit: null,
    sitesLimit: null,
    regulatoryFormat: false
  },
  {
    id: 'foodtruck_starter',
    idYear: 'foodtruck_starter_yearly',
    labelKey: 'subscription.plans.foodtruckStarter.label',
    category: 'foodtruck',
    price: '$19.99 / mo',
    pricePerMonth: 19.99,
    priceYear: '$199.99 / yr',
    pricePerYear: 199.99,
    descriptionKeys: [
      'subscription.plans.foodtruckStarter.desc1',
      'subscription.plans.foodtruckStarter.desc2',
      'subscription.plans.foodtruckStarter.desc3'
    ],
    scansIncluded: 500,
    historyRetentionDays: 30,
    exportEnabled: false,
    exportFormats: [],
    employeesLimit: null,
    sitesLimit: null,
    regulatoryFormat: false
  },
  {
    id: 'foodtruck_pro',
    idYear: 'foodtruck_pro_yearly',
    labelKey: 'subscription.plans.foodtruckPro.label',
    category: 'foodtruck',
    price: '$29.99 / mo',
    pricePerMonth: 29.99,
    priceYear: '$299.99 / yr',
    pricePerYear: 299.99,
    descriptionKeys: [
      'subscription.plans.foodtruckPro.desc1',
      'subscription.plans.foodtruckPro.desc2',
      'subscription.plans.foodtruckPro.desc3',
      'subscription.plans.foodtruckPro.desc4'
    ],
    scansIncluded: 1000,
    historyRetentionDays: 90,
    exportEnabled: true,
    exportFormats: ['pdf', 'csv'],
    employeesLimit: null,
    sitesLimit: null,
    regulatoryFormat: false
  },
  {
    id: 'restaurant_standard',
    idYear: 'restaurant_standard_yearly',
    labelKey: 'subscription.plans.restaurantStandard.label',
    category: 'restaurant',
    price: '$39.99 / mo',
    pricePerMonth: 39.99,
    priceYear: '$399.99 / yr',
    pricePerYear: 399.99,
    descriptionKeys: [
      'subscription.plans.restaurantStandard.desc1',
      'subscription.plans.restaurantStandard.desc2',
      'subscription.plans.restaurantStandard.desc3',
      'subscription.plans.restaurantStandard.desc4'
    ],
    scansIncluded: 1500,
    historyRetentionDays: 180,
    exportEnabled: true,
    exportFormats: ['pdf', 'xlsx'],
    employeesLimit: 3,
    sitesLimit: null,
    regulatoryFormat: false
  },
  {
    id: 'school_security',
    idYear: 'school_security_yearly',
    labelKey: 'subscription.plans.schoolSecurity.label',
    category: 'school',
    price: '$59.99 / mo',
    pricePerMonth: 59.99,
    priceYear: '$599.99 / yr',
    pricePerYear: 599.99,
    descriptionKeys: [
      'subscription.plans.schoolSecurity.desc1',
      'subscription.plans.schoolSecurity.desc2',
      'subscription.plans.schoolSecurity.desc3',
      'subscription.plans.schoolSecurity.desc4'
    ],
    scansIncluded: 2000,
    historyRetentionDays: 365,
    exportEnabled: true,
    exportFormats: ['pdf', 'csv'],
    employeesLimit: 10,
    sitesLimit: null,
    regulatoryFormat: true
  },
];
// NB : le plan "Advanced" (restaurant_premium, 5000 scans, 69,99 $/mois +
// annuel) a été retiré de l'offre le 22/07/2026. getPlanById le résout encore
// pour les ANCIENS abonnés via le repli "plan inconnu" de subscriptionService ;
// penser à retirer/archiver les produits restaurant_premium(_yearly) dans App
// Store Connect et Play Console.

// Packs de scans supplémentaires (consommables App Store / Google Play).
// Nouvelle grille du 22/07/2026 — les IDs pack_small/medium/large/xlarge
// (100/500/1000/2500 scans) sont abandonnés : quantités ET prix changent, on
// crée de NOUVEAUX produits plutôt que de changer le sens des anciens SKUs.
// Affichage des packs de scans dans l'ecran d'abonnement.
// Mis a false : les packs ne sont plus proposes a la vente dans l'interface.
// La logique d'achat, la comptabilisation des credits et la restauration
// restent intactes -- un utilisateur ayant deja achete un pack conserve et
// voit son solde. Repasser a true suffit a les reafficher.
export const SHOW_SCAN_PACKS = false;

export const SCAN_PACKS: ScanPack[] = [
  {
    id: 'pack_10',
    labelKey: 'subscription.packs.small',
    quantity: 10,
    // iOS n'autorise pas 2,50 $ (paliers de prix App Store) → 2,49 $.
    price: '$2.49',
    priceUSD: 2.49
  },
  {
    id: 'pack_50',
    labelKey: 'subscription.packs.medium',
    quantity: 50,
    price: '$7.99',
    priceUSD: 7.99
  },
  {
    id: 'pack_100',
    labelKey: 'subscription.packs.large',
    quantity: 100,
    price: '$14.99',
    priceUSD: 14.99
  },
  {
    id: 'pack_210',
    labelKey: 'subscription.packs.xlarge',
    quantity: 210,
    price: '$27.99',
    priceUSD: 27.99
  }
];

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  // Match either the monthly product ID or the yearly product ID so callers
  // that receive a productId from the store (e.g. *_yearly) still resolve the
  // underlying plan metadata. Without this, yearly purchases are silently
  // treated as unknown products and never activated.
  return SUBSCRIPTION_PLANS.find(p => p.id === planId || p.idYear === planId);
}

export function isYearlyPlanId(planId: string): boolean {
  return SUBSCRIPTION_PLANS.some(p => p.idYear === planId);
}

export function getPackById(packId: string): ScanPack | undefined {
  return SCAN_PACKS.find(p => p.id === packId);
}

export function getPlansByCategory(category: 'starter' | 'foodtruck' | 'restaurant' | 'school'): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter(p => p.category === category);
}
