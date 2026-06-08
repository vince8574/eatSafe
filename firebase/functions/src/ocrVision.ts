import * as functions from 'firebase-functions/v1';
import { defineSecret } from 'firebase-functions/params';
import * as https from 'https';
import { checkAppCheck } from './appCheck';

// Google Cloud Vision API key, stored as a Firebase secret:
//   firebase functions:secrets:set GOOGLE_VISION_API_KEY
const GOOGLE_VISION_API_KEY = defineSecret('GOOGLE_VISION_API_KEY');

const MAX_IMAGE_BASE64_LENGTH = 10 * 1024 * 1024; // ~10 MB

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

/**
 * ocrVision — server-side proxy to the Google Cloud Vision REST API.
 *
 * Deployed in us-central1 (next to ocrClaude and the US user base) instead of
 * the old europe-west1 deployment, so US scans no longer make a transatlantic
 * round-trip. minInstances: 1 keeps one instance warm to kill the 2-5s cold
 * start that dominated the perceived OCR latency on hard (etched) codes.
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
      const { status, body: data } = await postJson(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: 'TEXT_DETECTION' }],
              imageContext: { languageHints }
            }
          ]
        }
      );

      const apiError = data?.error?.message || data?.responses?.[0]?.error?.message;
      if (status < 200 || status >= 300 || apiError) {
        console.error('[ocrVision] Vision API error', status, apiError);
        res.status(502).json({ error: `Vision API error: ${apiError || `HTTP ${status}`}` });
        return;
      }

      const annotation = data?.responses?.[0] ?? {};
      const text: string =
        annotation?.fullTextAnnotation?.text ||
        annotation?.textAnnotations?.[0]?.description ||
        '';

      const lines = text
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((content) => ({ content }));

      const pageConfidence = annotation?.fullTextAnnotation?.pages?.[0]?.confidence;

      console.log('[ocrVision] text length:', text.length, 'lines:', lines.length);

      res.status(200).json({
        text,
        lines,
        confidence: typeof pageConfidence === 'number' ? pageConfidence : undefined,
        source: 'vision-fallback'
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'unknown';
      console.error('[ocrVision] error', messageText);
      res.status(502).json({ error: `Vision proxy error: ${messageText}` });
    }
  });
