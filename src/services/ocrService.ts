import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import MlkitOcr from 'react-native-mlkit-ocr';
import { OCRResult } from '../types';

const preprocessConfig = {
  resize: { width: 1280 },
  format: SaveFormat.PNG,
  compress: 1
} as const;

const MLKIT_UNAVAILABLE_MESSAGE =
  'OCR necessita une build native (development ou production). Installez EatSafe via EAS Build pour activer la reconnaissance.';

function ensureMlkitAvailable() {
  if (!MlkitOcr || typeof MlkitOcr.detectFromUri !== 'function') {
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
  const blocks = await MlkitOcr.detectFromUri(uri);

  const text = blocks.map((block) => block.text).join('\n');
  const lines = blocks.flatMap((block) =>
    block.lines.map((line) => ({
      content: line.text
    }))
  );

  return {
    text,
    lines
  };
}

export async function extractLotNumber(rawText: string) {
  const patterns = [
    /\bL(?:OT)?[:\s-]*([A-Z0-9\-]+)/i,
    /\bGTIN[:\s-]*([0-9]{8,14})\b/i,
    /\bN[O0][:\s-]*([A-Z0-9\-]+)\b/i
  ];

  const cleaned = rawText.replace(/\s+/g, ' ').trim();

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return match[1];
    }
  }

  const fallback = cleaned.split(' ').find((token) => token.length >= 6 && /\d/.test(token));
  return fallback ?? '';
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
