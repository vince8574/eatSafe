/**
 * bestByDate — lecture d'une date "Best if Used By / Use By / Sell By / EXP" à
 * partir d'un texte OCR, et test d'appartenance à la fenêtre de dates d'un rappel.
 *
 * Contexte : beaucoup de produits (frais, marques distributeur type Trader Joe's)
 * n'ont PAS de numéro de lot. Les rappels FDA/USDA les identifient alors par une
 * DATE "Best/Use By" (souvent une plage). Ce module est 100 % pur → testable et
 * partagé par les deux apps (US + FR).
 */

export type ParsedDate = {
  iso: string; // 'YYYY-MM-DD'
  display: string; // 'Aug 3, 2026' / '08/03/2026'
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

const LABEL =
  /\b(?:BEST\s*(?:IF\s*)?(?:USED?|BEFORE)?\s*BY|BEST\s*BEFORE|USE\s*BY|USE\s*BEFORE|SELL\s*BY|EXP(?:IR(?:ES|ATION|Y))?|BB|EXP)\b/i;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Année sur 2 chiffres → 4 chiffres (00-79 → 2000-2079, 80-99 → 1980-1999). */
function fullYear(y: number): number {
  if (y >= 100) return y;
  return y <= 79 ? 2000 + y : 1900 + y;
}

/** Valide un triplet (y,m,d) et renvoie une date ISO, sinon null. */
function makeDate(y: number, m: number, d: number): ParsedDate | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const yr = fullYear(y);
  // Plage plausible pour une date de péremption alimentaire.
  if (yr < 2020 || yr > 2100) return null;
  const dt = new Date(Date.UTC(yr, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null; // ex. 31/02
  const monthName = Object.keys(MONTHS)[m - 1];
  const cap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return { iso: `${yr}-${pad(m)}-${pad(d)}`, display: `${cap} ${d}, ${yr}` };
}

/** Toutes les dates repérables dans un texte (ordre d'apparition). */
function findDates(text: string): { date: ParsedDate; index: number }[] {
  const out: { date: ParsedDate; index: number }[] = [];
  const push = (d: ParsedDate | null, index: number) => {
    if (d) out.push({ date: d, index });
  };

  // 1) Mois en toutes lettres : "AUG 03 2026", "3 AUG 2026", "AUGUST 3, 2026"
  const reMonthName =
    /\b([A-Z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})\b|\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Z]{3,9})\.?,?\s+(\d{2,4})\b/gi;
  for (let m; (m = reMonthName.exec(text)); ) {
    if (m[1]) {
      const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
      if (mo) push(makeDate(+m[3], mo, +m[2]), m.index);
    } else {
      const mo = MONTHS[m[5].slice(0, 3).toLowerCase()];
      if (mo) push(makeDate(+m[6], mo, +m[4]), m.index);
    }
  }

  // 2) ISO : YYYY-MM-DD
  const reIso = /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g;
  for (let m; (m = reIso.exec(text)); ) push(makeDate(+m[1], +m[2], +m[3]), m.index);

  // 3) Numérique séparé : MM/DD/YYYY ou MM/DD/YY (défaut US : mois d'abord)
  const reSep = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/g;
  for (let m; (m = reSep.exec(text)); ) {
    const a = +m[1], b = +m[2], y = +m[3];
    // Ordre US mois/jour ; si le 1er >12 et le 2e ≤12, on inverse (jour/mois).
    let mo = a, d = b;
    if (a > 12 && b <= 12) { mo = b; d = a; }
    push(makeDate(y, mo, d), m.index);
  }

  // 4) Compact 6 chiffres : MMDDYY (défaut US). "080326" → 2026-08-03.
  const reCompact = /\b(\d{6})\b/g;
  for (let m; (m = reCompact.exec(text)); ) {
    const s = m[1];
    const mm = +s.slice(0, 2), dd = +s.slice(2, 4), yy = +s.slice(4, 6);
    push(makeDate(yy, mm, dd), m.index);
  }

  return out;
}

/**
 * Extrait la date Best/Use-By la plus probable d'un texte OCR.
 * Priorité à une date proche d'un libellé ("USE BY", "BEST IF USED BY"…) ;
 * à défaut, la 1re date plausible trouvée. Renvoie null si aucune.
 */
export function extractBestByDate(text: string): ParsedDate | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, ' ').trim();
  const dates = findDates(clean);
  if (dates.length === 0) return null;

  const label = LABEL.exec(clean);
  if (label) {
    // La 1re date qui APPARAÎT APRÈS le libellé (dans une fenêtre raisonnable).
    const after = dates
      .filter((d) => d.index >= label.index && d.index - label.index < 40)
      .sort((a, b) => a.index - b.index);
    if (after.length) return after[0].date;
  }
  // Sinon : la 1re date plausible (dédupliquée par ISO).
  return dates[0].date;
}

// --- Fenêtre de dates d'un rappel ------------------------------------------

/** Parse une date isolée (US) depuis une chaîne courte de rappel. */
function parseOne(s: string): string | null {
  const d = findDates(s.trim());
  return d.length ? d[0].date.iso : null;
}

/**
 * Le `codeInfo` d'un rappel FDA/USDA décrit souvent une PLAGE de dates
 * ("Best if Used By 7/16/2026 - 8/3/2026", "Best By codes range: 063026 through
 * 093026", "Use by 04/28/2025"). Renvoie true si `dateIso` tombe dans la plage
 * (ou égale la date unique) présente dans `codeInfo`.
 */
export function bestByInRecallWindow(dateIso: string, codeInfo?: string): boolean {
  if (!dateIso || !codeInfo) return false;
  const target = Date.parse(dateIso + 'T00:00:00Z');
  if (isNaN(target)) return false;

  // Plage explicite : "<date> [-–—/ to / through / thru] <date>"
  const range =
    /(\d[\d/.\-]{4,}|\b[A-Z]{3,9}\.?\s+\d{1,2},?\s+\d{2,4})\s*(?:-|–|—|to|through|thru|\/)\s*(\d[\d/.\-]{4,}|\b[A-Z]{3,9}\.?\s+\d{1,2},?\s+\d{2,4})/i.exec(
      codeInfo
    );
  if (range) {
    const a = parseOne(range[1]);
    const b = parseOne(range[2]);
    if (a && b) {
      const lo = Math.min(Date.parse(a + 'T00:00:00Z'), Date.parse(b + 'T00:00:00Z'));
      const hi = Math.max(Date.parse(a + 'T00:00:00Z'), Date.parse(b + 'T00:00:00Z'));
      return target >= lo && target <= hi;
    }
  }

  // Sinon : toute date isolée du codeInfo qui égale la cible.
  return findDates(codeInfo).some((d) => d.date.iso === dateIso);
}
