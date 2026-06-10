import * as functions from 'firebase-functions/v1';
import { defineSecret } from 'firebase-functions/params';
import * as https from 'https';
import Jimp from 'jimp';
import { checkAppCheck } from './appCheck';

// Google Cloud Vision API key, stored as a Firebase secret:
//   firebase functions:secrets:set GOOGLE_VISION_API_KEY
const GOOGLE_VISION_API_KEY = defineSecret('GOOGLE_VISION_API_KEY');

const MAX_IMAGE_BASE64_LENGTH = 10 * 1024 * 1024; // ~10 MB

type VisionLine = { content: string; confidence?: number };
type VisionResult = { text: string; lines: VisionLine[]; confidence?: number };

function postJson(url: string, payload: unknown): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const u = new URL(url);
    const request = https.request(
      {
        method: 'POST',
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (response) => {
        let chunks = '';
        response.on('data', (c) => {
          chunks += c;
        });
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode ?? 0, body: chunks ? JSON.parse(chunks) : {} });
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    request.on('error', reject);
    request.write(data);
    request.end();
  });
}

// One Google Vision call on a base64 image → parsed text/lines. `feature` is
// TEXT_DETECTION (sparse) or DOCUMENT_TEXT_DETECTION (dense — better on packed
// codes like inkjet/dot-matrix lot numbers).
async function callVision(
  apiKey: string,
  imageBase64: string,
  languageHints: string[],
  feature: 'TEXT_DETECTION' | 'DOCUMENT_TEXT_DETECTION' = 'TEXT_DETECTION'
): Promise<VisionResult> {
  const { status, body: data } = await postJson(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: feature }],
          imageContext: { languageHints }
        }
      ]
    }
  );

  const apiError = data?.error?.message || data?.responses?.[0]?.error?.message;
  if (status < 200 || status >= 300 || apiError) {
    throw new Error(`Vision API error: ${apiError || `HTTP ${status}`}`);
  }

  const annotation = data?.responses?.[0] ?? {};
  const text: string =
    annotation?.fullTextAnnotation?.text ||
    annotation?.textAnnotations?.[0]?.description ||
    '';
  const lines: VisionLine[] = text
    .split('\n')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0)
    .map((content: string) => ({ content }));
  const pageConfidence = annotation?.fullTextAnnotation?.pages?.[0]?.confidence;

  return {
    text,
    lines,
    confidence: typeof pageConfidence === 'number' ? pageConfidence : undefined
  };
}

// Contrast enhancement for faint dot-matrix / inkjet lot codes: grayscale +
// histogram normalization + a contrast boost. This darkens pale ink (e.g. the
// faint "MG" / "49A" in "MG26148R49A") so Vision stops dropping it. Pure-JS
// (jimp) so it deploys to the Linux runner without a native-binary mismatch.
// Returns a base64 PNG, or null if processing fails (we then use the raw read).
async function enhanceForOcr(imageBase64: string): Promise<string | null> {
  try {
    const input = Buffer.from(imageBase64, 'base64');
    const image = await Jimp.read(input);
    // Diagnostic : luminosité moyenne (0-255) pour distinguer une capture NOIRE
    // (≈0 → frame noire iOS) d'une image floue mais éclairée (focus/distance).
    const tiny = image.clone().resize(1, 1);
    const p = Jimp.intToRGBA(tiny.getPixelColor(0, 0));
    console.log('[ocrVision] input image:', `${image.getWidth()}x${image.getHeight()}`, '| avgBrightness:', Math.round((p.r + p.g + p.b) / 3));
    // Gentle enhancement only: greyscale + histogram normalize + mild contrast.
    // (Aggressive blur+contrast destroyed faint dot-matrix into noise — logs showed
    // a real code degrade to "Y6+88". The raw pass is always merged in, so this
    // only ever ADDS candidates, never replaces the raw read.)
    image.greyscale().normalize().contrast(0.25);
    const out = await image.getBufferAsync(Jimp.MIME_PNG);
    return out.toString('base64');
  } catch (error) {
    console.warn('[ocrVision] enhance failed, using raw only:', error instanceof Error ? error.message : error);
    return null;
  }
}

