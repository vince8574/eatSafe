import { ScannedProduct, RecallRecord } from '../types';

function normalizeLot(lot: string) {
  return lot
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '')
    .toUpperCase();
}

// Un lot est DISTINCTIF s'il porte assez d'entropie pour identifier un rappel
// SANS corroboration de marque. Un code court purement numérique (ex. "25041",
// "00713", "16104") entre en collision avec des rappels US sans aucun rapport :
// la base FDA/USDA est pleine de codes date courts (YYMMDD/JJ) et de séquences
// courtes. Asserter "RAPPELÉ" sur un tel lot seul = fausse alerte sur un produit
// étranger (ex. un thon FR "Petit Navire" lot 25041 vs un rappel US lot 25041).
// Règle : alphanumérique (présence d'une lettre) → 4+ caractères suffisent ;
// purement numérique → 6+ chiffres requis.
export function isDistinctiveLot(lot: string): boolean {
  const n = normalizeLot(lot);
  if (/[A-Z]/.test(n)) return n.length >= 4;
  return n.length >= 6;
}

function normalizeBrand(brand: string) {
  return brand
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
}

function isUnknownBrand(brand: string) {
  const normalized = normalizeBrand(brand);

  // Empty, N/A or translated "unknown" placeholders should not block matches
  if (!normalized) {
    return true;
  }

  // Placeholders LONGS : startsWith pour attraper "Unknown Brand" / "Unknown
  // Product" (normalisés "UNKNOWNBRAND"...) et "Inconnue", etc.
  const longPlaceholders = [
    'UNKNOWN',
    'INCONNU',
    'DESCONOCIDO',
    'DESCONHECIDO',
    'SCONOSCIUTO',
    'UNBEKANNT',
    'ONBEKEND'
  ];
  if (longPlaceholders.some((tok) => normalized.startsWith(tok))) {
    return true;
  }

  // Codes COURTS : match EXACT uniquement. Avant, startsWith avec "NA"/"UNK"/"NONE"
  // classait des MARQUES RÉELLES comme inconnues ("NAVITAS", "NATURE", "UNILEVER",
  // "NABISCO"…). Une marque "inconnue" fait que matchBrands renvoie vrai pour TOUS
  // les produits → un rappel sans numéro de lot matchait alors TOUTE la base
  // (fausses alertes "DO NOT CONSUME" massives, ex. rappel FDA H-0533-2026/Navitas).
  return ['UNK', 'NA', 'NAN', 'NONE', 'NULL'].includes(normalized);
}

