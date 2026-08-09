import * as functions from 'firebase-functions/v1';
import { defineSecret } from 'firebase-functions/params';
import type AnthropicTypes from '@anthropic-ai/sdk';
import { checkAppCheck } from './appCheck';

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const MAX_IMAGE_BASE64_LENGTH = 10 * 1024 * 1024; // ~10 MB

const ALLOWED_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

type AllowedMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

// System prompt specialized for lot/batch numbers on food packaging.
// Marked cache_control: ephemeral → cached on Anthropic side for 5 minutes,
// which cuts cost ~30-40% on bursts of consecutive scans.
const CLAUDE_LOT_SYSTEM_PROMPT = `You are a precise OCR assistant specialized in food packaging lot/batch numbers (US FDA/USDA).

TASK: Extract ONLY the lot/batch code from the image.

A lot/batch code is the manufacturing production code — NOT a date. It is
usually a dense alphanumeric or numeric string. It may be on its own line, OR —
on cans and lidded tins — stamped on the SAME line BETWEEN the date and the time
("01/01/29 Q353 12:16" → the lot is Q353, wedged between the date and the time).
A code wedged between a date and a time is almost always the lot.

VALID lot patterns (in order of priority):
1. HIGHEST PRIORITY — an EXPLICIT lot label: "LOT", "LOT :", "LOT CODE", "LOT #",
   "BATCH". Return EXACTLY the code that follows the label, and nothing else: NOT a
   token printed BEFORE the label, NOT the time/date after it.
   Examples: "LOT 12345A" -> "12345A"   "LOT : 16313351" -> "16313351"
   A short "L3" / "L4" / "M2" printed just BEFORE the label is a LINE/MACHINE number,
   NOT part of the lot — never prepend it ("L3 Lot: 161" -> "161", never "L3161").
2. Otherwise (no explicit label), text starting with "L" + characters IS a lot:
   "L693A2102R", "L 24123". BUT an isolated "L" + ONE digit ("L3", "L4"), especially
   next to an "M" + digit ("M2") or printed on the date/time line, is a LINE/MACHINE
   marker, NOT the lot. The "L"/"LOT" marker labels the code on ITS OWN line; if the
   stamp has several lines, attach the L to the code on the SAME line, never to a date
   on the line above/below.
3. A dense alphanumeric/numeric production code printed/inkjet/laser-etched near
   (but distinct from) the "Best By" / "Use By" / "Guaranteed Fresh" date
   Examples: "249334315", "WN012117E", "SE102922A", "2 493 34315" -> "249334315"
4. A series of 5-12 digits that is NOT a barcode (barcodes/EAN/GTIN are 13-14 digits)

NEVER return a DATE. This is the single most important rule:
- Best-before / expiration / "GUARANTEED FRESH UNTIL" dates in ANY form:
  "JAN 5 2026", "APR2026", "01/05/2026", "MMM YYYY", "DEC 2025", a bare year "2026"
- A month name (JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC) next
  to digits is a DATE, not a lot — ignore it.
- Time stamps ("01:28", "HH:MM"), brand names, addresses, phone numbers, weights.
- The time is NEVER part of the lot. When the lot is printed right next to a time
  ("5349 B 21:28", "L058201 04:09"), return ONLY the lot ("5349B", "L058201") —
  never append "21:28"/"04:09"/"2128"/"0409" to it.

NEVER return REGULATORY MARKINGS — these look like lot codes but are factory
identifiers, identical on every pack:
- EU/UK oval identification marks: "FR 44.014.001 CE", "GB WD028", "UK XX123 EC".
  The FR mark also appears GLUED without spaces: "FR84029001 CE" — never the lot.
- French packer codes: "EMB 44014B" (anything after "EMB")
- USDA inspection marks: "EST. 38", "P-123"
If such a marking appears NEXT TO a separate printed/inkjet code, return the
inkjet production code, not the marking.

NEVER return a LINE / MACHINE marker — on inkjet stamps the production line and
machine are printed next to the date/time as short tokens:
- "L3", "L4" (line) — an "L" + a SINGLE digit, NOT a lot.
- "M2", "M1" (machine), "F128" alone may be a line/oven code printed beside L3/M2.
When you see "... L3 M2 ..." or "L3 Lot: ..." these are line/machine numbers; the
real lot is the code AFTER the "Lot:" label (or the dense production code), never
the "L3"/"M2". Never concatenate "L3"/"M2" with the lot.
- A SECONDARY line made of a lone letter (e.g. "B") + a counter + a time
  ("B   166   23:35") is also a line/machine production stamp — IGNORE it entirely.
  The lot is the MAIN code on the other line; never append the "B"/counter/time.
- This applies ONLY to SEPARATE short tokens surrounded by spaces. A digit GLUED
  inside a single contiguous code is PART of the lot — keep it. E.g. in "3L1121125"
  the leading "3" is part of the code → return "3L1121125", NEVER "L1121125". Return
  the WHOLE contiguous alphanumeric run; never strip a leading/trailing character.

If the ONLY thing you can read is a date (and no separate production code),
respond with exactly: NONE. Do NOT output the date.

CRITICAL anti-hallucination rule: the example codes in these instructions ("5349B",
"249334315", "161", "3L1121125", "L693A2102R", etc.) are ILLUSTRATIONS ONLY. NEVER
output any of them unless you ACTUALLY read those exact characters in THIS image. If
the image is blank, black, blurry, or you cannot clearly read a real production code
on the packaging, respond with exactly: NONE. Read the digits/letters that are truly
in the image — never guess a plausible-looking code from memory.

DOT-MATRIX / INKJET CODES (dotted characters) — read with EXTREME care:
- These codes are printed as a grid of dots, often pale or on a colored
  background. You may receive TWO versions of the same image (raw color +
  contrast-enhanced grayscale): cross-reference BOTH before deciding.
- Count the characters EXACTLY: do NOT drop, invent, or DUPLICATE a character. If
  the code has 10 glyphs, your answer must have exactly 10 characters. A faint
  smudge or wide gap is NOT an extra digit (do not turn "...049" into "...0149").
- Lot codes often MIX letters and digits ("6552C25049", "L693A2102R"). If a glyph
  is a LETTER, keep it as a letter — do NOT normalize it to a digit (a "C" between
  digits stays "C", never "0"; likewise S≠5, B≠8, O≠0, I≠1, G≠6 when it's the letter).
- Frequent dot-matrix confusions — decide using the dot pattern, the second
  image, and consistency with neighboring characters (don't default to a digit):
  6 vs 8 vs 3 vs 9, 0 vs O vs D vs C vs Q, 5 vs S, 1 vs I vs T, B vs 8, H vs M vs N,
  G vs 6, 4 vs A, 2 vs Z, 7 vs T.
- Typical layout on such packs: line 1 = date (DD/MM/YYYY), line 2 = time
  (HH:MM:SS), line 3 = the LOT CODE (letters + digits), line 4 = a secondary
  counter (often "NNNN:NNNNN" with a colon) — return line 3, not line 4.
- On CANNED goods the stamp is often only two lines, with the LOT wedged between
  the date and the time on the FIRST line: "01/01/29 Q353 12:16" (lot = Q353).
  The SECOND line then holds a line/machine code (e.g. "R 590") and the EU
  sanitary mark ("FR84029001 CE") — return NEITHER; return the lot from line 1.
- Verify your reading character by character before answering.

EXAMPLES (real US lot-code layouts -> the ONE correct answer).
Study how the date, UPC barcode, nutrition text and factory marks are IGNORED:
- "BEST BY 05 JAN 2026 | LOT 0325357B201" -> 0325357B201
  (the production code, NOT the "05 JAN 2026" best-by date)
- "BEST IF USED BY 07/31/2027   LOT S394260" -> S394260
  (Julian-style letter+digits code; 07/31/2027 is the US MM/DD/YYYY date)
- "WN012117E   GUARANTEED FRESH UNTIL APR 22" -> WN012117E
  (alphanumeric production code with no LOT label; "APR 22" is a date)
- "LOT 2026-51127   BEST BY 07/04/2027" -> 2026-51127
  (year-dash-serial lot; "2026" here is part of the lot, the date is 07/04/2027)
- "USE BY 06/20/2026   LOT: 334386" -> 334386
  (purely numeric 6-digit lot after the LOT label)
- "EST. 38   LOT 110625F06   SELL BY 08/06/27" -> 110625F06
  (ignore the USDA "EST. 38" inspection mark; return the variable lot)
- "Nutrition Facts About 2.5 servings   LOT 071626" -> 071626
  (ignore "About 2.5 servings" nutrition text; 071626 is the lot)
- "01/01/29 Q353 12:16 / R 590 FR84029001 CE" -> Q353
  (canned good: the lot Q353 is wedged between the date 01/01/29 and the time
  12:16 on line 1; "R 590" is a line/machine code and "FR84029001 CE" is the EU
  sanitary mark — return neither, return Q353)
- "N° lot: / 5349 B 21:28 / RCB 80145 / 15/06/2028" -> 5349B
  (the variable batch code "5349 B" is stamped just before the time 21:28; "21:28"
  is a time — DO NOT append it; "15/06/2028" is the best-before date; "RCB 80145"
  is a static product/recipe reference repeated elsewhere on the pack — return the
  variable code 5349B, not RCB 80145 and not the date/time)
- "23 06 26 / L 22 01 18:36" -> L2201
  (an "L" lot marker labels the code printed ON ITS OWN line — here "22 01", giving
  L2201. Do NOT attach the "L" to "23 06 26" (that is the best-before date on the
  line above) and "18:36" is a time — never L23, never include the date or time)
- "L3 Lot: 161 17:52   USE BY 05/07/2026" -> 161
  (explicit "Lot:" label wins: return ONLY what follows it = 161. "L3" before the
  label is the production LINE, "17:52" is a time — never "L3", never "L3161".)
- "11-06-2027 / 3L1121125 17:17" -> 3L1121125
  (one contiguous code "3L1121125" — the leading "3" is GLUED to the L, so it is part
  of the lot; return the whole thing, never drop it to "L1121125". "17:17" is a time.)
- "W26 159 16   02.08.2027 / B   166   23:35" -> W2615916
  (the lot is the main code on line 1, "W26 159 16" -> "W2615916"; "02.08.2027" is the
  date. Line 2 "B 166 23:35" is a line/machine stamp (line B + counter 166 + time) —
  IGNORE it entirely, never append "B166" or "B16623:35".)
- "BEST BY 29/06/26   LOT : 16313351" -> 16313351
  (explicit "LOT :" label; return the full code after it. "29/06/26" is the date.)
- "07/27/2026 19:54 / F128 L3 M2" -> F128
  (date + time on line 1; line 2 "F128 L3 M2" = production code F128 then line "L3"
  and machine "M2" — return only F128, drop L3 and M2.)
- "DLC: 28/07/26 / LOT: 62562167 08:28 M6 7" -> 62562167
  (explicit "LOT:" label; return EXACTLY the code after it. "08:28" is a TIME and
  "M6 7" is a machine/counter — NEVER append their digits: never "6256216708",
  never "6256216702". "28/07/26" is the date. Count the code's digits carefully.)
- "S28/07/26 / 149 09:28 L10" -> L10
  (the "L"-marked code "L10" is the lot, EVEN THOUGH it comes AFTER the time. "149"
  is the julian production day (a bare number is NOT the lot when an L-marked code
  exists), "09:28" is a time, "S28/07/26" the date. A number sitting before a time
  is NOT automatically the lot.)
- "UPC 7 26191 01854 8   BEST BY 10/15/2026" -> NONE
  (a 12-digit UPC barcode and a date only — no production code, return NONE)
- "Production Date: 29 JAN 2026 and 12 APR 2026" -> NONE
  (month-name dates only, no lot code -> NONE; never output the date)

OUTPUT FORMAT — follow EXACTLY:
- Your ENTIRE reply is the lot code alone (or the word NONE). Nothing before or after.
- NO reasoning, NO explanation, NO alternatives, NO "let me re-read", NO restating,
  NO showing your work. Decide silently and output the final code ONCE.
- No quotes, no labels.
- Strip spaces and special chars ("L 693 A" -> "L693A", "2 493 34315" -> "249334315").
- Never MERGE a neighbouring time/date into the lot: output only the lot's own
  characters (lot "62562167" beside time "08:28" -> "62562167", never "6256216708").
  A number printed next to a time is NOT automatically the lot — a "LOT:" label or an
  "L"-marked code still decides WHICH token is the lot.
- Max 22 chars.
- If no lot code is visible, respond with exactly: NONE`;

