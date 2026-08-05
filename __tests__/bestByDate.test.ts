// Lecture d'une date "Best/Use By" depuis un texte OCR + appartenance à la
// fenêtre de dates d'un rappel FDA/USDA (produits SANS numéro de lot).
import { extractBestByDate, bestByInRecallWindow } from '../src/utils/bestByDate';

describe('extractBestByDate', () => {
  const iso = (t: string) => extractBestByDate(t)?.iso ?? null;

  test('formats numériques US courants', () => {
    expect(iso('BEST IF USED BY 08/03/2026')).toBe('2026-08-03');
    expect(iso('USE BY 8/3/26')).toBe('2026-08-03');
    expect(iso('SELL BY 08-03-2026')).toBe('2026-08-03');
    expect(iso('EXP 2026-08-03')).toBe('2026-08-03');
  });

  test('mois en toutes lettres', () => {
    expect(iso('USE BY AUG 03 2026')).toBe('2026-08-03');
    expect(iso('BEST BEFORE 3 AUG 2026')).toBe('2026-08-03');
    expect(iso('BEST IF USED BY AUGUST 3, 2026')).toBe('2026-08-03');
  });

  test('compact 6 chiffres MMDDYY', () => {
    expect(iso('BB 080326')).toBe('2026-08-03');
  });

  test('choisit la date APRÈS le libellé quand il y en a plusieurs', () => {
    expect(iso('MFG 01/01/2026  USE BY 08/03/2026')).toBe('2026-08-03');
  });

  test('inverse jour/mois si le 1er nombre > 12', () => {
    expect(iso('USE BY 03/13/2026')).toBe('2026-03-13'); // 13 = jour
  });

  test('aucune date → null', () => {
    expect(extractBestByDate('LOT TFRS223B')).toBeNull();
    expect(extractBestByDate('')).toBeNull();
  });
});

describe('bestByInRecallWindow', () => {
  test('plage "Best if Used By X - Y" (cas Taylor Farms)', () => {
    const ci = 'Best if Used By 7/16/2026 - 8/3/2026';
    expect(bestByInRecallWindow('2026-07-20', ci)).toBe(true);
    expect(bestByInRecallWindow('2026-07-16', ci)).toBe(true); // borne basse
    expect(bestByInRecallWindow('2026-08-03', ci)).toBe(true); // borne haute
    expect(bestByInRecallWindow('2026-08-10', ci)).toBe(false);
    expect(bestByInRecallWindow('2026-07-01', ci)).toBe(false);
  });

  test('plage "through" avec codes compacts MMDDYY', () => {
    const ci = 'Best By codes range: 063026 through 093026';
    expect(bestByInRecallWindow('2026-08-03', ci)).toBe(true); // 06/30 → 09/30
    expect(bestByInRecallWindow('2026-10-05', ci)).toBe(false);
  });

  test('date unique "Use by: 04/28/2025"', () => {
    const ci = 'TFILC111A001 Use by: 04/28/2025';
    expect(bestByInRecallWindow('2025-04-28', ci)).toBe(true);
    expect(bestByInRecallWindow('2025-04-29', ci)).toBe(false);
  });

  test('pas de correspondance / champs vides', () => {
    expect(bestByInRecallWindow('2026-01-01', 'lot: 25/08001 Expiration date: 02-11-2028')).toBe(false);
    expect(bestByInRecallWindow('', 'Best if Used By 7/16/2026 - 8/3/2026')).toBe(false);
    expect(bestByInRecallWindow('2026-07-20', undefined)).toBe(false);
  });
});
