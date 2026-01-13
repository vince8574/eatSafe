import { RecallRecord, CountryCode, ApiError } from '../types';

type RecallResponse = {
  results: RecallRecord[];
};

const FDA_ENDPOINT = 'https://api.fda.gov/food/enforcement.json?limit=1000&sort=report_date:desc';
const USDA_ENDPOINT = 'https://www.fsis.usda.gov/fsis/api/recall';

/**
 * Extrait les numéros de lot du champ code_info de la FDA
 * Gère des formats comme "Lot: 58041" ou "Lot #12345" ou juste des numéros
 */
function extractFdaLotNumbers(codeInfo: string | undefined): string[] {
  if (!codeInfo) return [];

  const lotNumbers: string[] = [];

  // Add the full text as one potential match
  lotNumbers.push(codeInfo);

  // Pattern 1: "Lot: XXXXX" ou "Lot #XXXXX" ou "LOT XXXXX"
  const lotPatterns = codeInfo.match(/\bLot[:\s#]*([A-Za-z0-9-]+)/gi);
  if (lotPatterns) {
    lotPatterns.forEach(match => {
      // Extract lot number and remove any trailing punctuation
      const lotNum = match.replace(/\bLot[:\s#]*/i, '').replace(/[;:,\.\s]+$/, '').trim();
      if (lotNum) {
        lotNumbers.push(lotNum);
      }
    });
  }

  // Pattern 2: Split by common separators (comma, semicolon, newline, "1)", "2)", etc.)
  const parts = codeInfo.split(/[,;\n]|(?:\d+\))/);
  parts.forEach(part => {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      lotNumbers.push(trimmed);
    }
  });

  // Pattern 3: Extract standalone numbers/codes (alphanumeric sequences of 4+ chars)
  const codes = codeInfo.match(/\b[A-Z0-9]{4,}\b/g);
  if (codes) {
    codes.forEach(code => {
      // Exclude common words like "BEST", "USED", "DATE", etc.
      if (!/^(BEST|USED|DATE|CODE|PROD|INTERNAL|PRODUCT)$/i.test(code)) {
        lotNumbers.push(code);
      }
    });
  }

  // Remove duplicates (case-insensitive)
  const uniqueLots = Array.from(new Set(lotNumbers.map(l => l.toUpperCase())))
    .map(upper => {
      // Find the original case version
      return lotNumbers.find(l => l.toUpperCase() === upper) || upper;
    });

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

    // Log H-0337-2026 specifically for debugging
    if (item.recall_number === 'H-0337-2026') {
      console.log('[FDA] ⭐ Found H-0337-2026!');
      console.log('[FDA] Raw code_info:', item.code_info);
      console.log('[FDA] Extracted lots:', extracted);
      console.log('[FDA] Brand:', item.recalling_firm);
    }

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
