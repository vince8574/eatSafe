import { ScannedProduct, RecallRecord } from '../types';

function normalizeLot(lot: string) {
  return lot
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '')
    .toUpperCase();
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

  const unknownTokens = [
    'UNKNOWN',
    'INCONNU',
    'DESCONOCIDO',
    'DESCONHECIDO',
    'SCONOSCIUTO',
    'UNBEKANNT',
    'ONBEKEND',
    'UNK',
    'NA',
    'NONE'
  ];

  return unknownTokens.includes(normalized);
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

  // Ignore very short lot numbers — too likely to cause false positives
  if (normalized.length < 3) {
    return false;
  }

  const matches = (recall.lotNumbers ?? []).some((lot) => {
    const candidate = normalizeLot(lot);

    if (!candidate || candidate.length < 3) {
      return false;
    }

    // Exact match
    if (candidate === normalized) {
      return true;
    }

    // Substring match only if the scanned lot is long enough (≥6 chars)
    // to avoid short codes matching inside longer ones
    if (normalized.length >= 6) {
      if (candidate.includes(normalized) || normalized.includes(candidate)) {
        return true;
      }
    }

    // Fuzzy match: scale threshold with lot length
    if (Math.abs(candidate.length - normalized.length) > 2) {
      return false;
    }

    const distance = levenshteinDistance(candidate, normalized);
    // Allow 1 edit for lots < 8 chars, 2 edits for longer lots
    const maxDistance = normalized.length < 8 ? 1 : 2;
    return distance <= maxDistance;
  });

  return matches;
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
  const brandMatches = matchBrands(product.brand, recall.brand);
  const lotMatches = matchLots(product as ScannedProduct, recall as RecallRecord);

  // If recall has no brand info, lot match alone is enough
  if (lotMatches && (!recall.brand || recall.brand.trim() === '')) {
    return true;
  }

  // If recall has a brand, require both brand AND lot to match
  if (lotMatches && brandMatches) {
    return true;
  }

  // For recalls without explicit lot codes, require brand match
  const hasNoLots = !recall.lotNumbers || recall.lotNumbers.length === 0;
  return hasNoLots && brandMatches;
}

export function getRecallStatus(product: ScannedProduct, recalls: RecallRecord[]) {
  const relevant = recalls.filter((recall) => recallMatchesProduct(product, recall));

  if (relevant.length === 0) {
    return {
      status: 'safe' as const,
      recallReference: undefined
    };
  }

  return {
    status: 'recalled' as const,
    recallReference: relevant[0].id
  };
}
