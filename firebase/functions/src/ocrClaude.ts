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
const CLAUDE_LOT_SYSTEM_PROMPT = `You are a precise OCR assistant specialized in food packaging lot/batch numbers.

TASK: Extract ONLY the lot/batch number from the image.

VALID lot patterns (in order of priority):
1. Text starting with "LOT" or "L" followed by alphanumeric characters
   Examples: "LOT 12345A", "L693A2102R", "L 24123"
2. Series of 5-12 digits that are NOT a barcode (barcodes/EAN are 13-14 digits)
3. Embossed, laser-etched, or printed codes typically near "Best Before" / "Use By"

IGNORE:
- Brand names and product descriptions
- Best-before or expiration dates (DD/MM/YYYY, MMM YYYY)
- Time stamps (HH:MM)
- Barcodes / EAN / GTIN (13-14 consecutive digits)
- Phone numbers, addresses, ingredients

OUTPUT FORMAT:
- Respond with ONLY the lot number, no quotes, no labels
- Strip spaces and special chars ("L 693 A" → "L693A")
- Max 22 chars
- If NONE visible, respond with exactly: NONE`;

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

    const body = req.body as { imageBase64?: string; mediaType?: string };
    const imageBase64 = body?.imageBase64;
    const rawMediaType = body?.mediaType ?? 'image/jpeg';

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

    // Dynamic import so the SDK is only loaded on the first cold start.
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
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
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 }
              },
              {
                type: 'text',
                text: 'Extract the lot number from this packaging image.'
              }
            ]
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