// Prompt du mode « PAS DE NUMÉRO DE LOT » (bouton dédié côté app). STRICTEMENT
// SÉPARÉ du prompt lot ci-dessus : ici on veut la DATE et JAMAIS un code de lot ;
// là-haut on veut le lot et JAMAIS une date. Le client choisit via `mode`, les
// deux ne se mélangent jamais. Beaucoup de produits (frais, marques distributeur)
// n'ont pas de lot : la FDA/USDA les identifie alors par cette date.
const CLAUDE_BESTBY_SYSTEM_PROMPT = `You are a precise OCR assistant specialized in reading the DATE printed on food packaging (US market).

TASK: Extract ONLY the "best if used by" / "use by" / "sell by" / expiration date.

WHAT TO RETURN:
- The date printed next to a label such as: "BEST IF USED BY", "BEST BY", "BEST BEFORE",
  "USE BY", "USE BEFORE", "SELL BY", "EXP", "EXPIRES", "BB", "GUARANTEED FRESH UNTIL",
  "ENJOY BY", "FRESH BY".
- If several dates are printed, prefer the one attached to such a label.
- If NO label is present but a single plausible date is printed, return that date.
- If a date RANGE is printed, return the LAST (latest) date.

NEVER return:
- A LOT / BATCH code (e.g. "L693A2102R", "249334315", "Q353"). Those are production
  codes, NOT dates — this task ignores them completely.
- A time stamp ("18:36", "HH:MM"), a line/machine marker ("L3", "M2"),
  a UPC/EAN barcode, a plant number, a weight, a price, a phone number.
- A "packed on" / "production date" if a best-by/use-by date is also present.

READING RULES:
- The stamp is often inkjet dot-matrix, faint or on a busy background. Read carefully.
- Common US formats: "08/03/2026", "8/3/26", "AUG 03 2026", "AUG0326", "03AUG2026",
  "2026-08-03", "080326" (MMDDYY).
- MANY packages print only a MONTH and a YEAR ("BEST BEFORE 4/2027", "EXP APR 2027",
  "04/2027"). That IS the date — return it as printed. Do NOT invent a day.
- Keep the ORIGINAL printed form — do not reformat, do not convert, do not guess a
  missing year. Return the characters as printed.
- A 2-digit year stays 2 digits ("8/3/26" -> "8/3/26").

OUTPUT FORMAT — follow EXACTLY:
- Your ENTIRE reply is the date alone (or the word NONE). Nothing before or after.
- NO reasoning, NO explanation, NO label, NO quotes. Decide silently, output once.
- Keep the date's own separators ("08/03/2026", "AUG 03 2026").
- If no date is visible, respond with exactly: NONE`;