// Merge two reads, de-duplicating identical lines (case/space-insensitive), so
// the app's extractLotNumber sees candidates from BOTH passes and picks the most
// complete lot. Including the raw read guarantees we never do worse than before.
function mergeReads(a: VisionResult, b: VisionResult | null): VisionResult {
  if (!b) return a;
  const seen = new Set<string>();
  const lines: VisionLine[] = [];
  for (const l of [...a.lines, ...b.lines]) {
    const key = l.content.replace(/\s+/g, '').toUpperCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      lines.push(l);
    }
  }
  const text = lines.map((l) => l.content).join('\n');
  const confidence = Math.max(a.confidence ?? 0, b.confidence ?? 0) || undefined;
  return { text, lines, confidence };
}

/**
 * ocrVision — server-side proxy to the Google Cloud Vision REST API.
 *
 * Deployed in us-central1 (next to ocrClaude and the US user base). minInstances:1
 * keeps one instance warm to kill the 2-5s cold start.
 *
 * For hard codes (pale dot-matrix), it OCRs the raw image AND a contrast-enhanced
 * variant in parallel and merges the text, so faint characters the raw pass drops
 * are recovered without ever doing worse than raw-only.
 *
 * Contract — MUST match src/services/visionFallbackService.ts:
 *   POST { imageBase64: string, languageHints?: string[] }
 *   ->   { text: string, lines: {content, confidence?}[], confidence?: number }
 */
export const ocrVision = functions
  .region('us-central1')
  .runWith({
    secrets: [GOOGLE_VISION_API_KEY],
    memory: '512MB',
    timeoutSeconds: 30,
    minInstances: 1
  })
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

    const body = req.body as { imageBase64?: string; languageHints?: string[] };
    const imageBase64 = body?.imageBase64;
    const languageHints =
      Array.isArray(body?.languageHints) && body.languageHints.length > 0
        ? body.languageHints
        : ['en'];

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'imageBase64 required' });
      return;
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      res.status(413).json({ error: 'Image too large' });
      return;
    }

    const apiKey = GOOGLE_VISION_API_KEY.value();
    if (!apiKey) {
      console.error('[ocrVision] GOOGLE_VISION_API_KEY missing');
      res.status(500).json({ error: 'Vision key not configured' });
      return;
    }

    try {
      // Build the enhanced variant (local CPU), then OCR raw + enhanced together.
      const enhancedBase64 = await enhanceForOcr(imageBase64);
      const [rawResult, enhancedResult] = await Promise.all([
        callVision(apiKey, imageBase64, languageHints, 'TEXT_DETECTION'),
        enhancedBase64
          ? callVision(apiKey, enhancedBase64, languageHints, 'DOCUMENT_TEXT_DETECTION').catch((e) => {
              console.warn('[ocrVision] enhanced pass failed:', e instanceof Error ? e.message : e);
              return null;
            })
          : Promise.resolve(null)
      ]);

      const merged = mergeReads(rawResult, enhancedResult);
      // TEMP diagnostics: log exactly what each pass read so the contrast/feature
      // settings can be tuned against real hard codes. Lot codes aren't PII.
      console.log('[ocrVision] RAW pass     :', JSON.stringify(rawResult.text));
      console.log('[ocrVision] ENHANCED pass:', JSON.stringify(enhancedResult?.text ?? ''));
      console.log('[ocrVision] MERGED lines :', merged.lines.length);

      res.status(200).json({
        text: merged.text,
        lines: merged.lines,
        confidence: merged.confidence,
        source: 'vision-fallback'
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'unknown';
      console.error('[ocrVision] error', messageText);
      res.status(502).json({ error: `Vision proxy error: ${messageText}` });
    }
  });
