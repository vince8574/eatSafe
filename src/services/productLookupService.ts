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

// Champs demandés explicitement. SANS ce paramètre, l'API renvoie la fiche
// ENTIÈRE : mesuré à 148 Ko pour du Nutella, 51 Ko pour une salade traiteur,
// contre 3 à 5 Ko en ciblant les champs — un rapport de 7 à 43. Avec le délai
// d'attente de 5 s ci-dessous, ce volume faisait échouer la recherche sur
// connexion mobile, et le produit ressortait « marque non détectée » alors
// qu'il est bien dans la base. C'est ce que faisait déjà la version française.
const OFF_FIELDS = [
  'product_name', 'product_name_en', 'product_name_fr', 'brands', 'categories',
  'image_url', 'image_front_url', 'ingredients_text', 'ingredients_text_en',
  'allergens_tags', 'traces_tags', 'ingredients_tags', 'ingredients_analysis_tags',
  'nutriments', 'nutriscore_grade', 'nova_group'
].join(',');

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

    // Domaine MONDIAL directement. Vérifié en interrogeant us., fr. et world.
    // sur des produits américains comme français : les trois renvoient
    // exactement la même fiche. Les sous-domaines ne filtrent pas la recherche
    // par code-barres, la base est commune — passer par `us.` n'apportait donc
    // rien, et ajoutait un repli qui ne se déclenchait jamais (voir ci-dessous).
    const response = await fetchWithTimeout(
      `${OPEN_FOOD_FACTS_API}/product/${barcode}.json?fields=${OFF_FIELDS}`
    );

    if (!response.ok) {
      console.warn(`[OpenFoodFacts] API returned status ${response.status}`);
      return null;
    }

    const data = await response.json();

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
