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

  // Log for lot 58041 specifically
  if (candidate.includes('58041') || recallLot.includes('58041')) {
    console.log('[matchCandidate] Comparing 58041:', {
      candidate,
      normalized,
      recallLot,
      recallNormalized,
      exactMatch: normalized === recallNormalized,
      partialMatch: normalized.includes(recallNormalized) || recallNormalized.includes(normalized)
    });
  }

  // Match exact
  if (normalized === recallNormalized) {
    return true;
  }

  // Match partiel (le candidat contient le lot de rappel ou vice versa)
  if (normalized.includes(recallNormalized) || recallNormalized.includes(normalized)) {
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
 * Vérifie tous les candidats de numéros de lot contre les rappels d'une marque
 */
export async function checkAllCandidates(
  candidates: string[],
  brand: string,
  country: string
): Promise<CandidateMatchResult> {
  console.log('[checkAllCandidates] Checking candidates:', candidates);
  console.log('[checkAllCandidates] Brand:', brand);

  try {
    // Récupérer les rappels du pays
    const allRecalls = await fetchRecallsByCountry(country as any);

    console.log(`[checkAllCandidates] Checking ${allRecalls.length} total recalls`);

    // Vérifier chaque candidat contre TOUS les rappels (pas seulement ceux de la marque)
    // Car le nom de la marque peut varier (nom de produit vs fabricant)
    for (const candidate of candidates) {
      for (const recall of allRecalls) {
        // Vérifier si ce candidat matche avec un des numéros de lot du rappel
        for (const recallLot of recall.lotNumbers) {
          if (matchCandidate(candidate, recallLot)) {
            // Bonus: vérifier si la marque correspond aussi (pour privilégier les bons matches)
            const brandMatch = recall.brand?.toLowerCase() === brand.toLowerCase();
            console.log(`[checkAllCandidates] ✅ MATCH FOUND! Candidate "${candidate}" matches recall lot "${recallLot}" (brand match: ${brandMatch})`);
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
