// Mock native / Firebase-backed siblings so ocrService can be imported in node.
// extractLotNumber is pure text->lot; it never calls these at runtime here.
jest.mock('@react-native-ml-kit/text-recognition', () => ({
  __esModule: true,
  default: { recognize: jest.fn() }
}));
jest.mock('../src/services/firestoreBrandsService', () => ({
  searchBrands: jest.fn().mockResolvedValue([])
}));
jest.mock('../src/services/visionFallbackService', () => ({
  tryVisionFallback: jest.fn(),
  runVisionFallback: jest.fn(),
  isVisionAvailable: jest.fn(),
  assessOcrQuality: jest.fn()
}));
jest.mock('../src/services/claudeOcrFallback', () => ({
  tryClaudeFallback: jest.fn(),
  isClaudeAvailable: jest.fn(),
  // Faithful enough for these inputs (no EMB / sanitary marks present).
  stripNonLotMarkings: (s: string) => s
}));

import { extractLotNumber } from '../src/services/ocrService';

describe('extractLotNumber — FR butter stamp (149 vs L10)', () => {
  // Reported failure: app returned the julian production day "149" instead of
  // the EU "L"-marked lot "L10". Layout: date / julian-day TIME / L-lot.
  it('returns the L-marked lot, not the julian day between date and time', async () => {
    expect(await extractLotNumber('S28/07/26 149 09:28 L10')).toBe('L10');
  });

  // Clean date (no glued "S") => the can-stamp heuristic DOES fire and grabs the
  // julian day "149" with a big bonus. The L-lot must still win.
  it('L-lot beats the julian day even when the can-stamp heuristic fires', async () => {
    expect(await extractLotNumber('28/07/26 149 09:28 L10')).toBe('L10');
  });
});

describe('extractLotNumber — regression guards (documented real cases)', () => {
  it('can-stamp: lot stays the code BETWEEN date and time', async () => {
    expect(await extractLotNumber('01/01/29 Q353 12:16')).toBe('Q353');
  });

  it('glued L code is read whole', async () => {
    expect(await extractLotNumber('L26008')).toBe('L26008');
  });

  it('composite hyphen L code is read whole', async () => {
    expect(await extractLotNumber('L331-4003263405')).toBe('L331-4003263405');
  });

  it('single-digit L (line marker) is NOT returned as the lot', async () => {
    const r = await extractLotNumber('07/27/2026 19:54 F128 L3 M2');
    expect(r).not.toBe('L3');
  });
});
