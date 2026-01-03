import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { OCRResult } from '../types';

type VisionConfig = {
  endpoint?: string;
  apiKey?: string;
};

type OcrQualityAssessment = {
  averageConfidence: number | null;
  textLength: number;
  lineCount: number;
  noiseRatio: number;
  hasSparseText: boolean;
  hasLowConfidence: boolean;
  hasHighNoise: boolean;
  reasons: string[];
};

function getVisionConfig(): VisionConfig {
  const extra = (Constants.expoConfig?.extra as any) ?? {};
  const visionExtra = (extra.vision as VisionConfig) ?? {};
  const env = (globalThis as any)?.process?.env;

  return {
    endpoint: env?.EXPO_PUBLIC_VISION_ENDPOINT || visionExtra.endpoint,
    apiKey: env?.EXPO_PUBLIC_VISION_API_KEY || visionExtra.apiKey
  };
}

export function isVisionAvailable(): boolean {
  const { endpoint } = getVisionConfig();
  return Boolean(endpoint);
}

export function assessOcrQuality(result: OCRResult): OcrQualityAssessment {
  const text = result.text || '';
  const compact = text.replace(/\s+/g, '');
  const alnumCount = (compact.match(/[A-Z0-9]/gi) || []).length;
  const noiseCount = Math.max(0, compact.length - alnumCount);
  const noiseRatio = compact.length === 0 ? 1 : noiseCount / compact.length;

  const lineCount = Array.isArray(result.lines) ? result.lines.length : 0;
  const averageConfidence =
    lineCount > 0
      ? result.lines.reduce((sum, line) => sum + (line.confidence ?? 1), 0) / lineCount
      : null;

  const reasons: string[] = [];

  if (averageConfidence !== null && averageConfidence < 0.55) {
    reasons.push('confiance faible (texte flou)');
  }

  if (text.trim().length < 20 || lineCount <= 1) {
    reasons.push('texte trop court ou épars (mauvais éclairage)');
  }

  if (noiseRatio > 0.35) {
    reasons.push('taux de bruit élevé (impression difficile à lire)');
  }

  return {
    averageConfidence,
    textLength: text.length,
    lineCount,
    noiseRatio,
    hasSparseText: text.trim().length < 20 || lineCount <= 1,
    hasLowConfidence: averageConfidence !== null && averageConfidence < 0.55,
    hasHighNoise: noiseRatio > 0.35,
    reasons
  };
}

export function shouldUseVisionFallback(result: OCRResult) {
  if (!isVisionAvailable()) {
    return { shouldFallback: false, reasons: ['vision non configurée'], quality: assessOcrQuality(result) };
  }

  const quality = assessOcrQuality(result);
  const triggers = quality.reasons;

  return {
    shouldFallback: triggers.length > 0,
    reasons: triggers,
    quality
  };
}

export async function runVisionFallback(uri: string): Promise<OCRResult> {
  const { endpoint, apiKey } = getVisionConfig();

  if (!endpoint) {
    throw new Error('Endpoint IA vision non configuré');
  }

  const base64Image = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      image: `data:image/png;base64,${base64Image}`,
      task: 'ocr'
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Vision fallback failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const rawLines = Array.isArray(data.lines) ? data.lines : Array.isArray(data.lineTexts) ? data.lineTexts : [];
  const lines = rawLines
    .map((line: any) => ({
      content: typeof line === 'string' ? line : line?.text || '',
      confidence: typeof line?.confidence === 'number' ? line.confidence : undefined
    }))
    .filter((line: any) => Boolean(line.content));

  const textFromLines = lines.map((line) => line.content).join('\n');
  const text = data.text || data.fullText || textFromLines;
  const confidence =
    typeof data.confidence === 'number'
      ? data.confidence
      : lines.length > 0
        ? lines.reduce((sum, line) => sum + (line.confidence ?? 1), 0) / lines.length
        : undefined;

  return {
    text,
    lines,
    confidence,
    source: 'vision-fallback'
  };
}

export async function tryVisionFallback(uri: string, result: OCRResult, context: 'brand' | 'lot'): Promise<OCRResult | null> {
  const decision = shouldUseVisionFallback(result);

  if (!decision.shouldFallback) {
    return null;
  }

  console.log(
    `[VisionFallback] Triggered for ${context} because: ${decision.reasons.join(', ')} | quality=`,
    decision.quality
  );

  try {
    const fallbackResult = await runVisionFallback(uri);
    console.log('[VisionFallback] Success - using vision fallback result');
    return fallbackResult;
  } catch (error) {
    console.warn('[VisionFallback] Vision fallback failed, keeping ML Kit result', error);
    return null;
  }
}
