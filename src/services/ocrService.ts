// src/services/ocrService.ts
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { OCRResult } from '../types';
import { searchBrands } from './firestoreBrandsService';
import { DEFAULT_BRAND_NAME } from '../constants/defaults';

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

  console.log('[OCR] Starting TextRecognition.recognize for:', uri);
  const result = await TextRecognition.recognize(uri);
  console.log('[OCR] Recognition complete. Result:', JSON.stringify(result, null, 2).substring(0, 500));

  const text = result.text;
  console.log('[OCR] ===== TEXT RECOGNIZED =====');
  console.log('[OCR] Full text:', text);
  console.log('[OCR] ============================');

  // Ensure blocks is an array
  const blocks = Array.isArray(result.blocks) ? result.blocks : [];
  console.log('[OCR] Blocks count:', blocks.length);

  const lines = blocks.flatMap((block) =>
    Array.isArray(block.lines) ? block.lines.map((line) => ({
      content: line.text
    })) : []
  );

  return {
    text,
    lines
  };
}

export async function extractBrand(rawText: string): Promise<string> {
  console.log('[extractBrand] Extracting brand from OCR text');

  // 1. Extract brand candidates from OCR text
  console.log('[extractBrand] Splitting text into lines');
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  console.log('[extractBrand] Lines count:', lines.length);

  console.log('[extractBrand] Filtering brand candidates');
  const brandCandidates = lines
    .filter(line => line.length >= 2 && line.length <= 30)
    .filter(line => /^[A-ZÀ-ÿ]/.test(line))
    .filter(line => {
      const digitCount = (line.match(/\d/g) || []).length;
      return digitCount < line.length / 2;
    });
  console.log('[extractBrand] Brand candidates count:', brandCandidates.length);

  if (brandCandidates.length === 0) {
    console.log('[extractBrand] No candidates found, returning empty');
    return '';
  }

  // 2. Try to match each candidate with Firestore brands
  for (const candidate of brandCandidates.slice(0, 3)) {
    console.log(`[extractBrand] Searching Firestore for: "${candidate}"`);
    try {
      const matches = await searchBrands(candidate, 1);
      if (matches.length > 0) {
        console.log(`✅ Brand matched from Firestore: ${matches[0]}`);
        return matches[0];
      }
    } catch (error) {
      console.warn('[extractBrand] Firestore search failed for candidate:', candidate, error);
    }
  }

  // 3. Fallback: return first candidate
  const bestCandidate = brandCandidates[0];
  console.log(`⚠️ No Firestore match found, using raw candidate: ${bestCandidate}`);
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
  console.log('[Brand OCR] Step 1: Starting preprocessing');
  const processed = await preprocessImage(uri);
  console.log('[Brand OCR] Step 2: Preprocessing complete');

  try {
    console.log('[Brand OCR] Step 3: Starting runMlkit');
    const result = await runMlkit(processed);
    console.log('[Brand OCR] Step 4: runMlkit complete, extracting brand from text');

    const brand = await extractBrand(result.text);
    console.log('[Brand OCR] Step 5: Brand extracted:', brand);

    // Check if brand is in Firestore and get suggestions
    console.log('[Brand OCR] Step 6: Searching Firestore for exact match');
    let isKnownBrand = false;
    let confidence = 0;
    let suggestions: string[] | undefined;

    try {
      const matches = await searchBrands(brand, 3);
      console.log('[Brand OCR] Step 7: Firestore matches:', matches);

      if (matches.length > 0 && matches[0].toLowerCase() === brand.toLowerCase()) {
        // Exact match found
        isKnownBrand = true;
        confidence = 1.0;
        console.log(`✅ Exact brand match in Firestore: ${matches[0]}`);
      } else if (matches.length > 0) {
        // Similar matches found - use as suggestions
        suggestions = matches;
        confidence = 0.7;
        console.log(`⚠️ Similar brands found: ${matches.join(', ')}`);
      } else {
        // No match - search for suggestions
        console.log('[Brand OCR] Step 8: No exact match, getting suggestions');
        suggestions = await searchBrands(brand, 3);
        confidence = 0.3;
      }
    } catch (error) {
      console.warn('[Brand OCR] Firestore search failed:', error);
      confidence = 0;
    }

    console.log('[Brand OCR] Step 9: Building result object');
    const finalResult = {
      brand: brand || DEFAULT_BRAND_NAME,
      confidence,
      isKnownBrand,
      suggestions: suggestions && suggestions.length > 0 ? suggestions : undefined,
      result
    };
    console.log('[Brand OCR] Step 10: Returning result');
    return finalResult;
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