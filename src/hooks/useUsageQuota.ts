import { useUsageStore, currentMonthKey } from '../stores/useUsageStore';
import { useSubscriptionStatus } from './useSubscriptionStatus';
import {
  FREE_BARCODE_MONTHLY_LIMIT,
  FREE_MANUAL_LOT_FIRST_MONTH,
  FREE_MANUAL_LOT_MONTHLY
} from '../constants/subscriptionPlans';

// Quotas MENSUELS du palier gratuit : scan de code-barres et saisie manuelle du
// lot. Abonné → illimité. Le scan IA du lot (ressource coûteuse) n'est PAS géré
// ici : il reste sur le compteur Firestore (subscription.scansRemaining).

export function useUsageQuota() {
  const { isSubscribed, loading } = useSubscriptionStatus();
  const store = useUsageStore();

  store.resetIfNeeded();

  // Tant que le statut d'abonnement est inconnu, on n'oppose aucun blocage :
  // mieux vaut laisser passer un scan que flasher un paywall à un abonné.
  const unlimited = isSubscribed || loading;

  // ─── Code-barres : 10/mois ─────────────────────────────────────────────────
  const barcodeUsed = store.barcodeUsedThisMonth ?? 0;
  const barcodeLimit = unlimited ? Infinity : FREE_BARCODE_MONTHLY_LIMIT;
  const barcodeRemaining = unlimited ? Infinity : Math.max(0, barcodeLimit - barcodeUsed);
  const canScanBarcode = unlimited || barcodeRemaining > 0;

  // ─── Lot manuel : 9 le 1er mois (1 scan IA + 9 = 10), puis 10/mois ─────────
  const manualLotUsed = store.manualLotUsedThisMonth ?? 0;
  const isFirstMonth = (store.installMonthKey ?? currentMonthKey()) === currentMonthKey();
  // Saisie MANUELLE du lot : ILLIMITÉE pour tout le monde. Elle n'appelle aucun
  // modèle et n'interroge que des bases publiques : elle ne coûte rien à
  // servir. Seuls la lecture IA du lot et la détection d'allergènes relèvent de
  // l'abonnement ou des packs. Le plafond mensuel qui existait ici privait de
  // vérification des utilisateurs à qui elle ne coûtait rien.
  const manualLotLimit = Infinity;
  const manualLotRemaining = unlimited ? Infinity : Math.max(0, manualLotLimit - manualLotUsed);
  const canManualLot = unlimited || manualLotRemaining > 0;

  // Inutile de décompter pour un abonné (illimité).
  const incrementBarcode = () => {
    if (!unlimited) store.incrementBarcode();
  };

  const incrementManualLot = () => {
    if (!unlimited) store.incrementManualLot();
  };

  return {
    isSubscribed,
    canScanBarcode,
    barcodeUsed,
    barcodeLimit,
    barcodeRemaining,
    incrementBarcode,
    canManualLot,
    manualLotUsed,
    manualLotLimit,
    manualLotRemaining,
    incrementManualLot
  };
}
