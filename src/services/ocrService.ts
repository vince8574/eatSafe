// src/services/ocrService.ts
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { OCRResult } from '../types';
import { searchBrands } from './firestoreBrandsService';
import { DEFAULT_BRAND_NAME } from '../constants/defaults';

const preprocessConfig = {
  resize: { width: 1920 }, // Augmenter la résolution pour meilleure précision
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

  // Liste des marques de distributeur à éviter (ce ne sont pas les vraies marques de fabricant)
  const supermarketBrands = [
    'selection', 'sélection',
    'carrefour', 'auchan', 'leclerc', 'intermarché', 'intermarche',
    'casino', 'monoprix', 'franprix', 'leader price', 'lidl', 'aldi',
    'u', 'système u', 'systeme u', 'marque repère', 'marque repere',
    'eco+', 'premier prix', 'top budget', 'no name', 'essence',
    'bio', 'organic', 'nature', 'qualité', 'qualite'
  ];

  // Liste des noms de produits génériques (type de produit, pas la marque)
  const genericProductNames = [
    // Pâtes
    'spaghetti', 'tagliatelle', 'fusilli', 'penne', 'rigatoni', 'farfalle',
    'tortellini', 'ravioli', 'lasagne', 'lasagnes', 'cannelloni', 'gnocchi',
    'macaroni', 'linguine', 'fettuccine', 'vermicelli', 'capellini',
    // Riz
    'riz', 'rice', 'basmati', 'jasmine',
    // Pain et viennoiserie
    'pain', 'bread', 'baguette', 'croissant', 'brioche',
    // Produits laitiers
    'lait', 'milk', 'yaourt', 'yogurt', 'fromage', 'cheese', 'beurre', 'butter',
    // Viandes
    'jambon', 'ham', 'saucisse', 'saucisson', 'poulet', 'chicken', 'boeuf', 'beef',
    // Autres
    'chocolat', 'chocolate', 'biscuit', 'cookie', 'gateau', 'cake',
    'cereal', 'cereales', 'muesli', 'granola'
  ];

  const brandCandidates = lines
    // Accept longer brand names (up to 40 characters) and single chars for logos
    .filter(line => line.length >= 1 && line.length <= 40)
    // IMPORTANT: Filter out non-Latin scripts (Arabic, Chinese, etc.)
    // Only keep lines with Latin characters (A-Z, a-z, accents, numbers)
    .filter(line => {
      // Check if line contains at least some Latin letters
      const latinLetters = (line.match(/[A-ZÀ-ÿa-z]/g) || []).length;
      // Check for Arabic script (U+0600 to U+06FF)
      const arabicChars = (line.match(/[\u0600-\u06FF]/g) || []).length;
      // Check for other non-Latin scripts
      const cyrillicChars = (line.match(/[\u0400-\u04FF]/g) || []).length;
      const chineseChars = (line.match(/[\u4E00-\u9FFF]/g) || []).length;
      const japaneseChars = (line.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;

      // Reject if contains Arabic, Cyrillic, Chinese or Japanese
      if (arabicChars > 0 || cyrillicChars > 0 || chineseChars > 0 || japaneseChars > 0) {
        return false;
      }

      // Must have at least 1 Latin letter
      return latinLetters > 0;
    })
    // Accept both uppercase and lowercase start, or numbers (for brands like "1664")
    .filter(line => /^[A-ZÀ-ÿa-z0-9]/.test(line))
    // Exclude lines that are mostly numbers (but allow some digits for brands like "Lu" or "Kellogg's")
    .filter(line => {
      const digitCount = (line.match(/\d/g) || []).length;
      return digitCount < line.length * 0.7; // Allow up to 70% digits
    })
    // Exclude common OCR noise patterns
    .filter(line => !(/^[^a-zA-Z]*$/.test(line) && line.length < 3)) // Skip pure symbols/numbers < 3 chars
    .filter(line => !/^(lot|n°|no|l|gtin|ean|upc|best|before|exp)/i.test(line)) // Skip lot-related terms
    // IMPORTANT: Filter out supermarket/distributor brands (not manufacturer brands)
    .filter(line => {
      const lowerLine = line.toLowerCase();
      return !supermarketBrands.some(supermarket => lowerLine === supermarket || lowerLine.includes(supermarket));
    })
    // IMPORTANT: Filter out generic product names (not brand names)
    .filter(line => {
      const lowerLine = line.toLowerCase();
      return !genericProductNames.some(product => lowerLine === product || lowerLine.includes(product));
    });

  console.log('[extractBrand] Brand candidates:', brandCandidates.slice(0, 10));
  console.log('[extractBrand] Brand candidates count:', brandCandidates.length);

  if (brandCandidates.length === 0) {
    console.log('[extractBrand] No candidates found, returning empty');
    return '';
  }

  // 2. Try to match ALL candidates with Firestore brands (prioritize known brands)
  // First pass: check for exact or very close matches in ALL candidates
  const firestoreMatches: Array<{ candidate: string; match: string; index: number }> = [];

  for (let i = 0; i < brandCandidates.length && i < 15; i++) {
    const candidate = brandCandidates[i];
    console.log(`[extractBrand] Searching Firestore for: "${candidate}"`);
    try {
      const matches = await searchBrands(candidate, 1);
      if (matches.length > 0) {
        console.log(`✅ Brand matched from Firestore: ${matches[0]} (position ${i})`);
        firestoreMatches.push({ candidate, match: matches[0], index: i });
      }
    } catch (error) {
      console.warn('[extractBrand] Firestore search failed for candidate:', candidate, error);
    }
  }

  // If we found any Firestore matches, return the one closest to the top
  if (firestoreMatches.length > 0) {
    // Prioritize matches that appear earlier in the text
    firestoreMatches.sort((a, b) => a.index - b.index);
    const bestMatch = firestoreMatches[0];
    console.log(`✅ Using Firestore match: ${bestMatch.match} (from "${bestMatch.candidate}" at position ${bestMatch.index})`);
    return bestMatch.match;
  }

  // 3. Fallback: return first candidate (prioritize longer, alphabetic names)
  const sortedCandidates = [...brandCandidates].sort((a, b) => {
    // Prioritize candidates with more letters
    const aLetters = (a.match(/[a-zA-Z]/g) || []).length;
    const bLetters = (b.match(/[a-zA-Z]/g) || []).length;
    if (aLetters !== bLetters) return bLetters - aLetters;

    // Then by length
    return b.length - a.length;
  });

  const bestCandidate = sortedCandidates[0];
  console.log(`⚠️ No Firestore match found, using raw candidate: ${bestCandidate}`);
  return bestCandidate;
}

export async function extractLotNumber(rawText: string): Promise<string> {
  console.log('[extractLotNumber] Extracting lot number from OCR text');

  // Patterns pour différents formats de numéros de lot
  const patterns = [
    // Formats avec préfixe "LOT" ou "L" (priorité la plus haute)
    { regex: /\bL(?:OT)?[:\s-]*([A-Z0-9\-\/\.]{4,})/i, priority: 1, name: 'LOT prefix' },

    // Formats avec "N°", "NO", "No" (deuxième priorité)
    { regex: /\bN[O0°][:\s-]*([A-Z0-9\-\/\.]{4,})\b/i, priority: 2, name: 'NO prefix' },

    // Format DDL (Date de Durabilité Limitée) suivi d'un lot
    { regex: /DDL[:\s]*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}[:\s]*L?[:\s]*([A-Z0-9\-\/\.]{4,})/i, priority: 3, name: 'DDL with lot' },

    // GTIN/EAN (codes-barres)
    { regex: /\b(?:GTIN|EAN)[:\s-]*([0-9]{8,14})\b/i, priority: 4, name: 'GTIN/EAN' },

    // Format "lettres+chiffres" (ex: AB1234, LOT1234, L1234)
    { regex: /\b([A-Z]{1,4}\d{4,})\b/i, priority: 5, name: 'Letters+digits' },

    // Format "chiffres+lettres" (ex: 1234AB, 123456A)
    { regex: /\b(\d{4,}[A-Z]{1,4})\b/i, priority: 6, name: 'Digits+letters' },

    // Format "lettres-chiffres-lettres" (ex: L-1234-A)
    { regex: /\b([A-Z]+[\-\/\.]\d{2,}[\-\/\.]?[A-Z]*)\b/i, priority: 7, name: 'Mixed with separators' },

    // Numéros de lot purement numériques longs (min 6 chiffres)
    { regex: /\b(\d{6,})\b/, priority: 8, name: 'Pure numeric' },

    // Format date qui peut être un lot (DDMMYY, DDMMYYYY)
    { regex: /\b(\d{6}|\d{8})\b/, priority: 9, name: 'Date format' }
  ];

  // Nettoyer le texte mais préserver les séparateurs importants
  const cleaned = rawText.replace(/\s+/g, ' ').trim();
  console.log('[extractLotNumber] Cleaned text:', cleaned);

  // Essayer chaque pattern dans l'ordre de priorité
  for (const { regex, name } of patterns) {
    const match = cleaned.match(regex);
    if (match && match[1] && match[1].length >= 4) {
      console.log(`✅ Lot number found with pattern "${name}": ${match[1]}`);
      return match[1].toUpperCase(); // Normaliser en majuscules
    }
  }

  console.log('[extractLotNumber] No pattern matched, trying fallback...');

  // Fallback plus flexible : chercher n'importe quel token avec lettres ET chiffres
  const tokens = cleaned.split(/[\s,;]+/);
  const fallback = tokens.find((token) => {
    // Nettoyer le token des caractères spéciaux aux extrémités
    const cleanToken = token.replace(/^[^\w]+|[^\w]+$/g, '');

    return (
      cleanToken.length >= 4 && // Au moins 4 caractères
      /[A-Z]/i.test(cleanToken) && // Contient au moins une lettre
      /\d/.test(cleanToken) // Contient au moins un chiffre
    );
  });

  if (fallback) {
    const cleanedFallback = fallback.replace(/^[^\w]+|[^\w]+$/g, '').toUpperCase();
    console.log(`⚠️ Fallback lot number found: ${cleanedFallback}`);
    return cleanedFallback;
  }

  console.log('❌ No lot number found');
  return '';
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