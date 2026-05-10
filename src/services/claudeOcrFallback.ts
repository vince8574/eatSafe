import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import type { OCRResult } from '../types';
import { getAppCheckToken } from './appCheckService';

type ClaudeConfig = {
  endpoint?: string;
};

function getClaudeConfig(): ClaudeConfig {
  const extra = (Constants.expoConfig?.extra as any) ?? {};
  const claudeExtra = (extra.claude as ClaudeConfig) ?? {};
  const env = (globalThis as any)?.process?.env;
  return {
    endpoint: env?.EXPO_PUBLIC_CLAUDE_ENDPOINT || claudeExtra.endpoint
  };
}

export function isClaudeAvailable(): boolean {
  return Boolean(getClaudeConfig().endpoint);
}

/**
 * Returns true when the OCR text already contains something that looks like a
 * plausible lot number. Used as a gate before calling the Cloud Function so we
 * skip the paid 3rd-tier fallback when ML Kit or Vision has already produced
 * something usable. The patterns match the same families as detectLotLike() in
 * ScanLotScreen — "LOT XXX", "L" + digits, or 4-22 char alphanumerics that are
 * not pure EAN/GTIN.
 */
function hasPlausibleLotPattern(text: string): boolean {
  if (!text) return false;
  const cleaned = text.replace(/\s+/g, ' ').toUpperCase();

  if (/(?:^|[^A-Z])LOT[:\s\-.]*[A-Z0-9]{3,22}/.test(cleaned)) return true;
  if (/(?:^|[^A-Z])L\d{3,15}/.test(cleaned)) return true;

  const tokens = cleaned.match(/[A-Z0-9]{4,22}/g) || [];
  return tokens.some((t) => {
    const digits = (t.match(/\d/g) || []).length;
    // Exclude EAN/GTIN (13-14 pure-digit codes)
    if (t.length >= 13 && digits === t.length) return false;
    return digits >= 2;
  });
}

type ClaudeUsage = {
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
};

type ClaudeApiResponse = {
  text?: string;
  lines?: Array<{ content: string; confidence?: number }>;
  confidence?: number;
  source?: string;
  usage?: ClaudeUsage;
};

async function runClaudeFallback(uri: string): Promise<OCRResult> {
  const { endpoint } = getClaudeConfig();
  if (!endpoint) throw new Error('ocrClaude Cloud Function endpoint not configured');

  const base64Image = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64
  });

  const lower = uri.toLowerCase();
  const mediaType: 'image/png' | 'image/jpeg' | 'image/webp' = lower.endsWith('.png')
    ? 'image/png'
    : lower.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const appCheckToken = await getAppCheckToken();
  if (appCheckToken) headers['X-Firebase-AppCheck'] = appCheckToken;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ imageBase64: base64Image, mediaType })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`ocrClaude failed: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as ClaudeApiResponse;

  if (data.usage) {
    console.log(
      `[ClaudeFallback] tokens: in=${data.usage.inputTokens}, out=${data.usage.outputTokens}, ` +
        `cache_read=${data.usage.cacheReadTokens}, cache_creation=${data.usage.cacheCreationTokens}`
    );
  }

  return {
    text: data.text || '',
    lines: data.lines || [],
    confidence: data.confidence,
    source: 'claude-fallback'
  };
}

/**
 * Third-tier OCR fallback: invoke the ocrClaude Cloud Function when ML Kit and
 * Google Vision have both failed to produce a plausible lot pattern. Returns
 * null when the call is skipped (Claude not configured, or previous OCR
 * already has a usable result) or when the call fails — the caller should
 * keep the previous result in that case.
 */
export async function tryClaudeFallback(
  uri: string,
  previousOcr: OCRResult,
  context: 'lot'
): Promise<OCRResult | null> {
  if (!isClaudeAvailable()) {
    console.log('[ClaudeFallback] skipped: endpoint not configured');
    return null;
  }
  if (hasPlausibleLotPattern(previousOcr.text)) {
    console.log('[ClaudeFallback] skipped: previous OCR already has a lot pattern');
    return null;
  }
  try {
    console.log(`[ClaudeFallback] invoking Cloud Function for ${context}`);
    const result = await runClaudeFallback(uri);
    return result.text ? result : null;
  } catch (e) {
    console.warn('[ClaudeFallback] call failed, keeping previous result', e);
    return null;
  }
}
