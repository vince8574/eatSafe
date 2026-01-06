export interface SubscriptionPlan {
  id: string;
  label: string;
  category: 'foodtruck' | 'restaurant' | 'school';
  price: string;
  pricePerMonth: number; // en USD
  description: string[];
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
  label: string;
  quantity: number;
  price: string;
  priceUSD: number;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  // FOOD TRUCKS
  {
    id: 'foodtruck_starter',
    label: 'Food Truck - Starter',
    category: 'foodtruck',
    price: '19$ / mois',
    pricePerMonth: 19,
    description: [
      '500 scans inclus',
      'Historique 30 jours',
      'Alertes de rappel en temps réel'
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
    label: 'Food Truck - Pro',
    category: 'foodtruck',
    price: '29$ / mois',
    pricePerMonth: 29,
    description: [
      '1000 scans inclus',
      'Export PDF / CSV',
      'Historique 90 jours',
      'Alertes de rappel en temps réel'
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
    label: 'Restaurant - Standard',
    category: 'restaurant',
    price: '39$ / mois',
    pricePerMonth: 39,
    description: [
      '1500 scans inclus',
      'Alertes + historique 1 an',
      'Export PDF / Excel',
      'Multi-employés (jusqu\'à 3)'
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
    label: 'Restaurant - Premium',
    category: 'restaurant',
    price: '69$ / mois',
    pricePerMonth: 69,
    description: [
      '5000 scans inclus',
      'Alertes + historique 1 an',
      'Export PDF / Excel / CSV',
      'Multi-employés (jusqu\'à 10)'
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
    label: 'Crèche / École - Sécurité',
    category: 'school',
    price: '59$ / mois',
    pricePerMonth: 59,
    description: [
      '2000 scans inclus',
      'Alertes + historique illimité',
      'Format réglementaire PDF / CSV',
      'Multi-employés (jusqu\'à 10)'
    ],
    scansIncluded: 2000,
    historyRetentionDays: 'unlimited',
    exportEnabled: true,
    exportFormats: ['pdf', 'csv'],
    employeesLimit: 10,
    sitesLimit: null,
    regulatoryFormat: true
  },
  {
    id: 'school_premium',
    label: 'Crèche / École - Premium',
    category: 'school',
    price: '99$ / mois',
    pricePerMonth: 99,
    description: [
      '5000 scans inclus',
      'Alertes + historique illimité',
      'Format réglementaire PDF / Excel / CSV',
      'Multi-employés (jusqu\'à 10)',
      'Multi-sites (jusqu\'à 3 établissements)'
    ],
    scansIncluded: 5000,
    historyRetentionDays: 'unlimited',
    exportEnabled: true,
    exportFormats: ['pdf', 'xlsx', 'csv'],
    employeesLimit: 10,
    sitesLimit: 3,
    regulatoryFormat: true
  }
];

// Packs de scans supplémentaires (comme recommandé pour App Store / Google Play)
export const SCAN_PACKS: ScanPack[] = [
  {
    id: 'pack_small',
    label: 'Pack Petit',
    quantity: 100,
    price: '0.99$',
    priceUSD: 0.99
  },
  {
    id: 'pack_medium',
    label: 'Pack Moyen',
    quantity: 500,
    price: '4.99$',
    priceUSD: 4.99
  },
  {
    id: 'pack_large',
    label: 'Pack Grand',
    quantity: 1000,
    price: '9.99$',
    priceUSD: 9.99
  },
  {
    id: 'pack_xlarge',
    label: 'Pack XL',
    quantity: 2500,
    price: '19.99$',
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
