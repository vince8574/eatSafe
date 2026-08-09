/**
 * fdaPressDirect — récupération des communiqués de rappel FDA DEPUIS L'APPAREIL.
 *
 * Pourquoi côté client : fda.gov (Akamai) bloque les IP DATACENTER. Mesuré le
 * 2026-08-07 depuis Google Cloud → 401 systématique, quel que soit le profil TLS
 * (15 profils testés passent en 200 depuis une IP résidentielle, aucun depuis
 * GCP) ; le repli Google News renvoie 503 et Wayback n'a archivé que la page de
 * blocage. Un téléphone, lui, a une IP mobile/résidentielle ordinaire : il peut
 * lire le flux ET les pages d'articles — donc extraire les dates
 * « Best if Used By », ce que le serveur ne peut plus faire.
 *
 * Ce module renvoie la MÊME forme d'items que la Cloud Function `fdaPress`, si
 * bien qu'apiService peut consommer l'un ou l'autre sans distinction.
 */

const FDA_RSS_URL =
  'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml';

export type PressItem = {
  title: string;
  description?: string;
  link?: string;
  pubDate?: string;
  articleUrl?: string;
  codeInfo?: string;
};

// Le flux bouge lentement ; on évite de le retélécharger à chaque scan.
const FEED_TTL_MS = 30 * 60 * 1000;
// Enrichissement (lecture des pages d'articles) : borné pour ne jamais retarder
// un scan. Les pages sont lues EN PARALLÈLE — en séquentiel, 6 pages à 7 s de
// timeout épuisaient le budget avant la moitié du flux, et un rappel réel
// (Peter Rabbit, 20e item) n'était jamais enrichi : ni lot, ni date, donc
// invisible pour l'app. Un flux compte ~20 items dont une douzaine
// d'alimentaires : on les couvre tous, par vagues.
const MAX_ENRICH_ITEMS = 14;
const ENRICH_CONCURRENCY = 5;
const ENRICH_BUDGET_MS = 12000;
const FEED_TIMEOUT_MS = 12000;
const ARTICLE_TIMEOUT_MS = 7000;

let feedCache: { ts: number; items: PressItem[] } | null = null;
// Cache par article : une page lue une fois n'est pas relue (TTL long si succès).
const articleCache = new Map<string, { ts: number; codeInfo?: string; ok: boolean }>();
const ARTICLE_TTL_OK_MS = 24 * 60 * 60 * 1000;
const ARTICLE_TTL_FAIL_MS = 60 * 60 * 1000;

function fetchWithTimeout(url: string, timeoutMs: number, headers?: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal, headers }).finally(() => clearTimeout(timer));
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#8217;/gi, '’')
    .replace(/&#8211;/gi, '–');
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    // Retirer une balise laisse une espace parasite avant la ponctuation
    // ("Cyclospora ." pour "<b>Cyclospora</b>.") — visible par l'utilisateur.
    .replace(/\s+([.,;:!?%)\]])/g, '$1')
    .replace(/([(\[])\s+/g, '$1')
    .trim();
}

function tag(block: string, name: string): string {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(block);
  return m ? decodeEntities(m[1]).trim() : '';
}

/** RSS FDA → items. Parsing par expressions régulières : pas de parseur XML en RN. */
export function parsePressRss(xml: string): PressItem[] {
  const items: PressItem[] = [];
  const blocks = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const title = stripTags(tag(block, 'title'));
    if (!title) continue;
    const link = tag(block, 'link');
    items.push({
      title,
      description: stripTags(tag(block, 'description')).slice(0, 500) || undefined,
      // Normalisé en https dès le parsing : le lien sert à la fois à lire
      // l'article ET à être ouvert par l'utilisateur.
      link: link ? toHttps(link) : undefined,
      pubDate: tag(block, 'pubDate') || undefined
    });
  }
  return items;
}

/**
 * Extrait de la page d'un communiqué le texte d'identification : lignes du
 * tableau (marque | description | dates) et/ou plage "Best if Used By".
 * Port de la logique serveur `_extract_code_info`.
 */
