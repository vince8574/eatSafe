/**
 * Service pour la recherche d'informations produit
 * Optimisé pour le marché américain avec Open Food Facts
 *
 * Note : Pour les rappels alimentaires, l'app utilise l'API FDA officielle
 * (voir apiService.ts)
 */

export interface ProductInfo {
  barcode: string;
  productName: string;
  brand: string;
  brands: string;
  categories?: string;
  imageUrl?: string;
  source: 'openfoodfacts';
}

const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v2';

/**
 * Récupère les informations produit depuis Open Food Facts (avec priorité USA)
 */
async function getProductFromOpenFoodFacts(barcode: string): Promise<ProductInfo | null> {
  try {
    console.log(`[OpenFoodFacts] Fetching product for barcode: ${barcode}`);

    // Essayer avec le domaine US en priorité
    const usResponse = await fetch(
      `https://us.openfoodfacts.org/api/v2/product/${barcode}.json`
    );

    let data;

    if (usResponse.ok) {
      data = await usResponse.json();
    } else {
      // Fallback sur le domaine mondial
      const worldResponse = await fetch(
        `${OPEN_FOOD_FACTS_API}/product/${barcode}.json`
      );

      if (!worldResponse.ok) {
        console.warn(`[OpenFoodFacts] API returned status ${worldResponse.status}`);
        return null;
      }

      data = await worldResponse.json();
    }

    if (data.status === 0 || !data.product) {
      console.log(`[OpenFoodFacts] Product not found for barcode: ${barcode}`);
      return null;
    }

    const product = data.product;

    // Extraire la marque principale
    let brand = product.brands || '';
    if (brand.includes(',')) {
      brand = brand.split(',')[0].trim();
    }

    const productInfo: ProductInfo = {
      barcode,
      productName:
        product.product_name ||
        product.product_name_en ||
        product.product_name_fr ||
        'Unknown Product',
      brand: brand || 'Unknown Brand',
      brands: product.brands || '',
      categories: product.categories,
      imageUrl: product.image_url || product.image_front_url,
      source: 'openfoodfacts'
    };

    console.log(`✅ [OpenFoodFacts] Product found: ${productInfo.productName}`);
    return productInfo;
  } catch (error) {
    console.error('[OpenFoodFacts] Error:', error);
    return null;
  }
}

/**
 * Recherche d'informations produit par code-barres
 * Utilise Open Food Facts avec priorité pour le marché américain
 */
export async function getProductByBarcode(barcode: string): Promise<ProductInfo | null> {
  console.log(`\n🔍 [ProductLookup] Looking up barcode: ${barcode}`);

  const productInfo = await getProductFromOpenFoodFacts(barcode);

  if (productInfo) {
    console.log(`✅ [ProductLookup] Product found: ${productInfo.productName}`);
    return productInfo;
  }

  console.log(`❌ [ProductLookup] Product not found`);
  return null;
}

/**
 * Valide qu'un code-barres a un format valide
 * Supporte : EAN-8, UPC-A, EAN-13, ITF-14, et QR codes (alphanumériques)
 */
export function isValidBarcode(barcode: string): boolean {
  const cleanBarcode = barcode.trim();

  // Codes-barres numériques standards (8, 12, 13, 14 chiffres)
  if (/^\d{8}$|^\d{12,14}$/.test(cleanBarcode)) {
    return true;
  }

  // QR codes et autres codes 2D (alphanumériques, 4-100 caractères)
  if (/^[A-Za-z0-9\-_.:/]{4,100}$/.test(cleanBarcode)) {
    return true;
  }

  return false;
}