function levenshteinDistance(a: string, b: string) {
  const matrix: number[][] = [];

  const aLen = a.length;
  const bLen = b.length;

  for (let i = 0; i <= bLen; i += 1) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLen; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLen; i += 1) {
    for (let j = 1; j <= aLen; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[bLen][aLen];
}

function matchBrands(productBrand: string, recallBrand: string | undefined) {
  if (!recallBrand || !productBrand || isUnknownBrand(productBrand) || isUnknownBrand(recallBrand)) {
    return true;
  }

  const normalizedProduct = normalizeBrand(productBrand);
  const normalizedRecall = normalizeBrand(recallBrand);

  if (normalizedProduct === normalizedRecall) {
    return true;
  }

  if (normalizedProduct.includes(normalizedRecall) || normalizedRecall.includes(normalizedProduct)) {
    return true;
  }

  const maxLength = Math.max(normalizedProduct.length, normalizedRecall.length);
  const distance = levenshteinDistance(normalizedProduct, normalizedRecall);
  const threshold = Math.ceil(maxLength * 0.3);

  return distance <= threshold;
}

// Marque STRICTE (exact/contains, SANS flou Levenshtein, SANS "unknown") : pour le
// repli "rappel sans numéro de lot" où il n'y a aucune corroboration par le lot.
// Un flou ou une marque inconnue y déclencherait des alertes à tort sur toute une
// gamme / toute la base.
function brandMatchesStrict(productBrand: string, recallBrand: string | undefined) {
  if (!recallBrand || !productBrand || isUnknownBrand(productBrand) || isUnknownBrand(recallBrand)) {
    return false;
  }
  const a = normalizeBrand(productBrand);
  const b = normalizeBrand(recallBrand);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function matchLots(product: ScannedProduct, recall: RecallRecord) {
  const normalized = normalizeLot(product.lotNumber);

  // Lots trop courts → trop de faux positifs.
  if (normalized.length < 4) {
    return false;
  }

  return (recall.lotNumbers ?? []).some((lot) => {
    const candidate = normalizeLot(lot);

    if (!candidate || candidate.length < 4) {
      return false;
    }

    // Match exact (après normalisation).
    if (candidate === normalized) {
      return true;
    }

    // Sous-chaîne SÛRE uniquement : le lot SCANNÉ (≥8 car.) entièrement contenu
    // dans le lot du rappel (cas légitime où la base liste le lot noyé dans un
    // texte plus long). On NE matche PLUS le sens inverse (un fragment court de
    // rappel contenu dans un lot scanné/mal lu), source de fausses alertes sur
    // les lots OCR imparfaits.
    if (normalized.length >= 8 && candidate.includes(normalized)) {
      return true;
    }

    // PAS de matching flou (Levenshtein) sur les lots : source majeure de fausses
    // alertes.
    return false;
  });
}

/**
 * Single source of truth: does a recall record match a scanned product?
 * Combines fuzzy brand matching, fuzzy + substring lot matching, and the
 * "global product line recall" fallback (recall with no specific lots).
 */
export function recallMatchesProduct(
  product: { brand: string; lotNumber: string },
  recall: { brand?: string; lotNumbers?: string[] }
): boolean {
  // Marque INCONNUE : aucune corroboration possible par la marque, donc on
  // exige un match de lot EXACT (ni sous-chaîne ni flou) et assez long. Sinon
  // un lot-poubelle ("GRFG", "APR2026"…) matche n'importe quel rappel de la
  // base FDA/USDA → fausses notifications "DO NOT CONSUME".
  if (isUnknownBrand(product.brand)) {
    // Marque produit inconnue → aucune corroboration possible : le lot doit être
    // DISTINCTIF (sinon "25041" matche n'importe quel rappel court de la base).
    if (!isDistinctiveLot(product.lotNumber)) {
      return false;
    }
    const normalized = normalizeLot(product.lotNumber);
    return (recall.lotNumbers ?? []).some((lot) => normalizeLot(lot) === normalized);
  }

  const lotMatches = matchLots(product as ScannedProduct, recall as RecallRecord);
  if (!lotMatches) {
    // Rappel SANS numéro de lot : PAS de match sur la seule marque. Testé en réel :
    // un rappel US "Kraft" sans lots extraits flaguait TOUS les produits Kraft
    // scannés (cheddar français inclus) en "RAPPELÉ" → fausses alertes en série.
    // Mieux vaut un faux négatif silencieux qu'une fausse alerte "NE CONSOMMEZ PAS".
    return false;
  }

  // Le rappel a-t-il une marque EXPLOITABLE ? (vide / "unknown" = inexploitable)
  const recallHasUsableBrand =
    !!recall.brand && recall.brand.trim() !== '' && !isUnknownBrand(recall.brand);

  // Rappel SANS marque exploitable : le lot doit suffire À LUI SEUL → on n'accepte
  // que si le lot est DISTINCTIF. Un lot court purement numérique ("25041") ne
  // peut pas, à lui seul, asserter un rappel sur une marque inconnue du rappel.
  if (!recallHasUsableBrand) {
    return isDistinctiveLot(product.lotNumber);
  }

  // Rappel AVEC marque exploitable : exiger marque ET lot.
  if (matchBrands(product.brand, recall.brand)) {
    return true;
  }

  // Lot identique mais marque du rappel différente du produit → PAS un rappel de
  // CE produit (ex. lot "25041" partagé par deux marques sans rapport).
  return false;
}

// ---------------------------------------------------------------------------
// Rappels SANS numéro de lot (cas Taylor Farms/FDA : les lots sont dans un PDF,
// pas dans code_info). On ne peut PAS asserter "RAPPELÉ" (pas de lot à comparer),
// mais on peut émettre un AVERTISSEMENT "rappel possible — vérifiez l'avis
// officiel" quand la MARQUE matche strictement ET que le NOM DU PRODUIT (résolu
// par le code-barres via Open Food Facts) recoupe la description du rappel.
// Ex. produit "Shredded Iceberg Lettuce" (Taylor Farms) vs rappel FDA
// "BLEND LETT/ROM ... iceberg lettuce". Sans recoupement produit, pas de
// warning : sinon TOUTE la gamme d'une grande marque s'affiche "à vérifier".
// ---------------------------------------------------------------------------

// Mots trop génériques dans les descriptions FDA / noms OFF pour porter un
// recoupement (raison sociale, conditionnement, unités…).
const WARNING_STOPWORDS = new Set([
  'food', 'foods', 'fresh', 'farm', 'farms', 'brand', 'brands', 'company',
  'product', 'products', 'organic', 'natural', 'original', 'premium', 'classic',
  'style', 'pack', 'packs', 'size', 'count', 'ounce', 'ounces', 'pound',
  'pounds', 'gram', 'grams', 'with', 'without', 'from', 'because', 'possible',
  'recall', 'recalls', 'recalled', 'service', 'distribution', 'inc', 'llc',
  'corp', 'company', 'retail', 'wholesale', 'blend', 'blends', 'mixed'
]);

// La FDA renseigne la RAISON SOCIALE ("Taylor Fresh Foods Inc"), pas la marque
// consommateur ("Taylor Farms" sur Open Food Facts) : le match strict échoue.
// Repli TOKEN DISTINCTIF : un mot de marque ≥5 lettres, hors termes génériques
// d'entreprise ("foods", "farms", "fresh", "value"…), partagé entre les deux.
// "Taylor" relie Taylor Farms ↔ Taylor Fresh Foods ; "Great Value" ↔ "Great
// Lakes Cheese" ne matche PAS ("great"/"value" sont génériques).
const BRAND_GENERIC_TOKENS = new Set([
  'brand', 'brands', 'company', 'corp', 'corporation', 'group', 'holdings',
  'international', 'incorporated', 'foods', 'food', 'farms', 'farm', 'fresh',
  'freshly', 'great', 'value', 'best', 'premium', 'choice', 'select', 'quality',
  'market', 'marketside', 'family', 'house', 'garden', 'valley', 'nature',
  'natural', 'naturals', 'simply', 'organic', 'organics', 'golden', 'classic',
  'retail', 'wholesale', 'distribution', 'products', 'produce', 'american'
]);

function distinctiveBrandTokens(brand: string): Set<string> {
  const out = new Set<string>();
  for (const w of brand.toLowerCase().split(/[^a-z]+/i)) {
    if (w.length >= 5 && !BRAND_GENERIC_TOKENS.has(w)) out.add(w);
  }
  return out;
}

// Marque pour le chemin WARNING : strict (exact/contains) OU token distinctif
// partagé. Toujours corroboré ensuite par le recoupement produit.
function brandMatchesForWarning(productBrand: string, recallBrand: string | undefined): boolean {
  if (brandMatchesStrict(productBrand, recallBrand)) return true;
  if (!recallBrand || isUnknownBrand(productBrand) || isUnknownBrand(recallBrand)) return false;
  const mine = distinctiveBrandTokens(productBrand);
  if (mine.size === 0) return false;
  const theirs = distinctiveBrandTokens(recallBrand);
  for (const tok of mine) {
    if (theirs.has(tok)) return true;
  }
  return false;
}

// Tokens significatifs (≥4 lettres, sans accents, hors stopwords), avec le
// singulier ajouté pour matcher "lettuces" ↔ "lettuce".
function productTokens(text: string): Set<string> {
  const out = new Set<string>();
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z]+/);
  for (const w of words) {
    if (w.length < 4 || WARNING_STOPWORDS.has(w)) continue;
    out.add(w);
    if (w.endsWith('s')) out.add(w.slice(0, -1));
  }
  return out;
}