// Libellés de date d'identification. « Best-Before-Date (BBD) » manquait : le
// rappel Peter Rabbit (identifié UNIQUEMENT par ses dates) ne produisait donc
// aucun codeInfo, et restait invisible pour l'app.
const DATE_LABEL = /best[\s-]*(?:if\s*used\s*)?(?:by|before)[\s-]*(?:date)?|use[\s-]*by|sell[\s-]*by|\bBBD\b/i;
// Un vrai INTERVALLE ("du X au Y"), par opposition à une LISTE de dates
// distinctes. La distinction est critique : résumer « 19/01, 20/01, 17/03 » en
// « 19/01 → 17/03 » ferait déclarer rappelé un produit du 15/02 qui ne l'est pas.
const RANGE_MARKER = /\d\s*(?:-|–|—|through|thru|\bto\b)\s*\d/i;

export function extractCodeInfo(html: string): string | undefined {
  const body = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const lines: string[] = [];

  const rows = body.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const tr of rows) {
    const cells = (tr.match(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/gi) || [])
      .map((c) => stripTags(c))
      .filter(Boolean);
    if (!cells.length) continue;
    const line = cells.join(' | ');
    if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line) || DATE_LABEL.test(line) || /\blots?\b/i.test(line)) {
      lines.push(line);
    }
  }

  const text = stripTags(body);

  // Résumé des dates d'identification. On ne regarde QUE les fenêtres qui
  // suivent un libellé de date : agréger toutes les dates de la page produisait
  // des intervalles absurdes (Peter Rabbit : la période de VENTE, 03/2026, se
  // retrouvait fusionnée avec les dates limites de 2027 → un intervalle de 14
  // mois qui aurait déclaré rappelés des produits qui ne le sont pas).
  //
  // Et une LISTE de dates distinctes reste une liste : la réduire à min→max
  // aurait le même effet.
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  const parseUs = (s: string): Date | null => {
    const [mm, dd, yy] = s.split('/').map(Number);
    const dt = new Date(yy, mm - 1, dd);
    return isNaN(dt.getTime()) ? null : dt;
  };

  let summary = '';
  const labelled: { dates: Date[]; isRange: boolean }[] = [];
  for (const m of text.matchAll(new RegExp(DATE_LABEL.source, 'gi'))) {
    const window = text.slice(m.index, m.index + 200);
    const found = (window.match(/\d{1,2}\/\d{1,2}\/\d{4}/g) || [])
      .map(parseUs)
      .filter((d): d is Date => d !== null);
    if (found.length) labelled.push({ dates: found, isRange: RANGE_MARKER.test(window) });
  }
  if (labelled.length) {
    const parts: string[] = [];
    for (const group of labelled) {
      if (group.isRange && group.dates.length >= 2) {
        const lo = new Date(Math.min(...group.dates.map((d) => d.getTime())));
        const hi = new Date(Math.max(...group.dates.map((d) => d.getTime())));
        parts.push(`${fmt(lo)} - ${fmt(hi)}`);
      } else {
        parts.push(group.dates.map(fmt).join(', '));
      }
    }
    const uniq = Array.from(new Set(parts.filter(Boolean)));
    if (uniq.length) summary = `Best if Used By ${uniq.join(', ')}`;
  }

  // Pas de tableau ? L'identification est souvent en PROSE ("Lot 12345, Best By…").
  if (!lines.length) {
    for (const sentence of text.split(/(?<=[.;])\s/)) {
      // 500 et non 300 : la phrase d'identification est souvent longue (Peter
      // Rabbit énumère code-barres, numéro de ligne ET six dates en une phrase),
      // et la couper revenait à perdre le seul identifiant du produit.
      if (sentence.length > 500) continue;
      if ((/\b(lots?|batch|exp\.? date|upc)\b/i.test(sentence) || DATE_LABEL.test(sentence)) && /\d/.test(sentence)) {
        lines.push(sentence.trim());
      }
      if (lines.length >= 6) break;
    }
  }

  const out = [summary, ...lines].filter(Boolean).join(' — ').trim();
  return out ? out.slice(0, 600) : undefined;
}

/**
 * Les <link> du flux FDA sont en http:// — bloqués en clair sur mobile (ATS côté
 * iOS, cleartext désactivé côté Android). Sans cette promotion, chaque lecture
 * d'article échouait silencieusement : le flux remontait bien, mais 0 codeInfo,
 * donc aucune date "Best if Used By" (constaté sur appareil, 20 items / 0 date).
 */
function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}

