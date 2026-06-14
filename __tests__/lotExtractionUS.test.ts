/**
 * Corpus de RÉGRESSION US — formats de lot américains RÉELS.
 *
 * Construit depuis l'API openFDA food enforcement (champ `code_info` des
 * rappels FDA) : ce sont de vrais codes de production US, pas des inventions.
 * Complète lotExtraction.test.ts (cas FR terrain). Indispensable car on ne peut
 * pas tester sur des produits américains depuis la France — ce corpus exerce
 * la couche d'extraction sur les formats/dates/marquages spécifiquement US.
 *
 * Différences US vs FR couvertes ici :
 *   - lots purement numériques ("334386") et "lettre+chiffres" Julian ("S394260")
 *   - dates US "MM/DD/YYYY" et "BEST BY 29 JAN 2026" (à rejeter)
 *   - code-barres UPC à 12 chiffres (à rejeter, vs EAN-13 en Europe)
 *   - vocabulaire d'étiquette US ("About 2.5 servings" → faux lot "ABOUT25")
 */

jest.mock('@react-native-ml-kit/text-recognition', () => ({ __esModule: true, default: { recognize: jest.fn() } }));
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { PNG: 'png', JPEG: 'jpeg' } }));
jest.mock('expo-file-system/legacy', () => ({ readAsStringAsync: jest.fn(), deleteAsync: jest.fn(), EncodingType: { Base64: 'base64' } }));
jest.mock('../src/services/firestoreBrandsService', () => ({ searchBrands: jest.fn(async () => []) }));
jest.mock('../src/services/visionFallbackService', () => ({
  tryVisionFallback: jest.fn(),
  runVisionFallback: jest.fn(),
  isVisionAvailable: jest.fn(() => false),
  assessOcrQuality: jest.fn()
}));
jest.mock('../src/services/appCheckService', () => ({ getAppCheckToken: jest.fn(async () => null) }));

import { extractLotNumber, looksLikeNonLot } from '../src/services/ocrService';

// Le vrai lot US doit sortir (signal fort : mot LOT, ou format batch reconnaissable).
const MUST_EXTRACT: Array<{ name: string; ocr: string; expected: string }> = [
  {
    name: 'Lot alphanumérique digits+letter+digits (FDA UT)',
    ocr: 'LOT 0325357B201\nBEST BY 05 JAN 2026',
    expected: '0325357B201'
  },
  {
    name: 'Lot Julian "lettre+6 chiffres" (FDA CA)',
    ocr: 'BEST IF USED BY 07/31/2027\nLOT S394260',
    expected: 'S394260'
  },
  {
    name: 'Lot digits+letter+digits (FDA WI)',
    ocr: 'LOT 110625F06\nEXP 08/06/27',
    expected: '110625F06'
  },
  {
    name: 'Lot "lettres+chiffres" court (FDA AZ)',
    ocr: 'Lot Number SL0925\nExpiry Date 09/2027',
    expected: 'SL0925'
  },
  {
    name: 'Lot année-tiret-série (FDA WI)',
    ocr: 'LOT 2026-51127\nBEST BY 07/04/2027',
    expected: '2026-51127'
  },
  {
    name: 'Lot purement numérique avec mot-clé (FDA CA)',
    ocr: 'USE BY 06/20/2026\nLOT: 334386',
    expected: '334386'
  },
  {
    name: 'Code FDA Julian sans mot-clé (lettres+chiffres+lettre)',
    ocr: 'WN012117E\nGUARANTEED FRESH UNTIL APR 22',
    expected: 'WN012117E'
  }
];

// Ne JAMAIS renvoyer ces faux positifs spécifiquement US.
const MUST_NOT_RETURN: Array<{ name: string; ocr: string; forbidden: RegExp }> = [
  {
    name: 'Date seule "BEST BY 08/06/27" (US MM/DD/YY)',
    ocr: 'BEST BY 08/06/27',
    forbidden: /0806|080627/
  },
  {
    name: 'Date à nom de mois "29 JAN 2026"',
    ocr: 'Production Date: 29 JAN 2026 and 12 APR 2026',
    forbidden: /JAN|APR/
  },
  {
    name: 'Date "BEST BY 23/MAR/2027 GY"',
    ocr: 'BEST BY 23/MAR/2027 GY',
    forbidden: /MAR2027|232027/
  },
  {
    name: 'Code-barres UPC 12 chiffres',
    ocr: 'UPC: 726191018548\nBEST BY 10/15/2026',
    forbidden: /726191018548/
  },
  {
    name: 'Vocabulaire nutrition US "About 2.5 servings"',
    ocr: 'About 2.5 servings per container\nBEST BY MAR 2026',
    forbidden: /ABOUT/
  },
  {
    name: 'Marquage USDA "EST. 38" seul',
    ocr: 'EST. 38\nBEST BY 01/05/2026',
    forbidden: /EST38|^38$/
  }
];

describe('extractLotNumber — corpus US (formats américains réels FDA)', () => {
  describe('doit extraire le vrai lot US', () => {
    for (const c of MUST_EXTRACT) {
      it(c.name, async () => {
        const got = await extractLotNumber(c.ocr);
        expect(got.toUpperCase()).toBe(c.expected.toUpperCase());
      });
    }
  });

  describe('ne doit jamais renvoyer le faux positif US', () => {
    for (const c of MUST_NOT_RETURN) {
      it(c.name, async () => {
        const got = (await extractLotNumber(c.ocr)).toUpperCase();
        expect(got).not.toMatch(c.forbidden);
      });
    }
  });
});

describe('looksLikeNonLot — garde-fous US', () => {
  it.each([
    '726191018548',         // UPC-12 US
    '08/06/27', '08/06/2027' // dates US MM/DD
  ])('rejette "%s"', (token) => {
    expect(looksLikeNonLot(token)).toBe(true);
  });

  it.each(['S394260', 'SL0925', '0325357B201', 'WN012117E', '334386', '2026-51127'])(
    'accepte le vrai lot US "%s"',
    (token) => {
      expect(looksLikeNonLot(token)).toBe(false);
    }
  );
});
