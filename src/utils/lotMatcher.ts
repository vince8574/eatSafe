import { ScannedProduct, RecallRecord } from '../types';
import { aliasMatchesBrand } from './bestByDate';

function normalizeLot(lot: string) {
  return lot
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '')
    .toUpperCase();
}

// Normalisation utilisee pour COMPARER un lot saisi/scanne au lot publie par
// l'agence. Plus agressive que normalizeLot ci-dessus : elle retire aussi le
// point et la barre oblique (« 4100/01473 » -> « 410001473 »), car l'affichage
// les conserve mais la comparaison ne doit pas en dependre.
// Vivait dans ScanLotScreen ; deplacee ici pour etre testable sans monter tout
// l'ecran, et pour qu'une copie ne puisse plus diverger de l'originale.
export function normalizeLotValue(lot: string) {
  return lot.replace(/\s+/g, '').replace(/[-_.\/]/g, '').toUpperCase();
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
  recall: { brand?: string; brandAliases?: string[]; lotNumbers?: string[] }
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

  // La marque du rappel est souvent la SOCIÉTÉ ("Boticelli Foods"), pas celle
  // du rayon ("bettergoods"). Le lot ayant déjà matché, accepter aussi un alias
  // issu du titre reste sûr — et sans ça, ce chemin de vérification (saisie
  // manuelle, re-contrôle depuis l'écran détail) rejetait un vrai rappel que
  // l'écran de scan, lui, détectait. Deux réponses différentes pour un même
  // produit : le pire des cas.
  if (aliasMatchesBrand(product.brand, recall.brandAliases)) {
    return true;
  }

  // Lot identique mais marque du rappel différente du produit → PAS un rappel de
  // CE produit (ex. lot "25041" partagé par deux marques sans rapport).
  return false;
}

// ---------------------------------------------------------------------------
// COMMUNIQUÉS de presse FDA sans numéro de lot (cas Taylor Farms juil. 2026 :
// les lots/dates sont dans la page, pas dans les données structurées). On ne
// peut PAS asserter "RAPPELÉ" (aucun lot à comparer), mais on émet un
// AVERTISSEMENT "rappel possible — vérifiez" au NIVEAU MARQUE : l'objectif
// produit est d'alerter le consommateur dès le communiqué FDA, en lui montrant
// les infos d'identification publiées (dates "Best if Used By"…).
//
// Garde-fous anti-spam (incident du 20/07 : notifications en série) :
// 1. SOURCE : uniquement le flux RSS officiel FDA des communiqués
//    ('fda-press', ~20-100 entrées récentes). Les ~2 400 enregistrements
//    enforcement sans lot (FDA/USDA) n'alertent JAMAIS.
// 2. RÉCENCE : communiqué de moins de 60 jours.
// 3. MARQUE : égalité exacte normalisée OU token distinctif partagé (≥4
//    lettres, hors termes d'entreprise). JAMAIS de sous-chaîne : "U" est
//    contenu dans presque tout, "CocaCola" ⊂ "CocaCola Southwest Beverages".
// ---------------------------------------------------------------------------

const WARNING_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 jours

// Termes d'entreprise/génériques : jamais suffisants à eux seuls pour relier
// deux marques ("Great Value" ↔ "Great Lakes Cheese" ne matche pas).
const BRAND_GENERIC_TOKENS = new Set([
  'brand', 'brands', 'company', 'corp', 'corporation', 'group', 'holdings',
  'international', 'incorporated', 'foods', 'food', 'farms', 'farm', 'fresh',
  'freshly', 'great', 'value', 'best', 'premium', 'choice', 'select', 'quality',
  'market', 'marketside', 'family', 'house', 'garden', 'valley', 'nature',
  'natural', 'naturals', 'simply', 'organic', 'organics', 'golden', 'classic',
  'retail', 'wholesale', 'distribution', 'products', 'produce', 'american'
]);

// La FDA renseigne la RAISON SOCIALE ("Taylor Fresh Foods Inc"), pas la marque
// consommateur ("Taylor Farms" sur Open Food Facts) : l'égalité échoue mais le
// token distinctif "taylor" les relie. Seuil ≥4 lettres : couvre "Dole",
// bloque "U" (les marques de 1-3 lettres ne peuvent pas alerter).
function distinctiveBrandTokens(brand: string): Set<string> {
  const out = new Set<string>();
  for (const w of brand.toLowerCase().split(/[^a-z]+/i)) {
    if (w.length >= 4 && !BRAND_GENERIC_TOKENS.has(w)) out.add(w);
  }
  return out;
}

function brandMatchesForWarning(productBrand: string, recallBrand: string | undefined): boolean {
  if (!recallBrand || isUnknownBrand(productBrand) || isUnknownBrand(recallBrand)) return false;
  const a = normalizeBrand(productBrand);
  const b = normalizeBrand(recallBrand);
  if (a && b && a === b) return true; // égalité exacte (ex. "Malichita" == "Malichita")
  const mine = distinctiveBrandTokens(productBrand);
  if (mine.size === 0) return false; // pas de token distinctif → jamais d'alerte
  const theirs = distinctiveBrandTokens(recallBrand);
  for (const tok of mine) {
    if (theirs.has(tok)) return true;
  }
  return false;
}

/**
 * Un COMMUNIQUÉ FDA récent (sans lots publiés) concerne-t-il la marque de ce
 * produit ? Alerte au niveau marque : toute la gamme est signalée "rappel
 * possible — à vérifier" (ambre), jamais "RAPPELÉ" (rouge). L'utilisateur
 * tranche avec les infos publiées (dates "Best if Used By", descriptions).
 */
export function recallWarnsProduct(
  product: { brand: string; productName?: string },
  recall: {
    brand?: string;
    brandAliases?: string[];
    lotNumbers?: string[];
    source?: string;
    publishedAt?: string;
    title?: string;
    description?: string;
  }
): boolean {
  // Avec lots, c'est recallMatchesProduct qui tranche (un non-match de lot
  // signifie "pas concerné", pas "warning").
  if ((recall.lotNumbers ?? []).length > 0) return false;

  // Uniquement le flux RSS officiel des communiqués FDA — jamais les vieux
  // enregistrements enforcement sans lot (source du spam de notifications).
  if (recall.source !== 'fda-press') return false;

  // Communiqué RÉCENT uniquement (date illisible → pas d'alerte, jamais
  // l'inverse).
  const ts = Date.parse(recall.publishedAt ?? '');
  if (!Number.isFinite(ts) || Date.now() - ts > WARNING_MAX_AGE_MS) return false;

  // La société qui rappelle n'est pas la marque en rayon ("Boticelli Foods"
  // rappelle « bettergoods ») : on teste aussi le segment produit du titre,
  // sinon l'utilisateur qui saisit la marque du pot n'est jamais averti.
  if (brandMatchesForWarning(product.brand, recall.brand)) return true;
  return (recall.brandAliases ?? []).some((alias) => brandMatchesForWarning(product.brand, alias));
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