/** Un communiqué susceptible de porter des dates d'identification alimentaires. */
export function looksFoodRelated(item: PressItem): boolean {
  const hay = `${item.title} ${item.description ?? ''}`;
  // ATTENTION aux limites de mot : ces motifs sont des RADICAUX, donc pas de \b
  // FINAL. Avec « \brecall\b », « Recalls » et « recalling » ne matchaient pas —
  // c'est ce qui rendait invisible le rappel Peter Rabbit (« PT Organics Limited
  // RecallS … Due to … Soft Plastic », aucun agent pathogène nommé) : il n'était
  // même pas mis en file de lecture. Symétriquement « \bvial\b » laissait passer
  // « Vials », donc des médicaments.

  // Écarte les rappels médicaments/dispositifs, majoritaires dans ce flux.
  if (
    /\b(tablet|capsule|injection|vial|syringe|catheter|infusion|drug|pharmac|sterile|device|needle|obturator|breathing circuit|intraosseous|imaging|canine|feline|veterinar)/i.test(
      hay
    )
  ) {
    return false;
  }
  // Ce qui reste dans ce flux est alimentaire. On accepte largement : un rappel
  // pour corps étranger (plastique, verre, métal) ne nomme aucun pathogène.
  return /\b(recall|withdraw|allerg|undeclared|mislabel|listeria|salmonella|e\.? ?coli|cyclospora|botulism|contamin|foreign object|plastic|glass|metal)/i.test(
    hay
  );
}

/**
 * Récupère le flux FDA directement depuis l'appareil, puis enrichit les
 * communiqués alimentaires les plus récents avec leurs dates d'identification.
 * Lève une erreur si le flux est inaccessible → l'appelant bascule sur le proxy.
 */
export async function fetchFdaPressDirect(): Promise<PressItem[]> {
  const now = Date.now();
  if (feedCache && now - feedCache.ts < FEED_TTL_MS) return feedCache.items;

  const res = await fetchWithTimeout(FDA_RSS_URL, FEED_TIMEOUT_MS, {
    Accept: 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8'
  });
  if (!res.ok) throw new Error(`FDA RSS status ${res.status}`);
  const xml = await res.text();
  if (!xml.trimStart().startsWith('<?xml')) throw new Error('FDA RSS: not XML (blocked?)');

  const items = parsePressRss(xml);
  if (!items.length) throw new Error('FDA RSS: 0 items');

  // Enrichissement borné : seulement les communiqués alimentaires.
  const deadline = Date.now() + ENRICH_BUDGET_MS;
  const toFetch: PressItem[] = [];
  for (const item of items) {
    if (!item.link || !looksFoodRelated(item)) continue;
    const articleUrl = toHttps(item.link);
    item.articleUrl = articleUrl;

    // Une page déjà en cache ne consomme ni budget ni place : servie hors quota.
    const cached = articleCache.get(articleUrl);
    if (cached && Date.now() - cached.ts < (cached.ok ? ARTICLE_TTL_OK_MS : ARTICLE_TTL_FAIL_MS)) {
      if (cached.codeInfo) item.codeInfo = cached.codeInfo;
      continue;
    }
    if (toFetch.length < MAX_ENRICH_ITEMS) toFetch.push(item);
  }

  const readArticle = async (item: PressItem) => {
    const articleUrl = item.articleUrl!;
    try {
      const page = await fetchWithTimeout(articleUrl, ARTICLE_TIMEOUT_MS);
      if (!page.ok) throw new Error(String(page.status));
      const codeInfo = extractCodeInfo(await page.text());
      if (codeInfo) item.codeInfo = codeInfo;
      articleCache.set(articleUrl, { ts: Date.now(), codeInfo, ok: true });
    } catch {
      articleCache.set(articleUrl, { ts: Date.now(), ok: false });
    }
  };

  for (let i = 0; i < toFetch.length; i += ENRICH_CONCURRENCY) {
    if (Date.now() >= deadline) {
      console.warn(`[FDA Press direct] budget de temps épuisé, ${toFetch.length - i} article(s) non lus`);
      break;
    }
    await Promise.all(toFetch.slice(i, i + ENRICH_CONCURRENCY).map(readArticle));
  }

  feedCache = { ts: Date.now(), items };
  console.log(
    `[FDA Press direct] ${items.length} items, ${items.filter((i) => i.codeInfo).length} with codeInfo`
  );
  return items;
}
