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
  // Data for the dietary profile (allergens / foods / nutrition). Populated from
  // OFF; feeds dietaryCheckService (zero AI cost).
  ingredientsText?: string;
  allergensTags?: string[]; // e.g. ["en:milk"]
  tracesTags?: string[]; // "may contain"
  ingredientsTags?: string[]; // e.g. ["en:pork"]
  ingredientsAnalysisTags?: string[]; // e.g. ["en:non-vegetarian","en:vegan"]
  nutriments?: Record<string, number | undefined>; // sugars_100g, fat_100g, salt_100g...
  nutriscoreGrade?: string; // a..e
  novaGroup?: number; // 1..4
}

const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v2';

/**
 * Récupère les informations produit depuis Open Food Facts (avec priorité USA)
 */
function fetchWithTimeout(url: string, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function getProductFromOpenFoodFacts(barcode: string): Promise<ProductInfo | null> {
  try {
    console.log(`[OpenFoodFacts] Fetching product for barcode: ${barcode}`);

    // Essayer avec le domaine US en priorité (timeout 5s)
    const usResponse = await fetchWithTimeout(
      `https://us.openfoodfacts.org/api/v2/product/${barcode}.json`
    );

    let data;

    if (usResponse.ok) {
      data = await usResponse.json();
    } else {
      // Fallback sur le domaine mondial (timeout 5s)
      const worldResponse = await fetchWithTimeout(
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
      source: 'openfoodfacts',
      ingredientsText: product.ingredients_text_en || product.ingredients_text || undefined,
      allergensTags: Array.isArray(product.allergens_tags) ? product.allergens_tags : undefined,
      tracesTags: Array.isArray(product.traces_tags) ? product.traces_tags : undefined,
      ingredientsTags: Array.isArray(product.ingredients_tags) ? product.ingredients_tags : undefined,
      ingredientsAnalysisTags: Array.isArray(product.ingredients_analysis_tags)
        ? product.ingredients_analysis_tags
        : undefined,
      nutriments: product.nutriments || undefined,
      nutriscoreGrade: product.nutriscore_grade || undefined,
      novaGroup: typeof product.nova_group === 'number' ? product.nova_group : undefined
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
