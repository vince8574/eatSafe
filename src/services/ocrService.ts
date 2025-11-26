import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { OCRResult } from '../types';

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
  
  // ML Kit Vision retourne un objet avec text et blocks
  const result = await TextRecognition.recognize(uri);

  // Extraction du texte complet
  const text = result.text;
  
  // Extraction des lignes avec leur contenu
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
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Prend les premières lignes qui contiennent probablement la marque
  // Critères: 3-30 caractères, commence par majuscule, pas de chiffres dominants
  const brandCandidates = lines
    .filter(line => line.length >= 3 && line.length <= 30)
    .filter(line => /^[A-ZÀ-ÿ]/.test(line)) // Commence par majuscule (avec accents)
    .filter(line => {
      const digitCount = (line.match(/\d/g) || []).length;
      return digitCount < line.length / 2; // Moins de 50% de chiffres
    });
  
  return brandCandidates[0] || '';
}

export async function extractLotNumber(rawText: string): Promise<string> {
  // Patterns avec priorité pour détecter les numéros de lot
  const patterns = [
    { regex: /\bL(?:OT)?[:\s-]*([A-Z0-9\-]{4,})/i, priority: 1 },
    { regex: /\bGTIN[:\s-]*([0-9]{8,14})\b/i, priority: 2 },
    { regex: /\bN[O0][:\s-]*([A-Z0-9\-]{4,})\b/i, priority: 3 },
    { regex: /\b([A-Z]{2,}\d{4,})\b/, priority: 4 }, // Pattern marque+chiffres
    { regex: /\b(\d{8,})\b/, priority: 5 } // Code barres/long numérique
  ];

  const cleaned = rawText.replace(/\s+/g, ' ').trim();

  // Essai avec patterns prioritaires
  for (const { regex } of patterns) {
    const match = cleaned.match(regex);
    if (match && match[1] && match[1].length >= 4) {
      return match[1];
    }
  }

  // Fallback: cherche un token avec mix lettres/chiffres
  const fallback = cleaned.split(' ').find((token) => 
    token.length >= 6 && /[A-Z].*\d|\d.*[A-Z]/i.test(token)
  );
  
  return fallback ?? '';
}

export async function performOcrForBrand(uri: string) {
  ensureMlkitAvailable();
  const processed = await preprocessImage(uri);
  
  try {
    const result = await runMlkit(processed);
    const brand = await extractBrand(result.text);

    return {
      brand,
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

export async function performOcr(uri: string) {
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