export const ocrClaude = functions
  .region('us-central1')
  // minInstances:1 — le client est en CLAUDE_ONLY : CETTE fonction est sur le
  // chemin critique de chaque scan de lot. Sans instance chaude, les démarrages à
  // froid faisaient passer l'exécution de ~2,4 s à 5,4-5,7 s. La réservation a été
  // reprise à ocrVision (qui ne reçoit plus aucun trafic) → coût net inchangé.
  .runWith({ secrets: [ANTHROPIC_API_KEY], memory: '512MB', timeoutSeconds: 30, minInstances: 1 })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Firebase-AppCheck');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    if (!(await checkAppCheck(req, res))) return;

    const body = req.body as {
      imageBase64?: string;
      mediaType?: string;
      nativeWidth?: number;
      nativeHeight?: number;
      captureDiag?: string;
      mode?: string;
    };
    const imageBase64 = body?.imageBase64;
    // 'bestby' = mode « pas de numéro de lot » (bouton dédié). Tout le reste, y
    // compris l'absence de champ (anciennes versions de l'app), reste sur le
    // chemin LOT historique — aucun changement de comportement par défaut.
    const isBestBy = body?.mode === 'bestby';
    const rawMediaType = body?.mediaType ?? 'image/jpeg';
    // Diagnostic décalage/recadrage capture : dimensions natives de la photo (avant
    // bande). Même image que Vision/ML Kit → si carrée, le code est coupé en amont.
    if (body?.nativeWidth && body?.nativeHeight) {
      console.log(`[ocrClaude] native capture: ${body.nativeWidth}x${body.nativeHeight}`);
    }
    if (body?.captureDiag) {
      console.log(`[ocrClaude] ${body.captureDiag}`);
    }

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'imageBase64 required' });
      return;
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      res.status(413).json({ error: 'Image too large' });
      return;
    }
    if (!ALLOWED_MEDIA_TYPES.has(rawMediaType)) {
      res.status(400).json({ error: 'Unsupported mediaType' });
      return;
    }
    const mediaType = rawMediaType as AllowedMediaType;

    const apiKey = ANTHROPIC_API_KEY.value();
    if (!apiKey) {
      console.error('[ocrClaude] ANTHROPIC_API_KEY missing');
      res.status(500).json({ error: 'Anthropic key not configured' });
      return;
    }

    // TEMP DEBUG (à retirer) : sauvegarde la bande reçue dans Storage pour
    // pouvoir expérimenter hors-app sur l'image RÉELLE que voit Claude
    // (recadrage/échelle) au lieu d'itérer à l'aveugle. Lots non-PII.
    try {
      const admin = await import('firebase-admin');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = mediaType === 'image/png' ? 'png' : 'jpg';
      const debugPath = `debug-ocr/${ts}.${ext}`;
      await admin
        .storage()
        // Bucket dédié créé à la main : Firebase Storage n'a JAMAIS été
        // provisionné sur ce projet (aucun bucket par défaut), d'où les 404.
        .bucket('eatsok-6d19f-debug-ocr')
        .file(debugPath)
        .save(Buffer.from(imageBase64, 'base64'), { contentType: mediaType });
      console.log(`[ocrClaude] DEBUG image saved: ${debugPath}`);
    } catch (e) {
      console.warn('[ocrClaude] debug save failed (non-blocking):', e instanceof Error ? e.message : e);
    }

    // Dynamic import so the SDK is only loaded on the first cold start.
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    try {
      // Image BRUTE uniquement. Testé : la variante jimp greyscale+normalize+
      // contrast rendait Claude AVEUGLE sur les points pâles (paquet rouge
      // Francine : lectures "HG1016983" en brut → "" en contrasté). Le modèle
      // gère mieux la couleur brute que notre prétraitement destructif.
      const userContent: AnthropicTypes.MessageParam['content'] = [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: imageBase64 }
        },
        {
          type: 'text',
          text: isBestBy
            ? 'Extract the best-by / use-by date from this packaging image. Never include internal reasoning or XML tags in your reply.'
            : 'Extract the lot number from this packaging image. Never include internal reasoning or XML tags in your reply.'
        }
      ];

      const message = await client.messages.create({
        // Opus 5 = moteur vision/OCR le plus capable (support haute résolution
        // jusqu'à 2576px), au MÊME prix qu'Opus 4.8 ($5/$25 par 1M tokens). Pas de
        // `temperature` (supprimé sur Opus 5). thinking DÉSACTIVÉ : sur Opus 5 le
        // raisonnement est ON par défaut et PARTAGE le budget max_tokens (64) → il
        // tronquerait la réponse ET la ralentirait. On le coupe pour garder la
        // rapidité/coût d'Opus 4.8 (`disabled` autorisé tant que l'effort ≤ high).
        model: 'claude-opus-5',
        max_tokens: 64,
        thinking: { type: 'disabled' },
        system: [
          {
            type: 'text',
            text: isBestBy ? CLAUDE_BESTBY_SYSTEM_PROMPT : CLAUDE_LOT_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' }
          }
        ],
        messages: [
          {
            role: 'user',
            content: userContent
          }
        ]
      });

      const raw = message.content
        .filter((block): block is AnthropicTypes.TextBlock => block.type === 'text')
        .map((b) => b.text.trim())
        .join('')
        .trim();

      // SÛRETÉ SORTIE : un lot valide est un token compact (lettres/chiffres, +
      // éventuels "-" ou "/"), SANS espace. Sur Opus 5 avec thinking désactivé, le
      // modèle FUIT parfois son raisonnement dans la réponse ("… no, that includes
      // a time. Let me output …"). Ce texte parasite ne doit JAMAIS repartir comme
      // numéro de lot (risque de faux rappel). On n'accepte qu'un token propre ;
      // sinon on tente de récupérer un unique candidat, et à défaut on REJETTE
      // (l'app repasse en saisie manuelle — bien plus sûr qu'un mauvais lot).
      const upper = raw.toUpperCase();
      // Une DATE contient des espaces ("AUG 03 2026") : la valider avec le motif
      // d'un lot (qui les interdit) la faisait rejeter en bloc → « no text
      // detected » sur tous les formats à mois écrit. Chaque mode a donc sa forme.
      const LOT_RE = /^[A-Z0-9][A-Z0-9/-]{2,23}$/;
      const DATE_RE = /^[A-Z0-9][A-Z0-9 ,./-]{2,29}$/;
      const DATE_TOKEN =
        /(?:[A-Z]{3,9}\.?\s+\d{1,2}(?:ST|ND|RD|TH)?,?\s+\d{2,4}|\d{1,2}(?:ST|ND|RD|TH)?\s+[A-Z]{3,9}\.?,?\s+\d{2,4}|\d{4}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,2}|\d{1,2}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{2,4}|[A-Z]{3,9}\.?\s+\d{4}|\d{1,2}\s*[-/.]\s*\d{4}|\d{6,8})/g;
      const shapeRe = isBestBy ? DATE_RE : LOT_RE;
      const salvageRe = isBestBy ? DATE_TOKEN : /[A-Z0-9][A-Z0-9/-]{2,23}/g;
      let cleaned = '';
      if (upper && upper !== 'NONE') {
        if (shapeRe.test(upper)) {
          cleaned = upper;
        } else {
          const candidates = Array.from(new Set(upper.match(salvageRe) ?? [])).map((c) => c.trim());
          cleaned = candidates.length === 1 ? candidates[0] : '';
          console.warn('[ocrClaude] non-bare output', JSON.stringify({ raw, salvaged: cleaned }));
        }
      }

      console.log(
        '[ocrClaude] usage:',
        JSON.stringify({
          text: cleaned,
          cache_read: message.usage.cache_read_input_tokens,
          cache_creation: message.usage.cache_creation_input_tokens,
          input: message.usage.input_tokens,
          output: message.usage.output_tokens
        })
      );

      res.status(200).json({
        text: cleaned,
        lines: cleaned ? [{ content: cleaned, confidence: 0.95 }] : [],
        confidence: cleaned ? 0.95 : 0,
        source: 'claude-fallback',
        usage: {
          cacheReadTokens: message.usage.cache_read_input_tokens,
          cacheCreationTokens: message.usage.cache_creation_input_tokens,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens
        }
      });
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const messageText = error instanceof Error ? error.message : 'unknown';
      console.error('[ocrClaude] Anthropic error', status, messageText);
      res.status(502).json({ error: `Claude API error: ${messageText}` });
    }
  });
