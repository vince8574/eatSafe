// src/services/ocrService.ts
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { OCRResult } from '../types';
import { getBrandMatcher } from './brandMatcher';

const preprocessConfig = {
  resize: { width: 1280 },
  format: SaveFormat.PNG,
  compress: 1
} as const;

const MLKIT_UNAVAILABLE_MESSAGE =
  'OCR necessita une build native (development ou production). Installez EatSafe via EAS Build pour activer la reconnaissance.';

function ensureMlkitAvailable() {
  if (!TextRecognition || typeof TextRecognition.recognize !== 'function') {
    throw new Error(MLKIT_UNAVAILABLE_MESSAGE);
  }
}

export async function preprocessImage(uri: string) {
  const manipulated = await manipulateAsync(uri, [{ resize: preprocessConfig.resize }], {
    compress: preprocessConfig.compress,
    format: preprocessConfig.format
  });

  return manipulated.uri;
}

export async function runMlkit(uri: string): Promise<OCRResult> {
  ensureMlkitAvailable();
  
  const result = await TextRecognition.recognize(uri);

  const text = result.text;
  
  const lines = result.blocks.flatMap((block) =>
    block.lines.map((line) => ({
      content: line.text
    }))
  );

  return {
    text,
    lines
  };
}

export async function extractBrand(rawText: string): Promise<string> {
  const matcher = getBrandMatcher();
  
  // 1. Essayer de trouver une marque connue dans le texte
  const brandMatches = matcher.extractBrandsFromText(rawText, 0.75);
  
  if (brandMatches.length > 0 && brandMatches[0].confidence >= 0.85) {
    console.log(`✅ Brand matched: ${brandMatches[0].brand} (confidence: ${brandMatches[0].confidence.toFixed(2)})`);
    return brandMatches[0].brand;
  }

  // 2. Fallback: extraction basique
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  const brandCandidates = lines
    .filter(line => line.length >= 3 && line.length <= 30)
    .filter(line => /^[A-ZÀ-ÿ]/.test(line))
    .filter(line => {
      const digitCount = (line.match(/\d/g) || []).length;
      return digitCount < line.length / 2;
    });
  
  if (brandCandidates.length === 0) {
    return '';
  }

  const bestCandidate = brandCandidates[0];
  const match = matcher.findBestMatch(bestCandidate, 0.7);
  
  if (match && match.confidence >= 0.7) {
    console.log(`✅ Brand matched (candidate): ${match.brand} (confidence: ${match.confidence.toFixed(2)})`);
    return match.brand;
  }

  console.log(`⚠️ No brand match found, using raw: ${bestCandidate}`);
  return bestCandidate;
}

export async function extractLotNumber(rawText: string): Promise<string> {
  const patterns = [
    { regex: /\bL(?:OT)?[:\s-]*([A-Z0-9\-]{4,})/i, priority: 1 },
    { regex: /\bGTIN[:\s-]*([0-9]{8,14})\b/i, priority: 2 },
    { regex: /\bN[O0][:\s-]*([A-Z0-9\-]{4,})\b/i, priority: 3 },
    { regex: /\b([A-Z]{2,}\d{4,})\b/, priority: 4 },
    { regex: /\b(\d{8,})\b/, priority: 5 }
  ];

  const cleaned = rawText.replace(/\s+/g, ' ').trim();

  for (const { regex } of patterns) {
    const match = cleaned.match(regex);
    if (match && match[1] && match[1].length >= 4) {
      return match[1];
    }
  }

  const fallback = cleaned.split(' ').find((token) => 
    token.length >= 6 && /[A-Z].*\d|\d.*[A-Z]/i.test(token)
  );
  
  return fallback ?? '';
}

export interface BrandExtractionResult {
  brand: string;
  confidence: number;
  isKnownBrand: boolean;
  suggestions?: string[];
  result: OCRResult;
}

export async function performOcrForBrand(uri: string): Promise<BrandExtractionResult> {
  ensureMlkitAvailable();
  const processed = await preprocessImage(uri);
  
  try {
    const result = await runMlkit(processed);
    const brand = await extractBrand(result.text);
    
    const matcher = getBrandMatcher();
    const match = matcher.findBestMatch(brand, 0.6);
    
    // Proposer des suggestions si confiance faible
    let suggestions: string[] | undefined;
    if (!match || match.confidence < 0.85) {
      const topMatches = matcher.findTopMatches(brand, 3, 0.6);
      suggestions = topMatches.map((m: { brand: string }) => m.brand);
    }

    return {
      brand: match?.brand || brand || 'Marque inconnue',
      confidence: match?.confidence || 0,
      isKnownBrand: !!match && match.confidence >= 0.85,
      suggestions: suggestions && suggestions.length > 0 ? suggestions : undefined,
      result
    };
  } finally {
    try {
      await FileSystem.deleteAsync(processed, { idempotent: true });
    } catch (error) {
      console.warn('Failed to delete processed image', error);
    }
  }
}

export interface LotExtractionResult {
  lot: string;
  result: OCRResult;
}

export async function performOcr(uri: string): Promise<LotExtractionResult> {
  ensureMlkitAvailable();
  const processed = await preprocessImage(uri);
  
  try {
    const result = await runMlkit(processed);
    const lot = await extractLotNumber(result.text);

    return {
      lot,
      result
    };
  } finally {
    try {
      await FileSystem.deleteAsync(processed, { idempotent: true });
    } catch (error) {
      console.warn('Failed to delete processed image', error);
    }
  }
}