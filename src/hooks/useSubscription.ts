import { useCallback, useEffect, useState } from 'react';
import { Subscription, fetchSubscription, selectPlan, addScanPack, PLANS, SCAN_PACKS } from '../services/subscriptionService';

type UseSubscriptionState = {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
};

export function useSubscription() {
  const [state, setState] = useState<UseSubscriptionState>({
    subscription: null,
    loading: true,
    error: null
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const sub = await fetchSubscription();
      setState({ subscription: sub, loading: false, error: null });
    } catch (error) {
      setState({
        subscription: null,
        loading: false,
        error: error instanceof Error ? error.message : "Erreur lors du chargement de l'abonnement"
      });
    }
  }, []);

  const choosePlan = useCallback(async (planId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const sub = await selectPlan(planId);
      setState({ subscription: sub, loading: false, error: null });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Impossible de selectionner le plan'
      }));
    }
  }, []);

  const buyPack = useCallback(async (quantity: number) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const sub = await addScanPack(quantity);
      setState({ subscription: sub, loading: false, error: null });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Impossible d'ajouter le pack'
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    subscription: state.subscription,
    loading: state.loading,
    error: state.error,
    refresh,
    choosePlan,
    buyPack,
    plans: PLANS,
    packs: SCAN_PACKS
  };
}