/**
 * Un rappel SANS lots publiés concerne-t-il PROBABLEMENT ce produit ?
 * Conditions cumulatives : marque stricte + recoupement d'au moins un mot-clé
 * produit. Résultat = statut 'warning' (ambre, "à vérifier"), jamais 'recalled'.
 */
export function recallWarnsProduct(
  product: { brand: string; productName?: string },
  recall: { brand?: string; lotNumbers?: string[]; title?: string; description?: string; productCategory?: string }
): boolean {
  // Uniquement pour les rappels SANS lot : avec lots, c'est recallMatchesProduct
  // qui tranche (et un non-match de lot signifie "pas concerné", pas "warning").
  if ((recall.lotNumbers ?? []).length > 0) return false;

  // Marque obligatoire : stricte OU token distinctif partagé (raison sociale
  // FDA vs marque consommateur, ex. "Taylor Fresh Foods Inc" ↔ "Taylor Farms").
  if (!brandMatchesForWarning(product.brand, recall.brand)) return false;

  // Recoupement produit : sans nom de produit (scan sans code-barres), on ne
  // peut pas corroborer → pas de warning (on garde le comportement silencieux).
  const name = (product.productName ?? '').trim();
  if (!name || isUnknownBrand(name)) return false;

  const mine = productTokens(name);
  if (mine.size === 0) return false;

  const theirs = productTokens(
    [recall.title ?? '', recall.description ?? '', recall.productCategory ?? ''].join(' ')
  );

  for (const tok of mine) {
    if (theirs.has(tok)) return true;
  }
  return false;
}

export function getRecallStatus(product: ScannedProduct, recalls: RecallRecord[]) {
  const relevant = recalls.filter((recall) => recallMatchesProduct(product, recall));

  if (relevant.length > 0) {
    return {
      status: 'recalled' as const,
      recallReference: relevant[0].id
    };
  }

  // Pas de match par lot → repli "warning" : rappel sans lots publiés dont la
  // marque ET le type de produit recoupent ce produit (cf. recallWarnsProduct).
  const warnings = recalls.filter((recall) => recallWarnsProduct(product, recall));
  if (warnings.length > 0) {
    return {
      status: 'warning' as const,
      recallReference: warnings[0].id
    };
  }

  return {
    status: 'safe' as const,
    recallReference: undefined
  };
}
