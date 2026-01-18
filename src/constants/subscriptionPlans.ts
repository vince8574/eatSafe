export interface SubscriptionPlan {
  id: string;
  labelKey: string; // Translation key for the label
  category: 'foodtruck' | 'restaurant' | 'school';
  price: string;
  pricePerMonth: number; // en USD
  descriptionKeys: string[]; // Translation keys for description lines
  scansIncluded: number;
  historyRetentionDays: number | 'unlimited';
  exportEnabled: boolean;
  exportFormats: ('pdf' | 'csv' | 'xlsx')[];
  employeesLimit: number | null;
  sitesLimit: number | null;
  regulatoryFormat: boolean; // Pour le format "réglementaire" des écoles/crèches
}

export interface ScanPack {
  id: string;
  labelKey: string; // Translation key for the label
  quantity: number;
  price: string;
  priceUSD: number;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  // FOOD TRUCKS
  {
    id: 'foodtruck_starter',
    labelKey: 'subscription.plans.foodtruckStarter.label',
    category: 'foodtruck',
    price: '$19 / mo',
    pricePerMonth: 19,
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
    labelKey: 'subscription.plans.foodtruckPro.label',
    category: 'foodtruck',
    price: '$29 / mo',
    pricePerMonth: 29,
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

  // RESTAURANTS
  {
    id: 'restaurant_standard',
    labelKey: 'subscription.plans.restaurantStandard.label',
    category: 'restaurant',
    price: '$39 / mo',
    pricePerMonth: 39,
    descriptionKeys: [
      'subscription.plans.restaurantStandard.desc1',
      'subscription.plans.restaurantStandard.desc2',
      'subscription.plans.restaurantStandard.desc3',
      'subscription.plans.restaurantStandard.desc4'
    ],
    scansIncluded: 1500,
    historyRetentionDays: 365,
    exportEnabled: true,
    exportFormats: ['pdf', 'xlsx'],
    employeesLimit: 3,
    sitesLimit: null,
    regulatoryFormat: false
  },
  {
    id: 'restaurant_premium',
    labelKey: 'subscription.plans.restaurantPremium.label',
    category: 'restaurant',
    price: '$69 / mo',
    pricePerMonth: 69,
    descriptionKeys: [
      'subscription.plans.restaurantPremium.desc1',
      'subscription.plans.restaurantPremium.desc2',
      'subscription.plans.restaurantPremium.desc3',
      'subscription.plans.restaurantPremium.desc4'
    ],
    scansIncluded: 5000,
    historyRetentionDays: 365,
    exportEnabled: true,
    exportFormats: ['pdf', 'xlsx', 'csv'],
    employeesLimit: 10,
    sitesLimit: null,
    regulatoryFormat: false
  },

  // CRÈCHES / ÉCOLES
  {
    id: 'school_security',
    labelKey: 'subscription.plans.schoolSecurity.label',
    category: 'school',
    price: '$59 / mo',
    pricePerMonth: 59,
    descriptionKeys: [
      'subscription.plans.schoolSecurity.desc1',
      'subscription.plans.schoolSecurity.desc2',
      'subscription.plans.schoolSecurity.desc3',
      'subscription.plans.schoolSecurity.desc4'
    ],
    scansIncluded: 2000,
    historyRetentionDays: 'unlimited',
    exportEnabled: true,
    exportFormats: ['pdf', 'csv'],
    employeesLimit: 10,
    sitesLimit: null,
    regulatoryFormat: true
  },
];

// Packs de scans supplémentaires (comme recommandé pour App Store / Google Play)
export const SCAN_PACKS: ScanPack[] = [
  {
    id: 'pack_small',
    labelKey: 'subscription.packs.small',
    quantity: 100,
    price: '$0.99',
    priceUSD: 0.99
  },
  {
    id: 'pack_medium',
    labelKey: 'subscription.packs.medium',
    quantity: 500,
    price: '$4.99',
    priceUSD: 4.99
  },
  {
    id: 'pack_large',
    labelKey: 'subscription.packs.large',
    quantity: 1000,
    price: '$9.99',
    priceUSD: 9.99
  },
  {
    id: 'pack_xlarge',
    labelKey: 'subscription.packs.xlarge',
    quantity: 2500,
    price: '$19.99',
    priceUSD: 19.99
  }
];

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(p => p.id === planId);
}

export function getPackById(packId: string): ScanPack | undefined {
  return SCAN_PACKS.find(p => p.id === packId);
}

export function getPlansByCategory(category: 'foodtruck' | 'restaurant' | 'school'): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter(p => p.category === category);
}
