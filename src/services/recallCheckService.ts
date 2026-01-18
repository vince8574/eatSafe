import { fetchRecallsByCountry } from './apiService';
import type { CountryCode } from '../types';

export interface RecallCheckResult {
  productId: string;
  wasUpdated: boolean;
  newRecalls: Array<{
    id: string;
    title: string;
    description?: string;
    brand?: string;
    lotNumbers: string[];
  }>;
}

/**
 * Vérifie tous les produits scannés contre les rappels actuels
 * Retourne la liste des produits qui ont un nouveau statut de rappel
 */
export async function checkAllProductsForRecalls(
  products: Array<{
    id: string;
    brand: string;
    lotNumber: string;
    recallStatus: 'unknown' | 'safe' | 'recalled' | 'warning';
  }>,
  country: CountryCode
): Promise<RecallCheckResult[]> {
  console.log(`[RecallCheck] Checking ${products.length} products for recalls in ${country}`);

  try {
    // Récupérer tous les rappels actuels
    const recalls = await fetchRecallsByCountry(country);
    console.log(`[RecallCheck] Found ${recalls.length} total recalls`);

    const results: RecallCheckResult[] = [];

    // Pour chaque produit scanné
    for (const product of products) {
      // Chercher les rappels correspondants
      const matchingRecalls = recalls.filter((recall) => {
        const brandMatch = recall.brand?.toLowerCase() === product.brand.toLowerCase();
        const lotMatch = recall.lotNumbers.some(
          (lot) => lot.toLowerCase() === product.lotNumber.toLowerCase() || lot === ''
        );
        return brandMatch && lotMatch;
      });

      // Si le produit était "safe" ou "unknown" mais a maintenant des rappels
      if (matchingRecalls.length > 0 && (product.recallStatus === 'safe' || product.recallStatus === 'unknown')) {
        console.log(`[RecallCheck] ⚠️ Product ${product.id} (${product.brand} ${product.lotNumber}) has new recalls!`);

        results.push({
          productId: product.id,
          wasUpdated: true,
          newRecalls: matchingRecalls.map(recall => ({
            id: recall.id,
            title: recall.title,
            description: recall.description,
            brand: recall.brand,
            lotNumbers: recall.lotNumbers
          }))
        });
      } else if (matchingRecalls.length === 0 && product.recallStatus !== 'safe') {
        // Le produit n'a plus de rappels (rare, mais possible si un rappel est retiré)
        results.push({
          productId: product.id,
          wasUpdated: true,
          newRecalls: []
        });
      }
    }

    console.log(`[RecallCheck] Found ${results.length} products with status changes`);
    return results;
  } catch (error) {
    console.error('[RecallCheck] Error checking products:', error);
    throw error;
  }
}

/**
 * Vérifie un seul produit contre les rappels actuels
 */
export async function checkProductForRecalls(
  brand: string,
  lotNumber: string,
  country: CountryCode
): Promise<Array<{
  id: string;
  title: string;
  description?: string;
  brand?: string;
  lotNumbers: string[];
}>> {
  console.log(`[RecallCheck] Checking single product: ${brand} ${lotNumber}`);

  try {
    const recalls = await fetchRecallsByCountry(country);

    const matchingRecalls = recalls.filter((recall) => {
      // Si la marque est fournie, vérifier marque ET lot
      // Sinon, vérifier uniquement le lot (mode professionnel)
      const lotMatch = recall.lotNumbers.some(
        (lot) => lot.toLowerCase() === lotNumber.toLowerCase() || lot === ''
      );

      if (brand && brand.trim() !== '') {
        const brandMatch = recall.brand?.toLowerCase() === brand.toLowerCase();
        return brandMatch && lotMatch;
      } else {
        // Mode sans marque : vérifier uniquement le lot
        return lotMatch;
      }
    });

    console.log(`[RecallCheck] Found ${matchingRecalls.length} matching recalls`);

    return matchingRecalls.map(recall => ({
      id: recall.id,
      title: recall.title,
      description: recall.description,
      brand: recall.brand,
      lotNumbers: recall.lotNumbers
    }));
  } catch (error) {
    console.error('[RecallCheck] Error checking product:', error);
    throw error;
  }
}
