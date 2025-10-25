import { ScannedProduct, RecallRecord } from '../types';

function normalizeLot(lot: string) {
  return lot
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '')
    .toUpperCase();
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

export function matchLots(product: ScannedProduct, recall: RecallRecord) {
  const normalized = normalizeLot(product.lotNumber);

  const matches = recall.lotNumbers.some((lot) => {
    const candidate = normalizeLot(lot);

    if (candidate === normalized) {
      return true;
    }

    if (Math.abs(candidate.length - normalized.length) > 2) {
      return false;
    }

    const distance = levenshteinDistance(candidate, normalized);
    return distance <= 2;
  });

  return matches;
}

export function getRecallStatus(product: ScannedProduct, recalls: RecallRecord[]) {
  const relevant = recalls.filter((recall) => matchLots(product, recall));

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
