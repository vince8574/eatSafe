import { fetchRecallsByCountry } from './apiService';
import { recallMatchesProduct, recallWarnsProduct } from '../utils/lotMatcher';
import type { CountryCode } from '../types';

export interface RecallCheckResult {
  productId: string;
  wasUpdated: boolean;
  // 'recalled' = match par LOT (preuve) ; 'warning' = communiqué FDA récent
  // sans lots publiés dont la marque correspond (à vérifier par l'utilisateur) ;
  // 'safe' = plus aucun rappel correspondant.
  status: 'recalled' | 'warning' | 'safe';
  newRecalls: Array<{
    id: string;
    title: string;
    description?: string;
    brand?: string;
    lotNumbers: string[];
    // Infos d'identification publiées (dates "Best if Used By"…) et lien vers
    // l'avis officiel — affichés dans la notification/l'écran détail.
    codeInfo?: string;
    link?: string;
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
    productName?: string;
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
      // Chercher les rappels correspondants (lot-first matching, see recallMatchesProduct)
      const matchingRecalls = recalls.filter((recall) =>
        recallMatchesProduct(product, recall)
      );

      // Statut CIBLE : match par lot → 'recalled' ; sinon rappel SANS lots
      // publiés recoupant marque + type de produit → 'warning' ; sinon 'safe'.
      const warningRecalls =
        matchingRecalls.length === 0
          ? recalls.filter((recall) => recallWarnsProduct(product, recall))
          : [];
      const target: RecallCheckResult['status'] =
        matchingRecalls.length > 0 ? 'recalled' : warningRecalls.length > 0 ? 'warning' : 'safe';

      // Ne signaler que les CHANGEMENTS de statut (sinon re-notification à
      // chaque check horaire). Un produit déjà 'recalled' n'est jamais
      // rétrogradé en 'warning'/"safe" par le repli sans-lot seul, SAUF si le
      // rappel a réellement disparu de la base (comportement historique).
      if (target === product.recallStatus) continue;

      const reported = target === 'recalled' ? matchingRecalls : warningRecalls;
      if (target !== 'safe') {
        console.log(
          `[RecallCheck] ${target === 'recalled' ? '🚨' : '⚠️'} Product ${product.id} (${product.brand} ${product.lotNumber}) → ${target}`
        );
      }

      results.push({
        productId: product.id,
        wasUpdated: true,
        status: target,
        newRecalls: reported.map(recall => ({
          id: recall.id,
          title: recall.title,
          description: recall.description,
          brand: recall.brand,
          lotNumbers: recall.lotNumbers,
          codeInfo: recall.codeInfo,
          link: recall.link
        }))
      });
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

    const matchingRecalls = recalls.filter((recall) =>
      recallMatchesProduct({ brand: brand ?? '', lotNumber }, recall)
    );

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
