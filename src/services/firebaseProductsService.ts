import { getFirestore } from './firebaseService';
import { getCurrentOrganization } from './organizationService';
import { getCurrentUserId } from './authService';
import { ScannedProduct } from '../types';
import { nanoid } from 'nanoid/non-secure';

const PRODUCTS_COLLECTION = 'scannedProducts';

/**
 * Service pour gérer les produits scannés au niveau organisation
 * Si l'utilisateur fait partie d'une organisation, les produits sont partagés
 * Sinon, les produits sont stockés au niveau utilisateur
 */

/**
 * Récupère l'ID de scope pour les produits
 * Si organisation: products sont sous organizations/{orgId}/products
 * Sinon: products sont sous users/{userId}/products
 */
async function getProductsScopeId(): Promise<string> {
  const organization = await getCurrentOrganization();

  if (organization) {
    return organization.id;
  }

  // Fallback: scope utilisateur
  return await getCurrentUserId();
}

/**
 * Récupérer tous les produits scannés
 */
export async function getAllProducts(): Promise<ScannedProduct[]> {
  const db = getFirestore();
  const scopeId = await getProductsScopeId();

  const snapshot = await db
    .collection(PRODUCTS_COLLECTION)
    .doc(scopeId)
    .collection('products')
    .orderBy('scannedAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ScannedProduct[];
}

/**
 * Récupérer un produit par ID
 */
export async function getProductById(productId: string): Promise<ScannedProduct | null> {
  const db = getFirestore();
  const scopeId = await getProductsScopeId();

  const doc = await db
    .collection(PRODUCTS_COLLECTION)
    .doc(scopeId)
    .collection('products')
    .doc(productId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data()
  } as ScannedProduct;
}

/**
 * Ajouter un nouveau produit scanné
 */
export async function addProduct(
  payload: Omit<ScannedProduct, 'id' | 'scannedAt' | 'recallStatus'>
): Promise<ScannedProduct> {
  const db = getFirestore();
  const scopeId = await getProductsScopeId();
  const userId = await getCurrentUserId();

  const product: ScannedProduct & { scannedBy?: string } = {
    ...payload,
    id: nanoid(),
    scannedAt: Date.now(),
    recallStatus: 'unknown',
    scannedBy: userId // Ajouter l'utilisateur qui a scanné
  };

  await db
    .collection(PRODUCTS_COLLECTION)
    .doc(scopeId)
    .collection('products')
    .doc(product.id)
    .set(product);

  console.log(`[firebaseProductsService] Product ${product.id} added to scope ${scopeId}`);

  return product;
}

/**
 * Mettre à jour un produit
 */
export async function updateProduct(
  productId: string,
  updates: Partial<ScannedProduct>
): Promise<void> {
  const db = getFirestore();
  const scopeId = await getProductsScopeId();

  await db
    .collection(PRODUCTS_COLLECTION)
    .doc(scopeId)
    .collection('products')
    .doc(productId)
    .update(updates);

  console.log(`[firebaseProductsService] Product ${productId} updated`);
}

/**
 * Supprimer un produit
 */
export async function removeProduct(productId: string): Promise<void> {
  const db = getFirestore();
  const scopeId = await getProductsScopeId();

  await db
    .collection(PRODUCTS_COLLECTION)
    .doc(scopeId)
    .collection('products')
    .doc(productId)
    .delete();

  console.log(`[firebaseProductsService] Product ${productId} removed`);
}

/**
 * Supprimer plusieurs produits
 */
export async function removeProducts(productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;

  const db = getFirestore();
  const scopeId = await getProductsScopeId();

  // Utiliser un batch pour supprimer plusieurs documents
  const batch = db.batch();

  productIds.forEach(productId => {
    const docRef = db
      .collection(PRODUCTS_COLLECTION)
      .doc(scopeId)
      .collection('products')
      .doc(productId);
    batch.delete(docRef);
  });

  await batch.commit();

  console.log(`[firebaseProductsService] Removed ${productIds.length} products`);
}

/**
 * Supprimer les produits plus anciens qu'une certaine date
 * Utilisé pour la rétention d'historique
 */
export async function removeProductsOlderThan(cutoffTimestamp: number): Promise<number> {
  const db = getFirestore();
  const scopeId = await getProductsScopeId();

  const snapshot = await db
    .collection(PRODUCTS_COLLECTION)
    .doc(scopeId)
    .collection('products')
    .where('scannedAt', '<', cutoffTimestamp)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  console.log(`[firebaseProductsService] Removed ${snapshot.size} old products`);

  return snapshot.size;
}

/**
 * Écouter les changements en temps réel (pour synchronisation)
 */
export function subscribeToProducts(
  callback: (products: ScannedProduct[]) => void
): () => void {
  let unsubscribe: (() => void) | null = null;

  getProductsScopeId().then(scopeId => {
    const db = getFirestore();

    unsubscribe = db
      .collection(PRODUCTS_COLLECTION)
      .doc(scopeId)
      .collection('products')
      .orderBy('scannedAt', 'desc')
      .onSnapshot(
        snapshot => {
          const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ScannedProduct[];

          callback(products);
        },
        error => {
          console.error('[firebaseProductsService] Subscription error:', error);
        }
      );
  });

  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}
