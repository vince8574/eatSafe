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
usually a dense alphanumeric or numeric string, often on its own line, separate
from the human-readable best-by date.

VALID lot patterns (in order of priority):
1. Text starting with "LOT", "LOT CODE", "BATCH" or "L" followed by characters
   Examples: "LOT 12345A", "L693A2102R", "L 24123"
2. A dense alphanumeric/numeric production code printed/inkjet/laser-etched near
   (but distinct from) the "Best By" / "Use By" / "Guaranteed Fresh" date
   Examples: "249334315", "WN012117E", "SE102922A", "2 493 34315" -> "249334315"
3. A series of 5-12 digits that is NOT a barcode (barcodes/EAN/GTIN are 13-14 digits)

NEVER return a DATE. This is the single most important rule:
- Best-before / expiration / "GUARANTEED FRESH UNTIL" dates in ANY form:
  "JAN 5 2026", "APR2026", "01/05/2026", "MMM YYYY", "DEC 2025", a bare year "2026"
- A month name (JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC) next
  to digits is a DATE, not a lot — ignore it.
- Time stamps ("01:28", "HH:MM"), brand names, addresses, phone numbers, weights.

NEVER return REGULATORY MARKINGS — these look like lot codes but are factory
identifiers, identical on every pack:
- EU/UK oval identification marks: "FR 44.014.001 CE", "GB WD028", "UK XX123 EC"
- French packer codes: "EMB 44014B" (anything after "EMB")
- USDA inspection marks: "EST. 38", "P-123"
If such a marking appears NEXT TO a separate printed/inkjet code, return the
inkjet production code, not the marking.

If the ONLY thing you can read is a date (and no separate production code),
respond with exactly: NONE. Do NOT output the date.

DOT-MATRIX / INKJET CODES (dotted characters) — read with EXTREME care:
- These codes are printed as a grid of dots, often pale or on a colored
  background. You may receive TWO versions of the same image (raw color +
  contrast-enhanced grayscale): cross-reference BOTH before deciding.
- Count the characters: do NOT drop or invent a character. If the code has 10
  glyphs, your answer must have exactly 10 characters.
- Frequent dot-matrix confusions — decide using the dot pattern, the second
  image, and consistency with neighboring characters:
  6 vs 8 vs 3 vs 9, 0 vs O vs D, 5 vs S, 1 vs I vs T, B vs 8, H vs M vs N,
  G vs 6, 4 vs A.
- Typical layout on such packs: line 1 = date (DD/MM/YYYY), line 2 = time
  (HH:MM:SS), line 3 = the LOT CODE (letters + digits), line 4 = a secondary
  counter (often "NNNN:NNNNN" with a colon) — return line 3, not line 4.
- Verify your reading character by character before answering.

EXAMPLES (text visible on the pack -> the ONE correct answer).
Study how the date, barcode, weight and factory markings are IGNORED:
- "À consommer avant le : 01/02/2027 21:44 | N° de lot : 16127040 | Origine: USA" -> 16127040
  (the production code printed BELOW the best-by date+time, not the date)
- "02/2028 20:09   L605118B" -> L605118B
  (flattened date+time on the left, the L-code is the lot)
- "10 09 2026 09:30   L013204---4" -> L013204
  (strip the trailing dashes and the secondary "4" counter)
- "08.11.26   615E2VSN-01-2" -> 615E2VSN-01-2
  (keep the full hyphenated code; the 08.11.26 is the date)
- "LOT:H26/147-R245   DLC:24/06/26-18:01" -> H26/147-R245
  (explicit LOT label wins; DLC is the date)
- "Poids net 3 x 115 g   E L26/1049   31.12.2029   ES 12.06648/C CE   00713" -> L26/1049
  (ignore the weight "3x115g", the date, and the oval "ES 12.06648/C CE")
- "Numéro de Lot : 36028   06/2027   ES 26.00298/B UE" -> 36028
  (ignore the sanitary oval "ES 26.00298/B"; 36028 is the lot)
- "25/03/28   26084 / 11:31   3760091726568" -> 26084
  (3760091726568 is the 13-digit BARCODE — never return it)
- "À consommer 24/06/2026   LOT: 147100  10210740" -> 147100
  (147100 follows the LOT label; 10210740 is a secondary counter)

OUTPUT FORMAT:
- Respond with ONLY the lot code, no quotes, no labels.
- Strip spaces and special chars ("L 693 A" -> "L693A", "2 493 34315" -> "249334315").
- Max 22 chars.
- If no lot code is visible, respond with exactly: NONE`;


export const ocrClaude = functions
  .region('us-central1')
  .runWith({ secrets: [ANTHROPIC_API_KEY], memory: '512MB', timeoutSeconds: 30 })
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
    };
    const imageBase64 = body?.imageBase64;
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
        .bucket()
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
          text: 'Extract the lot number from this packaging image.'
        }
      ];

      const message = await client.messages.create({
        // Opus 4.8 = modèle le plus capable en vision/OCR (+ support haute
        // résolution jusqu'à 2576px). Pas de `temperature` (supprimé sur Opus 4.8).
        // Pas de raisonnement : trop lent/cher pour le flux automatique. max_tokens
        // 64 + prompt "ONLY the lot code" → réponse directe.
        model: 'claude-opus-4-8',
        max_tokens: 64,
        system: [
          {
            type: 'text',
            text: CLAUDE_LOT_SYSTEM_PROMPT,
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

      const text = message.content
        .filter((block): block is AnthropicTypes.TextBlock => block.type === 'text')
        .map((b) => b.text.trim())
        .join('')
        .trim();

      const cleaned = text.toUpperCase() === 'NONE' ? '' : text;

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
