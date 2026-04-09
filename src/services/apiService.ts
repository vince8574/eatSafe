import { RecallRecord, CountryCode, ApiError } from '../types';

type RecallResponse = {
  results: RecallRecord[];
};

const FDA_ENDPOINT = 'https://api.fda.gov/food/enforcement.json?limit=1000&sort=report_date:desc';
const USDA_ENDPOINT = 'https://www.fsis.usda.gov/fsis/api/recall';

// Cache for recalls data (5 minutes TTL)
let recallsCache: RecallRecord[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Extrait les numéros de lot du champ code_info de la FDA
 * Gère des formats comme "Lot: 58041" ou "Lot #12345" ou juste des numéros
 */
function extractFdaLotNumbers(codeInfo: string | undefined): string[] {
  if (!codeInfo) return [];

  const lotNumbers: string[] = [];

  // Pattern 1: Explicit lot keywords — "Lot: XXXXX", "Lot #XXXXX", "Lots 12255, 22265"
  const lotRegex = /\bLots?\s*[:\s#.-]*([A-Za-z0-9][A-Za-z0-9\s,\-\/]{0,80})/gi;
  let match;
  while ((match = lotRegex.exec(codeInfo)) !== null) {
    // Split by comma in case of "Lots 12255, 22265, 12415"
    const parts = match[1].split(/[,;]/);
    for (const part of parts) {
      const trimmed = part.trim().replace(/[.,;:\s]+$/, '');
      // Must be alphanumeric code, not a date or sentence
      if (trimmed && trimmed.length >= 3 && !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
        lotNumbers.push(trimmed);
      }
    }
  }

  // Pattern 2: "Batch" or "Code" keywords
  const batchRegex = /\b(?:Batch|Code)\s*[:\s#.-]*([A-Za-z0-9][A-Za-z0-9\-\/\.]{2,24})/gi;
  while ((match = batchRegex.exec(codeInfo)) !== null) {
    const trimmed = match[1].trim().replace(/[.,;:\s]+$/, '');
    if (trimmed && !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
      lotNumbers.push(trimmed);
    }
  }

  // Do NOT add full code_info text, dates, UPCs, or generic alphanumeric sequences
  // These cause false positives

  // Remove duplicates (case-insensitive)
  const uniqueLots = Array.from(new Set(lotNumbers.map(l => l.toUpperCase())))
    .map(upper => lotNumbers.find(l => l.toUpperCase() === upper) || upper);

  return uniqueLots;
}

/**
 * Récupère les rappels FDA (aliments généraux)
 */
export async function fetchFdaRecalls(): Promise<RecallRecord[]> {
  const response = await fetch(FDA_ENDPOINT);

  if (!response.ok) {
    console.warn(`[FDA] API returned status ${response.status}`);
    return [];
  }

  const data = await response.json();

  const results = (data.results ?? []).map((item: any) => {
    const extracted = extractFdaLotNumbers(item.code_info);

    return {
      id: item.recall_number,
      title: item.product_description,
      description: item.reason_for_recall,
      lotNumbers: extracted,
      brand: item.recalling_firm,
      productCategory: item.product_description,
      country: 'US' as const,
      publishedAt: item.report_date,
      link: item.more_details,
      imageUrl: undefined
    };
  });

  console.log(`[FDA] Total recalls fetched: ${results.length}`);
  return results;
}

/**
 * Récupère les rappels USDA (viandes et volailles)
 */
export async function fetchUsdaRecalls(): Promise<RecallRecord[]> {
  try {
    const response = await fetch(USDA_ENDPOINT);

    if (!response.ok) {
      console.warn(`[USDA] API returned status ${response.status}`);
      return [];
    }

    const data = await response.json();

    return (data ?? []).map((item: any) => ({
      id: item.recallNumber || item.id || `usda-${Date.now()}`,
      title: item.productName || item.description || 'Meat/Poultry Recall',
      description: item.recallReason || item.reason || '',
      lotNumbers: extractFdaLotNumbers(item.lotNumbers),
      brand: item.establishment || item.company || '',
      productCategory: 'Meat/Poultry',
      country: 'US' as const,
      publishedAt: item.recallDate || item.date,
      link: item.url,
      imageUrl: undefined
    }));
  } catch (error) {
    console.error('[USDA] Error fetching recalls:', error);
    return [];
  }
}

/**
 * Récupère tous les rappels américains (FDA + USDA combinés)
 */
export async function fetchUsRecalls(): Promise<RecallRecord[]> {
  // Check cache first
  const now = Date.now();
  if (recallsCache && (now - cacheTimestamp < CACHE_TTL)) {
    console.log('[US Recalls] Using cached data');
    return recallsCache;
  }

  console.log('[US Recalls] Fetching fresh data from APIs...');
  const [fdaRecalls, usdaRecalls] = await Promise.allSettled([
    fetchFdaRecalls(),
    fetchUsdaRecalls()
  ]);

  const results: RecallRecord[] = [];

  if (fdaRecalls.status === 'fulfilled') {
    results.push(...fdaRecalls.value);
  }

  if (usdaRecalls.status === 'fulfilled') {
    results.push(...usdaRecalls.value);
  }

  console.log(`[US Recalls] Total: ${results.length} (FDA: ${fdaRecalls.status === 'fulfilled' ? fdaRecalls.value.length : 0}, USDA: ${usdaRecalls.status === 'fulfilled' ? usdaRecalls.value.length : 0})`);

  // Update cache
  recallsCache = results;
  cacheTimestamp = now;

  return results;
}

export async function fetchRecallsByCountry(country: CountryCode) {
  // Only US recalls are supported (FDA + USDA)
  return fetchUsRecalls();
}

export async function fetchAllRecalls(): Promise<RecallRecord[]> {
  // Only US recalls are supported (FDA + USDA)
  return fetchUsRecalls();
}
