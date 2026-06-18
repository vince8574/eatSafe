/**
 * Corpus de RÉGRESSION pour le matching produit ↔ rappel (safety-critical).
 *
 * Objectif : NE JAMAIS déclencher une fausse alerte "RAPPELÉ" sur un lot court
 * purement numérique qui entre en collision avec un rappel US sans rapport.
 * Cas réel : thon FR "Petit Navire" lot "25041" + un rappel FDA lot "25041"
 * SANS marque → fausse notification "NE CONSOMMEZ PAS".
 *
 * lotMatcher est pur (n'importe que des types) → pas de mock natif nécessaire.
 */
import { recallMatchesProduct, isDistinctiveLot } from '../src/utils/lotMatcher';

describe('recallMatchesProduct — anti faux positif', () => {
  it('NE matche PAS un lot court numérique vs un rappel SANS marque (Petit Navire 25041)', () => {
    expect(
      recallMatchesProduct(
        { brand: 'Petit Navire', lotNumber: '25041' },
        { brand: '', lotNumbers: ['25041'] }
      )
    ).toBe(false);
  });

  it('NE matche PAS un lot court numérique vs un rappel d\'une AUTRE marque', () => {
    expect(
      recallMatchesProduct(
        { brand: 'Petit Navire', lotNumber: '25041' },
        { brand: 'Some US Dairy Co', lotNumbers: ['25041'] }
      )
    ).toBe(false);
  });

  it('NE matche PAS un lot court numérique vs marque produit inconnue', () => {
    expect(
      recallMatchesProduct(
        { brand: '', lotNumber: '25041' },
        { brand: '', lotNumbers: ['25041'] }
      )
    ).toBe(false);
  });

  it('matche un lot court numérique SI la marque corrobore (même marque)', () => {
    expect(
      recallMatchesProduct(
        { brand: 'Petit Navire', lotNumber: '25041' },
        { brand: 'Petit Navire', lotNumbers: ['25041'] }
      )
    ).toBe(true);
  });

  it('matche un lot LONG numérique (>=6) vs rappel sans marque (assez distinctif)', () => {
    expect(
      recallMatchesProduct(
        { brand: 'Petit Navire', lotNumber: '2504199' },
        { brand: '', lotNumbers: ['2504199'] }
      )
    ).toBe(true);
  });

  it('matche un lot ALPHANUMÉRIQUE distinctif vs rappel sans marque', () => {
    expect(
      recallMatchesProduct(
        { brand: 'Acme', lotNumber: 'L605118B' },
        { brand: '', lotNumbers: ['L605118B'] }
      )
    ).toBe(true);
  });

  it('NE matche PAS un rappel SANS numéro de lot (marque seule)', () => {
    expect(
      recallMatchesProduct(
        { brand: 'Kraft', lotNumber: 'ABC123' },
        { brand: 'Kraft', lotNumbers: [] }
      )
    ).toBe(false);
  });
});

describe('isDistinctiveLot', () => {
  it.each(['25041', '00713', '16104', '1234', '999'])('rejette le numérique court "%s"', (lot) => {
    expect(isDistinctiveLot(lot)).toBe(false);
  });

  it.each(['250419', '1234567', 'L605118B', 'A045', '615E2VSN'])(
    'accepte le lot distinctif "%s"',
    (lot) => {
      expect(isDistinctiveLot(lot)).toBe(true);
    }
  );
});
