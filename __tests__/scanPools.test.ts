// Deux réserves de scans, aux règles OPPOSÉES :
//  - l'abonnement donne une réserve MENSUELLE, remise à l'inclus chaque mois,
//    ce qui n'est pas consommé étant perdu ;
//  - les packs achetés n'expirent JAMAIS.
// Elles ne peuvent donc pas partager un compteur unique — on ne saurait plus,
// en fin de mois, ce qui relève de l'abonnement ou du pack. Ce test fige les
// règles de répartition, de consommation et de renouvellement.
import {
  currentScanPeriodKey,
  splitPools,
  consumeFromPools,
  renewMonthlyPool,
  totalScansAvailable
} from '../src/utils/scanPools';

// Sur un document ANTÉRIEUR à la séparation, le surplus au-delà de l'inclus
// correspond aux packs achetés.
const split = (scansIncluded: number, scansRemaining: number, packCredits?: number) =>
  splitPools({ scansIncluded, scansRemaining, packCredits });

const consume = consumeFromPools;

const renew = renewMonthlyPool;

describe('clé de période mensuelle', () => {
  test('mois sur deux chiffres', () => {
    expect(currentScanPeriodKey(new Date(2026, 0, 5))).toBe('2026-01');
    expect(currentScanPeriodKey(new Date(2026, 11, 31))).toBe('2026-12');
  });
});

describe('migration d’un document antérieur à la séparation', () => {
  test('le surplus au-delà de l’inclus devient du crédit de pack', () => {
    expect(split(100, 130)).toEqual({ scansRemaining: 100, packCredits: 30 });
  });

  test('sans surplus, aucun crédit de pack n’est inventé', () => {
    expect(split(100, 40)).toEqual({ scansRemaining: 40, packCredits: 0 });
  });

  test('un document déjà séparé est laissé tel quel', () => {
    expect(split(100, 40, 25)).toEqual({ scansRemaining: 40, packCredits: 25 });
  });
});

describe('consommation', () => {
  test('entame le mensuel AVANT les packs', () => {
    // L'inverse ferait perdre à l'utilisateur ce qu'il a PAYÉ pendant qu'il
    // laisse périmer ce qui est inclus dans son abonnement.
    expect(consume({ scansRemaining: 10, packCredits: 50 }, 4)).toEqual({
      scansRemaining: 6,
      packCredits: 50
    });
  });

  test('déborde sur les packs une fois le mensuel épuisé', () => {
    expect(consume({ scansRemaining: 3, packCredits: 50 }, 5)).toEqual({
      scansRemaining: 0,
      packCredits: 48
    });
  });

  test('ne descend jamais sous zéro', () => {
    expect(consume({ scansRemaining: 1, packCredits: 1 }, 10)).toEqual({
      scansRemaining: 0,
      packCredits: 0
    });
  });
});

describe('renouvellement mensuel', () => {
  test('les scans mensuels non consommés sont PERDUS, pas reportés', () => {
    expect(renew({ scansRemaining: 80, packCredits: 0 }, 100).scansRemaining).toBe(100);
  });

  test('les crédits de packs SURVIVENT au renouvellement', () => {
    expect(renew({ scansRemaining: 0, packCredits: 37 }, 100)).toEqual({
      scansRemaining: 100,
      packCredits: 37
    });
  });

  test('scénario complet : quota épuisé, pack acheté, mois suivant', () => {
    const included = 100;
    let pools = { scansRemaining: included, packCredits: 0 };

    pools = consume(pools, 100);
    expect(totalScansAvailable(pools)).toBe(0); // → plus rien, même en manuel

    pools = { ...pools, packCredits: pools.packCredits + 50 }; // achat d'un pack
    pools = consume(pools, 20);
    expect(pools).toEqual({ scansRemaining: 0, packCredits: 30 });

    pools = renew(pools, included); // mois suivant
    expect(pools).toEqual({ scansRemaining: 100, packCredits: 30 });
    expect(totalScansAvailable(pools)).toBe(130);
  });
});

describe('totalScansAvailable', () => {
  test('additionne les deux réserves et ignore les négatifs', () => {
    expect(totalScansAvailable({ scansRemaining: 10, packCredits: 5 })).toBe(15);
    expect(totalScansAvailable({ scansRemaining: -3, packCredits: 5 })).toBe(5);
    expect(totalScansAvailable(null)).toBe(0);
  });
});
