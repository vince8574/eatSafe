import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllProducts as getFirestoreProducts,
  addProduct as addFirestoreProduct,
  updateProduct as updateFirestoreProduct,
  removeProduct as removeFirestoreProduct,
  subscribeToProducts
} from '../services/firebaseProductsService';
import { ScannedProduct, RecallRecord } from '../types';
import { getRecallStatus } from '../utils/lotMatcher';

const QUERY_KEY = ['scanned-products'];
const ASYNC_STORAGE_KEY = 'scanned-products';

async function loadProducts() {
  return getFirestoreProducts();
}

/**
 * Synchronize Firestore products to AsyncStorage for background task access
 */
export async function syncProductsToAsyncStorage() {
  try {
    const products = await getFirestoreProducts();
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(products));
    console.log(`[useScannedProducts] Synced ${products.length} products to AsyncStorage`);
  } catch (error) {
    console.error('[useScannedProducts] Failed to sync to AsyncStorage:', error);
  }
}

export function useScannedProducts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: loadProducts
  });

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToProducts((products) => {
      queryClient.setQueryData(QUERY_KEY, products);
      // Also sync to AsyncStorage for background tasks
      void syncProductsToAsyncStorage();
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  const addMutation = useMutation({
    mutationFn: async (payload: Omit<ScannedProduct, 'id' | 'scannedAt' | 'recallStatus'>) => {
      const product = await addFirestoreProduct(payload);
      return product;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      await syncProductsToAsyncStorage();
    }
  });

  const updateRecallMutation = useMutation({
    mutationFn: async ({
      product,
      recalls
    }: {
      product: ScannedProduct;
      recalls: RecallRecord[];
    }) => {
      const recallStatus = getRecallStatus(product, recalls);
      await updateFirestoreProduct(product.id, {
        recallStatus: recallStatus.status,
        recallReference: recallStatus.recallReference,
        lastCheckedAt: Date.now()
      });
      return recallStatus;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      await syncProductsToAsyncStorage();
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await removeFirestoreProduct(id);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      await syncProductsToAsyncStorage();
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ScannedProduct> }) => {
      await updateFirestoreProduct(id, updates);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      await syncProductsToAsyncStorage();
    }
  });

  const addProduct = useCallback(
    (payload: Omit<ScannedProduct, 'id' | 'scannedAt' | 'recallStatus'>) => addMutation.mutateAsync(payload),
    [addMutation]
  );

  const updateRecall = useCallback(
    (product: ScannedProduct, recalls: RecallRecord[]) =>
      updateRecallMutation.mutateAsync({ product, recalls }),
    [updateRecallMutation]
  );

  const removeProduct = useCallback((id: string) => removeMutation.mutateAsync(id), [removeMutation]);

  const updateProduct = useCallback(
    (id: string, updates: Partial<ScannedProduct>) => updateProductMutation.mutateAsync({ id, updates }),
    [updateProductMutation]
  );

  return {
    products: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addProduct,
    updateRecall,
    removeProduct,
    updateProduct
  };
}
