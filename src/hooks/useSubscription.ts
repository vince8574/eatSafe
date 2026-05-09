import { useCallback, useEffect, useState } from 'react';
import { t } from '../i18n/i18n';
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
  onSubscriptionChange,
  onPurchaseFailure,
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

  // Initialize billing on mount + subscribe to async store events.
  // The store's purchase listener fires AFTER requestPurchase resolves, so we
  // can't `await refresh()` synchronously after a purchase call — the Firestore
  // doc isn't written yet. Instead we react to the emitter the service exposes.
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const success = await initBilling();
      if (mounted) {
        setState((prev) => ({ ...prev, storeAvailable: success }));
      }
    };

    init();

    const unsubscribeChange = onSubscriptionChange((sub) => {
      if (!mounted) return;
      setState((prev) => ({
        ...prev,
        subscription: sub,
        purchasing: false,
        loading: false,
        error: null,
      }));
    });

    const unsubscribeFailure = onPurchaseFailure((err) => {
      if (!mounted) return;
      // User cancellation should NOT show as an error in the UI.
      const cancelled = err.code === 'E_USER_CANCELLED' || err.code === 'E_USER_CANCELED';
      setState((prev) => ({
        ...prev,
        purchasing: false,
        error: cancelled ? null : err.message ?? 'Purchase failed',
      }));
    });

    return () => {
      mounted = false;
      unsubscribeChange();
      unsubscribeFailure();
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
        error: error instanceof Error ? error.message : t('common.loading'),
      }));
    }
  }, []);

  // Safety net: clear `purchasing` if the store listener never fires
  // (e.g. dialog dismissed by the system, network drop). 90s matches the
  // typical StoreKit dialog timeout window.
  const armPurchaseTimeout = useCallback(() => {
    const timer = setTimeout(() => {
      setState((prev) => (prev.purchasing ? { ...prev, purchasing: false } : prev));
    }, 90_000);
    return () => clearTimeout(timer);
  }, []);

  // Purchase a subscription via the store. The actual Firestore activation
  // happens asynchronously in the service's purchase listener — we do NOT
  // refresh() here to avoid racing the listener.
  const purchaseSubscription = useCallback(async (planId: string) => {
    setState((prev) => ({ ...prev, purchasing: true, error: null }));
    try {
      if (state.storeAvailable) {
        const cancelTimeout = armPurchaseTimeout();
        try {
          await purchaseSubscriptionViaStore(planId);
        } finally {
          // Listener will clear `purchasing`; cancelTimeout is a backstop only.
          // Keep the timeout armed.
          void cancelTimeout;
        }
      } else {
        // Dev/sandbox fallback when no real store is available
        const sub = await selectPlan(planId);
        setState((prev) => ({ ...prev, subscription: sub, purchasing: false, error: null }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        purchasing: false,
        error: error instanceof Error ? error.message : t('auth.error'),
      }));
    }
  }, [state.storeAvailable, armPurchaseTimeout]);

  // Purchase a scan pack via the store. Same async pattern as above.
  const purchaseScanPack = useCallback(async (packId: string, quantity: number) => {
    setState((prev) => ({ ...prev, purchasing: true, error: null }));
    try {
      if (state.storeAvailable) {
        armPurchaseTimeout();
        await purchaseScanPackViaStore(packId);
      } else {
        const sub = await addScanPack(quantity);
        setState((prev) => ({ ...prev, subscription: sub, purchasing: false, error: null }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        purchasing: false,
        error: error instanceof Error ? error.message : t('auth.error'),
      }));
    }
  }, [state.storeAvailable, armPurchaseTimeout]);

  // Restore previous purchases. Returns the restored subscription or null
  // when no previous purchase was found. Throws on unexpected errors.
  const restorePurchases = useCallback(async (): Promise<Subscription | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const sub = await restorePreviousPurchases();
      if (sub) {
        setState((prev) => ({ ...prev, subscription: sub, loading: false, error: null }));
      } else {
        setState((prev) => ({ ...prev, loading: false, error: null }));
      }
      return sub;
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: null }));
      throw error;
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
