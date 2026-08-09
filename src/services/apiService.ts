import { RecallRecord, CountryCode, ApiError } from '../types';

type RecallResponse = {
  results: RecallRecord[];
};

const FDA_ENDPOINT = 'https://api.fda.gov/food/enforcement.json?limit=1000&sort=report_date:desc';
// USDA/FSIS (www.fsis.usda.gov/.../api/recall/v/1) sits behind Akamai bot-manager,
// which returns 403 "Access Denied" to any client whose TLS fingerprint (JA3) is
// not a real browser — plain fetch / Android OkHttp / .NET all fail, regardless
// of the User-Agent. So we go through a Cloud Function proxy (Python + curl_cffi
// with a Safari-iOS TLS handshake) that Akamai lets through, with a 30 min cache.
// This makes USDA recalls work reliably on EVERY device (incl. Android).
const USDA_ENDPOINT = 'https://us-central1-eatsok-6d19f.cloudfunctions.net/usdaRecalls';
const FDA_PRESS_ENDPOINT = 'https://us-central1-eatsok-6d19f.cloudfunctions.net/fdaPress';
const USDA_HEADERS = {
  Accept: 'application/json'
};

// Cache for recalls data (5 minutes TTL)
let recallsCache: RecallRecord[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Normalize a lot number for tolerant comparison.
 * Strips explicit prefixes (LOT/BATCH/CODE/L), all separators (spaces, dashes,
 * dots, slashes, colons, underscores) and uppercases.
 *
 * Examples:
 *   "Lot: 12345"   -> "12345"
 *   "Lot #12345"   -> "12345"
 *   "12345-AB"     -> "12345AB"
 *   "12345 AB"     -> "12345AB"
 *   "L=12345"      -> "12345"
 *   "BATCH 12345A" -> "12345A"
 */
export function normalizeLotNumber(lot: string | undefined | null): string {
  if (!lot) return '';
  let s = String(lot).toUpperCase().trim();
  // Strip explicit lot/batch/code prefixes followed by optional separator
  s = s.replace(/^(LOT|LOTS|BATCH|CODE|ITEM\s*CODE|PRODUCT\s*CODE|L)\s*[:#=.\s-]*\s*/i, '');
  // Remove all separator characters (spaces, dashes, underscores, dots, slashes, colons)
  s = s.replace(/[\s\-_/.:]+/g, '');
  return s;
}

/**
 * Extrait les numéros de lot du champ code_info de la FDA
 * Gère des formats comme "Lot: 58041", "Lot #12345", "Lots 12255, 22265",
 * "Batch 12345", "Code: 12345", "L#12345", "L: 12345", "L=12345", etc.
 */
// Mots qui, dans un code_info, marquent la FIN de la liste des lots et le début
// d'autre chose (date, UPC, poids…). Sans cette coupe, "LOT: 60D0924 BEST BEFORE:
// 4/2027" produisait le faux lot "60D0924 BEST BEFORE" : le match EXACT échouait
// alors, et le repli partiel (≥8 caractères) ne rattrapait pas un lot de 7 →
// rappel réel jamais détecté (cas Amy's Kitchen, vérifié sur données live).
const LOT_TAIL_KEYWORDS =
  /\b(?:BEST|BEFORE|EXP(?:IRES?|IRATION)?|USE|SELL|BY|DATE[SD]?|UPC|SKU|NET|WT|MFG|MANUFACTURED|PACKED|PRODUCED|UNTIL|THRU|THROUGH|AND|OR|WITH|ITEM|CASE|SIZE|PRINTED|STAMPED|BEARING|IDENTIFIED|RECALLED|PURCHASED|CONSUME|URGED|SHOULD|MAY|ARE|IS|WAS|WERE|NOT|TO|ON|IN|AT|FROM|THE|THIS|THESE)\b/i;

// Préfixes de libellé capturés avec le lot : « Lot Code LB028ACP04 » donne
// "Code LB028ACP04". Sans ce nettoyage, le lot normalisé devient CODELB028ACP04
// et l'égalité exacte avec la saisie de l'utilisateur échoue.
const LOT_LABEL_PREFIX = /^(?:code[sd]?|number[s]?|no\.?|#|num|batch|codes?\s+no\.?)\s*[:#.\-]?\s*/i;

/** Coupe une capture au 1er mot « non-lot » (ex. "60D0924 BEST BEFORE" → "60D0924"). */
function trimLotTail(raw: string): string {
  const withoutPrefix = raw.replace(LOT_LABEL_PREFIX, '');
  const m = LOT_TAIL_KEYWORDS.exec(withoutPrefix);
  return (m ? withoutPrefix.slice(0, m.index) : withoutPrefix).trim();
}

export function extractFdaLotNumbers(codeInfo: string | undefined): string[] {
  if (!codeInfo) return [];

  const lotNumbers: string[] = [];
  const isDate = (s: string) => /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(s);

  const pushIfValid = (raw: string) => {
    const trimmed = trimLotTail(raw).replace(/[.,;:\s]+$/, '');
    // Un lot contient TOUJOURS au moins un chiffre. Sans ce garde-fou, "No lot
    // codes." produisait le faux lot "codes" — un rappel SANS lot passait alors
    // pour un rappel AVEC lot et entrait dans la comparaison.
    // Une année seule ("…date of January 28, 2027 printed on the jar" → "2027")
    // n'est pas un lot : c'est le reste d'une date coupée.
    if (/^(?:19|20)\d{2}$/.test(trimmed)) return;
    if (trimmed && trimmed.length >= 3 && /\d/.test(trimmed) && !isDate(trimmed)) {
      lotNumbers.push(trimmed);
    }
  };

  // Pattern 1: Explicit "Lot/Lots" keywords — "Lot: XXXXX", "Lot #XXXXX", "Lots 12255, 22265"
  const lotRegex = /\bLots?\s*[:#.=\-\s]*([A-Za-z0-9][A-Za-z0-9\s,\-\/]{0,80})/gi;
  let match;
  while ((match = lotRegex.exec(codeInfo)) !== null) {
    // Split by comma/semicolon/" and " in case of "Lots 12255, 22265, 12415" or "Lot 1 and Lot 2"
    const parts = match[1].split(/[,;]|\s+and\s+/i);
    for (const part of parts) {
      pushIfValid(part);
    }
  }

  // Pattern 2: "Batch", "Code", "Item Code", "Product Code" keywords
  const batchRegex = /\b(?:Batch(?:es)?|Code|Item\s+Code|Product\s+Code)\s*[:#.=\-\s]*([A-Za-z0-9][A-Za-z0-9\-\/\.]{2,24})/gi;
  while ((match = batchRegex.exec(codeInfo)) !== null) {
    pushIfValid(match[1]);
  }

  // Pattern 3: "L#XXX", "L:XXX", "L=XXX" — single-letter L prefix with separator
  const lShortRegex = /\bL\s*[:#=]\s*([A-Za-z0-9][A-Za-z0-9\-\/\.]{2,24})/gi;
  while ((match = lShortRegex.exec(codeInfo)) !== null) {
    pushIfValid(match[1]);
  }

  // Do NOT add full code_info text, dates, UPCs, or generic alphanumeric sequences
  // These cause false positives

  // Remove duplicates after normalization
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const lot of lotNumbers) {
    const key = normalizeLotNumber(lot);
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(lot);
    }
  }
  return unique;
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
      // Texte d'identification brut (dates "Best if Used By", codes…) : seule
      // info exploitable par l'utilisateur quand aucun lot n'est extrait.
      codeInfo: typeof item.code_info === 'string' ? item.code_info.trim() : undefined,
      brand: item.recalling_firm,
      productCategory: item.product_description,
      country: 'US' as const,
      publishedAt: item.report_date,
      link: item.more_details,
      imageUrl: undefined,
      source: 'fda' as const
    };
  });

  console.log(`[FDA] Total recalls fetched: ${results.length}`);
  return results;
}

/**
 * Les descriptions produits FSIS arrivent en HTML avec des entités. On retire les
 * balises et on décode les entités courantes pour que l'extraction de lot voie
 * un texte propre.
 */
function stripHtml(input: string | string[] | undefined | null): string {
  if (!input) return '';
  const raw = Array.isArray(input) ? input.join(' ') : String(input);
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[“”‘’]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Récupère les rappels USDA (viandes et volailles) depuis l'API FSIS.
 * L'API renvoie des champs préfixés `field_*` (et non `item.establishment` etc.).
 * USDA n'a pas de champ "lot" dédié : les codes identifiants se trouvent dans
 * `field_product_items`, d'où on extrait les tokens de type Lot/Batch/Code.
 */
export async function fetchUsdaRecalls(): Promise<RecallRecord[]> {
  try {
    const response = await fetch(USDA_ENDPOINT, { headers: USDA_HEADERS });

    if (!response.ok) {
      console.warn(`[USDA] API returned status ${response.status} (FSIS bloque peut-être la requête)`);
      return [];
    }

    // Garde-fou : si Akamai renvoie une page HTML "Access Denied" en 200,
    // response.json() planterait. On lit le texte et on vérifie que c'est du JSON.
    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      console.warn('[USDA] Réponse non-JSON (probablement bloquée / HTML):', trimmed.slice(0, 80));
      return [];
    }

    const data = JSON.parse(trimmed);
    const arr: any[] = Array.isArray(data) ? data : (data.results ?? data.data ?? []);

    const mapped: RecallRecord[] = arr.map((item: any, index: number) => {
      const establishment = Array.isArray(item.field_establishment)
        ? item.field_establishment.filter(Boolean).join(', ')
        : (item.field_establishment || '');
      const reason = Array.isArray(item.field_recall_reason)
        ? item.field_recall_reason.filter(Boolean).join(', ')
        : (item.field_recall_reason || '');
      const productText = stripHtml(item.field_product_items);
      // USDA descriptions are prose, so the lot regex also grabs phrases
      // ("on the package"). Keep only real codes: contain a digit, no spaces.
      const lotNumbers = extractFdaLotNumbers(productText).filter(
        (l) => /\d/.test(l) && !/\s/.test(l)
      );

      return {
        id: item.field_recall_number_export || item.field_recall_number || item.field_recall_url || `usda-${index}`,
        title: item.field_title || 'Meat/Poultry Recall',
        description: reason || stripHtml(item.field_summary).slice(0, 280),
        lotNumbers,
        // Description brute des produits concernés (dates, formats, codes) :
        // affichée à l'utilisateur quand aucun lot exploitable n'est extrait.
        codeInfo: productText ? productText.slice(0, 600) : undefined,
        brand: establishment,
        productCategory: 'Meat/Poultry',
        country: 'US' as const,
        publishedAt: item.field_recall_date || item.field_last_modified_date || '',
        link: item.field_recall_url,
        imageUrl: undefined,
        source: 'usda' as const
      };
    });

    const withLots = mapped.filter((r) => r.lotNumbers.length > 0).length;
    console.log(`[USDA] Parsed ${mapped.length} recalls (${withLots} avec codes de lot exploitables)`);
    return mapped;
  } catch (error) {
    console.error('[USDA] Error fetching recalls:', error);
    return [];
  }
}

/**
 * Communiqués de presse FDA (flux "Recalls, Market Withdrawals & Safety
 * Alerts", via le proxy Cloud Function fdaPress — fda.gov bloque les clients
 * non-navigateur). Les communiqués paraissent des JOURS avant leur ingestion
 * dans openFDA enforcement (cas réel : Taylor Fresh Foods iceberg/Cyclospora,
 * juil. 2026) et n'ont PAS de numéros de lot structurés → lotNumbers reste
 * VIDE : ces enregistrements n'alimentent QUE le chemin 'warning' ambre
 * (marque + type de produit recoupent), jamais un "RAPPELÉ" rouge.
 */

// Marque extraite du titre du communiqué : texte avant le verbe ("Taylor Fresh
// Foods Recalls Iceberg Lettuce…" → "Taylor Fresh Foods"). Titres sans marque
// en tête ("Voluntary Recall of…") → '' (l'enregistrement ne matchera rien).
export function extractPressBrand(title: string): string {
  const m = title.match(
    /^(.{2,70}?)\s+(?:Recalls?|Issues?|Voluntarily|Initiates?|Expands?|Announces?|Withdraws?|Alerts?)\s/i
  );
  if (!m) return '';
  const brand = m[1].trim().replace(/[,.]$/, '');
  // Préambules sans marque ("Voluntary Recall of…", "Urgent Allergy Alert…").
  if (/^(voluntary|urgent|important|allergy|public|nationwide|update[ds]?)$/i.test(brand)) return '';
  return brand;
}

// Le titre FDA nomme la SOCIÉTÉ qui rappelle, pas la marque en rayon :
//   "Boticelli Foods Recalls Bettergoods Pistachio Nut Butter Because of…"
//   "PT Organics Limited Recalls Select Pumpkin Tree Peter Rabbit Organics…"
// Le consommateur, lui, lit « bettergoods » ou « Peter Rabbit Organics » sur
// l'emballage. On garde donc aussi le segment PRODUIT — entre le verbe et le
// motif — comme alias de marque, sans quoi ces rappels sont introuvables.
export function extractPressProductSegment(title: string): string {
  const m = title.match(
    /\s(?:Recalls?|Issues?|Voluntarily|Initiates?|Expands?|Announces?|Withdraws?|Alerts?)\s+(.{3,140}?)(?:\s+(?:Due to|Because|After|Over|Following|Amid|For Possible|For Undeclared)\b|$)/i
  );
  if (!m) return '';
  return m[1]
    // Mots de liaison qui ne font pas partie d'une marque.
    .replace(/^(?:a\s+|an\s+|the\s+|select\s+|certain\s+|all\s+|one\s+|two\s+|three\s+|specific\s+|voluntary\s+|nationwide\s+|its\s+)+/i, '')
    .replace(/^(?:lots?\s+of\s+|recall\s+of\s+|allerg\w*\s+alert\s+on\s+)+/i, '')
    .trim();
}

export async function fetchFdaPressRecalls(): Promise<RecallRecord[]> {
  // 1) DIRECT depuis l'appareil. fda.gov bloque les IP datacenter (401 depuis
  //    GCP, mesuré) mais pas une IP mobile : le téléphone lit le flux ET les
  //    pages d'articles, donc récupère les dates "Best if Used By" que le proxy
  //    ne peut plus extraire. 2) Repli sur la Cloud Function si ça échoue
  //    (réseau d'entreprise filtrant, changement côté FDA…).
  let items: any[] | null = null;
  try {
    const { fetchFdaPressDirect } = await import('./fdaPressDirect');
    items = await fetchFdaPressDirect();
  } catch (error) {
    console.warn('[FDA Press] direct fetch failed, falling back to proxy:', error);
  }

  if (!items) {
    const response = await fetch(FDA_PRESS_ENDPOINT);
    if (!response.ok) {
      console.warn(`[FDA Press] proxy returned status ${response.status}`);
      return [];
    }
    items = await response.json();
  }
  if (!Array.isArray(items)) return [];

  const results: RecallRecord[] = [];
  for (const item of items) {
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    if (!title) continue;
    const brand = extractPressBrand(title);
    // Id STABLE entre les fetchs (le lien Google News varie) : slug du titre.
    const id =
      'fda-press-' +
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

    const codeInfo = typeof item.codeInfo === 'string' ? item.codeInfo : undefined;
    const productSegment = extractPressProductSegment(title);

    results.push({
      id,
      title,
      description: typeof item.description === 'string' ? item.description : undefined,
      // La PAGE du communiqué porte souvent un vrai numéro de lot en prose
      // ("Lot Code LB028ACP04") : le jeter privait l'app du seul identifiant
      // exact de ces rappels, qui ne pouvaient alors produire qu'un warning
      // ambre. Le matching reste strict (égalité exacte, ou ≥8 car. avec marque).
      lotNumbers: extractFdaLotNumbers(codeInfo),
      // Dates "Best if Used By" / lots extraits de la PAGE du communiqué par le
      // proxy (tableau + prose) : affichés à l'utilisateur pour qu'il vérifie.
      codeInfo,
      brand: brand || undefined,
      brandAliases: productSegment ? [productSegment] : undefined,
      country: 'US' as const,
      publishedAt: typeof item.pubDate === 'string' ? item.pubDate : '',
      // articleUrl = la vraie page fda.gov (le lien du flux peut être une
      // redirection Google News opaque).
      link:
        typeof item.articleUrl === 'string'
          ? item.articleUrl
          : typeof item.link === 'string'
            ? item.link
            : undefined,
      imageUrl: undefined,
      source: 'fda-press' as const
    });
  }

  console.log(`[FDA Press] ${results.length} press releases fetched`);
  return results;
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
  const [fdaRecalls, usdaRecalls, pressRecalls] = await Promise.allSettled([
    fetchFdaRecalls(),
    fetchUsdaRecalls(),
    fetchFdaPressRecalls()
  ]);

  const results: RecallRecord[] = [];

  if (fdaRecalls.status === 'fulfilled') {
    results.push(...fdaRecalls.value);
  }

  if (usdaRecalls.status === 'fulfilled') {
    results.push(...usdaRecalls.value);
  }

  if (pressRecalls.status === 'fulfilled') {
    results.push(...pressRecalls.value);
  }

  console.log(`[US Recalls] Total: ${results.length} (FDA: ${fdaRecalls.status === 'fulfilled' ? fdaRecalls.value.length : 0}, USDA: ${usdaRecalls.status === 'fulfilled' ? usdaRecalls.value.length : 0}, Press: ${pressRecalls.status === 'fulfilled' ? pressRecalls.value.length : 0})`);

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
