import { RecallRecord } from '../types';
import { fetchRecallsByCountry } from './apiService';

function normalizeLot(lot: string) {
  return lot
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '')
    .replace(/\./g, '')
    .toUpperCase();
}

/**
 * Vérifie si un candidat de numéro de lot matche avec un lot de rappel
 */
function matchCandidate(candidate: string, recallLot: string): boolean {
  const normalized = normalizeLot(candidate);
  const recallNormalized = normalizeLot(recallLot);

  // Skip empty or very short values to avoid false positives
  if (normalized.length < 3 || recallNormalized.length < 3) {
    return false;
  }

  // Exact match
  if (normalized === recallNormalized) {
    return true;
  }

  // Partial match: only if the shorter string is at least 6 chars
  // (avoids matching short tokens like "123" against everything)
  const shorter = normalized.length <= recallNormalized.length ? normalized : recallNormalized;
  const longer = normalized.length > recallNormalized.length ? normalized : recallNormalized;
  if (shorter.length >= 6 && longer.includes(shorter)) {
    return true;
  }

  return false;
}

export interface CandidateMatchResult {
  hasRecall: boolean;
  matchedCandidate?: string;
  matchedRecall?: RecallRecord;
}

/**
 * Checks if brand names are similar enough to be considered the same
 */
function brandMatches(scannedBrand: string | undefined | null, recallBrand: string | undefined): boolean {
  // Brand is OPTIONAL in this app: matching is primarily lot-only against the US
  // APIs. When no brand was scanned, skip brand matching (don't crash) so the
  // lot-only exact match (Phase 2) still runs.
  if (!scannedBrand || !recallBrand) return false;
  const a = scannedBrand.toLowerCase().trim();
  const b = recallBrand.toLowerCase().trim();
  if (a === b) return true;
  // Check if one contains the other (e.g. "Nestlé France" contains "Nestlé")
  if (a.length >= 3 && b.includes(a)) return true;
  if (b.length >= 3 && a.includes(b)) return true;
  return false;
}

/**
 * Vérifie tous les candidats de numéros de lot contre les rappels d'une marque
 */
export async function checkAllCandidates(
  candidates: string[],
  brand: string | undefined,
  country: string
): Promise<CandidateMatchResult> {
  console.log('[checkAllCandidates] Checking candidates:', candidates);
  console.log('[checkAllCandidates] Brand:', brand);

  try {
    const allRecalls = await fetchRecallsByCountry(country as any);

    console.log(`[checkAllCandidates] Checking ${allRecalls.length} total recalls`);

    // Phase 1: Check recalls matching the brand first (high confidence)
    const brandRecalls = allRecalls.filter(r => brandMatches(brand, r.brand));
    console.log(`[checkAllCandidates] ${brandRecalls.length} recalls match brand "${brand}"`);

    for (const candidate of candidates) {
      for (const recall of brandRecalls) {
        for (const recallLot of recall.lotNumbers) {
          if (matchCandidate(candidate, recallLot)) {
            console.log(`[checkAllCandidates] ✅ BRAND+LOT MATCH! "${candidate}" matches recall lot "${recallLot}"`);
            return {
              hasRecall: true,
              matchedCandidate: candidate,
              matchedRecall: recall
            };
          }
        }
      }
    }

    // Phase 2: Check all recalls but require exact lot match only (no substring)
    for (const candidate of candidates) {
      const normalizedCandidate = normalizeLot(candidate);
      if (normalizedCandidate.length < 5) continue; // Skip very short candidates

      for (const recall of allRecalls) {
        for (const recallLot of recall.lotNumbers) {
          const normalizedRecallLot = normalizeLot(recallLot);
          if (normalizedCandidate === normalizedRecallLot && normalizedRecallLot.length >= 5) {
            console.log(`[checkAllCandidates] ✅ EXACT LOT MATCH (different brand)! "${candidate}" matches recall lot "${recallLot}"`);
            return {
              hasRecall: true,
              matchedCandidate: candidate,
              matchedRecall: recall
            };
          }
        }
      }
    }

    console.log('[checkAllCandidates] No matches found - product is safe');
    return {
      hasRecall: false
    };
  } catch (error) {
    console.error('[checkAllCandidates] Error checking recalls:', error);
    throw error;
  }
}
