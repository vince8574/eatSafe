import { RecallRecord, CountryCode, ApiError } from '../types';

type RecallResponse = {
  results: RecallRecord[];
};

const FRANCE_ENDPOINT =
  'https://data.economie.gouv.fr/api/records/1.0/search/?dataset=rappelconso0&rows=50&sort=date_de_publication';

const FDA_ENDPOINT = 'https://api.fda.gov/food/enforcement.json?limit=50';
const USDA_ENDPOINT = 'https://www.fsis.usda.gov/fsis/api/recall';

function extractLotNumbers(identificationText: string | undefined): string[] {
  if (!identificationText) return [];

  // Split by common separators and extract potential lot numbers
  const parts = identificationText.split(/[\n,;]/);
  const lotNumbers: string[] = [];

  // Add the full identification text as one potential lot match
  lotNumbers.push(identificationText);

  // Also add individual parts
  parts.forEach(part => {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      lotNumbers.push(trimmed);
    }
  });

  return lotNumbers;
}

export async function fetchFranceRecalls(): Promise<RecallRecord[]> {
  const response = await fetch(FRANCE_ENDPOINT);

  if (!response.ok) {
    const err: ApiError = {
      status: response.status,
      message: 'Impossible de récupérer les rappels RappelConso.'
    };
    throw err;
  }

  const data = await response.json();

  return (data.records ?? []).map((record: any) => ({
    id: record.recordid,
    title: record.fields?.noms_des_modeles_ou_references || record.fields?.libelle || 'Produit rappelé',
    description: record.fields?.motif_du_rappel,
    lotNumbers: extractLotNumbers(record.fields?.identification_des_produits),
    brand: record.fields?.nom_de_la_marque_du_produit,
    productCategory: record.fields?.categorie_de_produit,
    country: 'FR' as const,
    publishedAt: record.fields?.date_de_publication,
    link: record.fields?.lien_vers_la_fiche_rappel,
    imageUrl: record.fields?.liens_vers_les_images?.[0] || undefined
  }));
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

  return (data.results ?? []).map((item: any) => ({
    id: item.recall_number,
    title: item.product_description,
    description: item.reason_for_recall,
    lotNumbers: item.code_info ? item.code_info.split(',').map((lot: string) => lot.trim()) : [],
    brand: item.recalling_firm,
    productCategory: item.product_description,
    country: 'US' as const,
    publishedAt: item.report_date,
    link: item.more_details,
    imageUrl: undefined
  }));
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
      lotNumbers: item.lotNumbers ? item.lotNumbers.split(',').map((lot: string) => lot.trim()) : [],
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
  switch (country) {
    case 'FR':
      return fetchFranceRecalls();
    case 'US':
      return fetchUsRecalls();
    case 'CH':
      // Placeholder: no official API, return empty array.
      return [];
    default:
      return [];
  }
}

export async function fetchAllRecalls(): Promise<RecallRecord[]> {
  const [fr, us] = await Promise.allSettled([fetchFranceRecalls(), fetchUsRecalls()]);

  const results: RecallRecord[] = [];

  if (fr.status === 'fulfilled') {
    results.push(...fr.value);
  }

  if (us.status === 'fulfilled') {
    results.push(...us.value);
  }

  return results;
}
