import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  Subscription,
  fetchSubscription,
  selectPlan,
  addScanPack,
  PLANS,
  SCAN_PACKS,
  initBilling,
  cleanupBilling,
  purchaseSubscriptionViaStore,
  purchaseScanPackViaStore,
  restorePreviousPurchases,
  getStoreProducts,
  isStoreAvailable,
} from '../services/subscriptionService';

type UseSubscriptionState = {
  subscription: Subscription | null;
  loading: boolean;
  purchasing: boolean;
  error: string | null;
  storeAvailable: boolean;
};

export function useSubscription() {
  const [state, setState] = useState<UseSubscriptionState>({
    subscription: null,
    loading: true,
    purchasing: false,
    error: null,
    storeAvailable: false,
  });

  // Initialize billing on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (Platform.OS === 'android') {
        const success = await initBilling();
        if (mounted) {
          setState((prev) => ({ ...prev, storeAvailable: success }));
        }
      }
    };

    init();

    return () => {
      mounted = false;
      cleanupBilling();
    };
  }, []);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const sub = await fetchSubscription();
      setState((prev) => ({ ...prev, subscription: sub, loading: false, error: null }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        subscription: null,
        loading: false,
        error: error instanceof Error ? error.message : "Erreur lors du chargement de l'abonnement",
      }));
    }
  }, []);

  // Purchase a subscription via Google Play
  const purchaseSubscription = useCallback(async (planId: string) => {
    setState((prev) => ({ ...prev, purchasing: true, error: null }));
    try {
      if (state.storeAvailable) {
        // Use Google Play for real purchases
        await purchaseSubscriptionViaStore(planId);
        // The subscription will be activated via the purchase listener
        // Refresh to get the updated subscription
        await refresh();
      } else {
        // Fallback for development/testing
        const sub = await selectPlan(planId);
        setState((prev) => ({ ...prev, subscription: sub, purchasing: false, error: null }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        purchasing: false,
        error: error instanceof Error ? error.message : "Erreur lors de l'achat",
      }));
    } finally {
      setState((prev) => ({ ...prev, purchasing: false }));
    }
  }, [state.storeAvailable, refresh]);

  // Purchase a scan pack via Google Play
  const purchaseScanPack = useCallback(async (packId: string, quantity: number) => {
    setState((prev) => ({ ...prev, purchasing: true, error: null }));
    try {
      if (state.storeAvailable) {
        // Use Google Play for real purchases
        await purchaseScanPackViaStore(packId);
        // The scans will be added via the purchase listener
        // Refresh to get the updated subscription
        await refresh();
      } else {
        // Fallback for development/testing
        const sub = await addScanPack(quantity);
        setState((prev) => ({ ...prev, subscription: sub, purchasing: false, error: null }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        purchasing: false,
        error: error instanceof Error ? error.message : "Impossible d'acheter le pack",
      }));
    } finally {
      setState((prev) => ({ ...prev, purchasing: false }));
    }
  }, [state.storeAvailable, refresh]);

  // Restore previous purchases
  const restorePurchases = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const sub = await restorePreviousPurchases();
      if (sub) {
        setState((prev) => ({ ...prev, subscription: sub, loading: false, error: null }));
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Aucun achat à restaurer'
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la restauration',
      }));
    }
  }, []);

  // Legacy methods for backward compatibility
  const choosePlan = useCallback(async (planId: string) => {
    await purchaseSubscription(planId);
  }, [purchaseSubscription]);

  const buyPack = useCallback(async (quantity: number) => {
    // Find the pack by quantity
    const pack = SCAN_PACKS.find((p) => p.quantity === quantity);
    if (pack) {
      await purchaseScanPack(pack.id, quantity);
    } else {
      // Fallback for direct quantity addition (dev mode)
      const sub = await addScanPack(quantity);
      setState((prev) => ({ ...prev, subscription: sub }));
    }
  }, [purchaseScanPack]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    subscription: state.subscription,
    loading: state.loading,
    purchasing: state.purchasing,
    error: state.error,
    storeAvailable: state.storeAvailable,
    refresh,
    choosePlan,
    buyPack,
    purchaseSubscription,
    purchaseScanPack,
    restorePurchases,
    plans: PLANS,
    packs: SCAN_PACKS,
  };
}
