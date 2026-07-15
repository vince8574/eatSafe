import { useEffect, useState } from 'react';
import {
  fetchSubscription,
  onSubscriptionChange,
  type Subscription
} from '../services/subscriptionService';

// Accès LÉGER au statut d'abonnement, pour les écrans/composants qui doivent
// seulement savoir « abonné ou non » (gating de quota, affichage des profils).
//
// À la différence de useSubscription(), ce hook ne déclenche PAS initBilling() :
// on ne veut pas initialiser la facturation depuis un bandeau ou un écran de
// saisie. Le résultat est mis en cache au niveau module et tenu à jour par
// l'emitter du service → un seul fetch Firestore pour toute l'app.

let cached: Subscription | null = null;
let inflight: Promise<Subscription> | null = null;

export function useSubscriptionStatus() {
  const [sub, setSub] = useState<Subscription | null>(cached);

  useEffect(() => {
    let mounted = true;

    if (!cached) {
      // Dédoublonne les fetchs concurrents (plusieurs composants montés ensemble).
      inflight = inflight ?? fetchSubscription();
      void inflight
        .then((s) => {
          cached = s;
          inflight = null;
          if (mounted) setSub(s);
        })
        .catch(() => {
          inflight = null;
        });
    }

    const unsubscribe = onSubscriptionChange((s) => {
      cached = s;
      if (mounted) setSub(s);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return {
    subscription: sub,
    isSubscribed: (sub?.status ?? 'none') === 'active',
    // true tant qu'on ne sait pas : les appelants autorisent pendant ce temps
    // pour ne pas faire clignoter un paywall à tort.
    loading: sub === null
  };
}
