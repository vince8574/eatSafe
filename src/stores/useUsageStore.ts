import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Compteurs d'usage MENSUELS du palier gratuit : scan de code-barres et saisie
// manuelle du lot. Volontairement LOCAUX (AsyncStorage) : ils se réinitialisent
// chaque mois, donc l'enjeu anti-réinstallation est faible. La ressource
// coûteuse — le scan IA du lot — reste, elle, suivie côté Firestore
// (subscriptionService.scansRemaining), inchangée.

function getNextResetDate(): number {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

// Clé « AAAA-MM » du mois courant. Sert à savoir si l'utilisateur est encore dans
// son 1er mois (saisie manuelle limitée à 9 au lieu de 10).
export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

type UsageStore = {
  barcodeUsedThisMonth: number;
  manualLotUsedThisMonth: number;
  monthlyResetDate: number;
  // Mois d'installation, figé au 1er lancement (règle des 9 lots manuels le 1er mois).
  installMonthKey: string;

  incrementBarcode: () => void;
  incrementManualLot: () => void;
  resetIfNeeded: () => void;
};

export const useUsageStore = create<UsageStore>()(
  persist(
    (set, get) => ({
      barcodeUsedThisMonth: 0,
      manualLotUsedThisMonth: 0,
      monthlyResetDate: getNextResetDate(),
      installMonthKey: currentMonthKey(),

      incrementBarcode: () =>
        set((s) => ({ barcodeUsedThisMonth: (s.barcodeUsedThisMonth ?? 0) + 1 })),

      incrementManualLot: () =>
        set((s) => ({ manualLotUsedThisMonth: (s.manualLotUsedThisMonth ?? 0) + 1 })),

      resetIfNeeded: () => {
        const { monthlyResetDate } = get();
        if (Date.now() >= (monthlyResetDate ?? 0)) {
          set({
            barcodeUsedThisMonth: 0,
            manualLotUsedThisMonth: 0,
            monthlyResetDate: getNextResetDate(),
          });
        }
      },
    }),
    {
      name: 'usage-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
