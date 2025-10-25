import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Tesseract, { ImageLike } from 'tesseract.js';
import { OCRResult } from '../types';

const preprocessConfig = {
  resize: { width: 1280 },
  format: SaveFormat.PNG,
  compress: 1
} as const;

export async function preprocessImage(uri: string) {
  const manipulated = await manipulateAsync(uri, [{ resize: preprocessConfig.resize }], {
    compress: preprocessConfig.compress,
    format: preprocessConfig.format
  });

  return manipulated.uri;
}

export async function runTesseract(uri: string): Promise<OCRResult> {
  const worker = await Tesseract.createWorker({ logger: () => undefined });
  await worker.loadLanguage('eng+fra');
  await worker.initialize('eng+fra');

  const result = await worker.recognize(uri as ImageLike);

  await worker.terminate();

  return {
    text: result.data.text,
    confidence: result.data.confidence,
    lines:
      result.data.lines?.map((line) => ({
        content: line.text,
        confidence: line.confidence
      })) ?? []
  };
}

export async function extractLotNumber(rawText: string) {
  const patterns = [
    /\bL(?:OT)?[:\s-]*([A-Z0-9\-]+)/i,
    /\bGTIN[:\s-]*([0-9]{8,14})\b/i,
    /\bN°[:\s-]*([A-Z0-9\-]+)\b/i
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
  const processed = await preprocessImage(uri);
  const result = await runTesseract(processed);
  const lot = await extractLotNumber(result.text);

  return {
    lot,
    result
  };
}
