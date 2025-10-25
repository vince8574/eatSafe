import { RecallRecord, CountryCode, ApiError } from '../types';

type RecallResponse = {
  results: RecallRecord[];
};

const FRANCE_ENDPOINT =
  'https://data.economie.gouv.fr/api/records/1.0/search/?dataset=rappelconso0&rows=50&sort=date_de_publication';

const USA_ENDPOINT = 'https://api.fda.gov/food/enforcement.json?limit=50';

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
    title: record.fields?.produit || 'Produit rappelé',
    description: record.fields?.motif_rappel,
    lotNumbers: record.fields?.numeros_de_lots ?? [],
    brand: record.fields?.marque || record.fields?.nom_de_produit,
    productCategory: record.fields?.categorie_de_produit,
    country: 'FR' as const,
    publishedAt: record.fields?.date_de_publication,
    link: record.fields?.lien_vers_la_fiche,
    imageUrl: record.fields?.photo1 || undefined
  }));
}

export async function fetchUsRecalls(): Promise<RecallRecord[]> {
  const response = await fetch(USA_ENDPOINT);

  if (!response.ok) {
    const err: ApiError = {
      status: response.status,
      message: "Impossible de récupérer les rappels alimentaires américains."
    };
    throw err;
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
