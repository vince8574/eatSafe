// Extraction des numéros de lot depuis le champ `code_info` de la FDA.
//
// Régression réelle : "LOT: 60D0924 BEST BEFORE: 4/2027" (Amy's Kitchen, rappel
// actif) produisait le lot "60D0924 BEST BEFORE". Le match EXACT échouait, et le
// repli partiel exige ≥8 caractères alors que le lot en fait 7 → le rappel
// n'était jamais détecté, ni depuis la modale de scan ni à la confirmation.
import { extractFdaLotNumbers } from '../src/services/apiService';
import { extractBestByDate, bestByInRecallWindow } from '../src/utils/bestByDate';

describe('extractFdaLotNumbers — coupe la prose qui suit le lot', () => {
  test('cas Amy’s Kitchen : le lot ne doit pas emporter "BEST BEFORE"', () => {
    expect(extractFdaLotNumbers('LOT: 60D0924 BEST BEFORE: 4/2027')).toEqual(['60D0924']);
  });

  test('variantes de libellés de date', () => {
    expect(extractFdaLotNumbers('Lot 6040 01 Best by Date Feb 09 2028')).toContain('6040 01');
    expect(extractFdaLotNumbers('Lot Code: 051626-1 Use By May 2027')).toContain('051626-1');
    expect(extractFdaLotNumbers('lot: 25/08001 Expiration date: 02-11-2028')).toContain('25/08001');
  });

  test('plusieurs lots séparés par des virgules restent séparés', () => {
    const lots = extractFdaLotNumbers('Lots 12255, 22265, 12415 Best Before 01/2027');
    expect(lots).toEqual(expect.arrayContaining(['12255', '22265', '12415']));
    // Aucun lot ne doit contenir de mot parasite
    lots.forEach((l) => expect(l).not.toMatch(/BEST|BEFORE|DATE/i));
  });

  test('n’émet jamais un mot-clé seul comme numéro de lot', () => {
    for (const lot of extractFdaLotNumbers('LOT: 60D0924 BEST BEFORE: 4/2027')) {
      expect(lot).not.toMatch(/^(BEST|BEFORE|DATE|USE|SELL|UPC)$/i);
    }
  });

  // Des lots de 3 caractères existent réellement dans la fenêtre FDA courante
  // (216 / 687 / 506 / 013 chez Imu-Tek, Jack & The Green Sprouts, Inner Waymark).
  // Ils doivent survivre à l'extraction — c'est la phase de MATCHING qui exige
  // ensuite une marque concordante, pas l'extraction qui les jette.
  test('un lot de 3 caractères est conservé', () => {
    expect(extractFdaLotNumbers('Lot 216 Best By 10/2026')).toContain('216');
    expect(extractFdaLotNumbers('Lot: 013')).toContain('013'); // le zéro de tête est gardé
    expect(extractFdaLotNumbers('Lots 216, 687, 506')).toEqual(
      expect.arrayContaining(['216', '687', '506'])
    );
  });

  test('champ vide ou sans lot → aucun résultat', () => {
    expect(extractFdaLotNumbers(undefined)).toEqual([]);
    expect(extractFdaLotNumbers('UPC 7 26191 01854 8 BEST BY 10/15/2026')).toEqual([]);
  });

  // Sur 1000 rappels FDA en cours, 173 des 834 « lots » extraits n'avaient AUCUN
  // chiffre — et pas un seul n'était un vrai lot : uniquement de la prose captée
  // après le mot « lot ». D'où l'exigence d'au moins un chiffre.
  test('la prose captée après le mot « lot » n’est pas un lot', () => {
    for (const prose of [
      'No lot codes.',
      'Lot Numbers not provided',
      'Lot code on label',
      'Lots shipped to distributors'
    ]) {
      for (const lot of extractFdaLotNumbers(prose)) {
        expect(lot).toMatch(/\d/);
      }
    }
    expect(extractFdaLotNumbers('No lot codes.')).toEqual([]);
  });
});

describe('extractFdaLotNumbers — le lot extrait matche la saisie utilisateur', () => {
  // Reproduit la normalisation utilisée au matching (ScanLotScreen / candidateMatcher).
  const norm = (s: string) => s.replace(/\s+/g, '').replace(/[-_.\/]/g, '').toUpperCase();

  test('un utilisateur qui saisit 60D0924 obtient un match EXACT', () => {
    const [lot] = extractFdaLotNumbers('LOT: 60D0924 BEST BEFORE: 4/2027');
    expect(norm(lot)).toBe(norm('60D0924'));
  });
});

// Le MÊME `code_info` sert aux deux modes : par numéro de lot, et par date pour
// les produits qui n'en portent pas. Couper la prose du lot ne doit rien retirer
// au mode date, qui lit ce champ tel quel.
describe('mode « pas de numéro de lot » — dates lues dans les mêmes code_info FDA', () => {
  test('Amy’s : la date imprimée tombe dans la fenêtre du rappel', () => {
    const ci = 'LOT: 60D0924 BEST BEFORE: 4/2027';
    expect(bestByInRecallWindow('2027-04-01', ci)).toBe(true);
    expect(bestByInRecallWindow('2026-04-01', ci)).toBe(false); // mauvaise année
  });

  test('myrtilles bio : "Best by Date Feb 09 2028"', () => {
    const ci = 'Lot 6040 01 Best by Date Feb 09 2028';
    expect(bestByInRecallWindow('2028-02-09', ci)).toBe(true);
    expect(bestByInRecallWindow('2028-02-10', ci)).toBe(false);
  });

  test('plage "through" en codes compacts (Brooklyn Roasting)', () => {
    const ci = 'Best By codes range: 063026 through 093026';
    expect(bestByInRecallWindow('2026-08-03', ci)).toBe(true); // dans 30/06 → 30/09
    expect(bestByInRecallWindow('2026-10-05', ci)).toBe(false);
  });

  test('la date scannée est lue quel que soit le format imprimé', () => {
    expect(extractBestByDate('BEST IF USED BY 08/03/2026')?.iso).toBe('2026-08-03');
    expect(extractBestByDate('USE BY FEB 09 2028')?.iso).toBe('2028-02-09');
  });

  // Beaucoup d'emballages (conserves, surgelés) n'impriment que le mois.
  test('mois/année seuls : lus, et couvrant tout le mois', () => {
    const parsed = extractBestByDate('BEST BEFORE 4/2027');
    expect(parsed?.iso).toBe('2027-04');
    expect(parsed?.precision).toBe('month');
    expect(extractBestByDate('EXP APR 2027')?.iso).toBe('2027-04');
    // Ne doit PAS confondre le "03/2026" contenu dans une date complète.
    expect(extractBestByDate('BEST IF USED BY 08/03/2026')?.iso).toBe('2026-08-03');
  });

  test('date complète scannée vs rappel qui n’annonce que le mois', () => {
    const ci = 'LOT: 60D0924 BEST BEFORE: 4/2027';
    expect(bestByInRecallWindow('2027-04-15', ci)).toBe(true); // dans le mois rappelé
    expect(bestByInRecallWindow('2027-05-15', ci)).toBe(false);
  });
});
