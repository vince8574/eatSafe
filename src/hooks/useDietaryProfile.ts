import { useEffect, useRef } from 'react';
import { useDietaryProfileStore } from '../stores/useDietaryProfileStore';
import { getCurrentUser } from '../services/authService';
import { saveDietaryProfileToFirestore } from '../services/firestoreDietaryProfileService';
import {
  checkProductAgainstProfile,
  type DietaryCheckResult
} from '../services/dietaryCheckService';
import type { ProductInfo } from '../services/productLookupService';

// Dietary profile hook: exposes the store state + actions, auto-saves to Firestore
// (debounced) on every change for the signed-in user, and provides
// `checkProductForCurrentProfile` (product vs profile detection, zero AI cost).

function serialize(s: ReturnType<typeof useDietaryProfileStore.getState>): string {
  return JSON.stringify(s.people);
}

export function useDietaryProfile() {
  const store = useDietaryProfileStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(null);
  const signature = serialize(store);

  useEffect(() => {
    const uid = getCurrentUser()?.uid ?? null;
    if (!uid) return; // not signed in → local only (AsyncStorage)
    // Ignore the first pass (hydration): only save on a real change.
    if (lastSavedRef.current === null) {
      lastSavedRef.current = signature;
      return;
    }
    if (lastSavedRef.current === signature) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastSavedRef.current = signature;
      void saveDietaryProfileToFirestore(uid, useDietaryProfileStore.getState().getProfile());
    }, 600);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [signature]);

  return store;
}

/**
 * Product vs current profile detection. Pure (no network) — usable anywhere
 * (scan banner, product view). Returns a result even for an empty profile.
 */
export function checkProductForCurrentProfile(product: ProductInfo): DietaryCheckResult {
  const s = useDietaryProfileStore.getState();
  return checkProductAgainstProfile(
    {
      productName: product.productName,
      allergensTags: product.allergensTags,
      tracesTags: product.tracesTags,
      ingredientsText: product.ingredientsText,
      ingredientsTags: product.ingredientsTags,
      ingredientsAnalysisTags: product.ingredientsAnalysisTags,
      nutriments: product.nutriments
    },
    s.getProfile()
  );
}
