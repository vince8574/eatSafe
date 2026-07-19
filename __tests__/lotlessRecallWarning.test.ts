// Rappels FDA/USDA SANS numéros de lot publiés (cas réel : Taylor Fresh Foods,
// juillet 2026 — laitue iceberg/Cyclospora, lots dans un PDF, code_info vide).
// L'app ne peut pas asserter "RAPPELÉ" (aucun lot à comparer) mais doit émettre
// un statut 'warning' quand la marque ET le type de produit (nom résolu par le
// code-barres via Open Food Facts) recoupent le rappel.
import { recallWarnsProduct, getRecallStatus } from '../src/utils/lotMatcher';
import { RecallRecord, ScannedProduct } from '../src/types';

const taylorRecall: RecallRecord = {
  id: 'F-2026-1234',
  title: 'Taylor Fresh Foods recalls iceberg lettuce from Central Mexico',
  description:
    'BLEND LETT/ROM 50/50 — shredded iceberg lettuce recalled because of possible Cyclospora health risk',
  lotNumbers: [], // la FDA n'a rien publié dans code_info
  codeInfo: 'Best if Used By 7/16/2026 - 8/1/2026',
  brand: 'Taylor Fresh Foods',
  productCategory: 'Iceberg lettuce',
  country: 'US',
  publishedAt: '2026-07-17'
};

const scannedLettuce: ScannedProduct = {
  id: 'p1',
  brand: 'Taylor Fresh Foods',
  lotNumber: 'TF20260710',
  productName: 'Shredded Iceberg Lettuce',
  scannedAt: Date.now(),
  recallStatus: 'unknown'
};

describe('recallWarnsProduct (rappels sans lots publiés)', () => {
  it('avertit quand marque + type de produit recoupent un rappel sans lots', () => {
    expect(recallWarnsProduct(scannedLettuce, taylorRecall)).toBe(true);
  });

  it("n'avertit PAS pour un autre produit de la même marque (pas de recoupement)", () => {
    const salsa = { ...scannedLettuce, productName: 'Chunky Salsa Dip' };
    expect(recallWarnsProduct(salsa, taylorRecall)).toBe(false);
  });

  it("n'avertit PAS quand la marque diffère", () => {
    const other = { ...scannedLettuce, brand: 'Dole' };
    expect(recallWarnsProduct(other, taylorRecall)).toBe(false);
  });

  it("n'avertit PAS sans nom de produit (scan sans code-barres)", () => {
    const noName = { ...scannedLettuce, productName: undefined };
    expect(recallWarnsProduct(noName, taylorRecall)).toBe(false);
  });

  it("n'avertit PAS quand le rappel a des lots publiés (le match par lot tranche)", () => {
    const withLots = { ...taylorRecall, lotNumbers: ['ABC123'] };
    expect(recallWarnsProduct(scannedLettuce, withLots)).toBe(false);
  });

  it("n'avertit PAS sur des mots génériques seuls (fresh/foods/pack…)", () => {
    const generic = { ...scannedLettuce, productName: 'Fresh Food Pack' };
    expect(recallWarnsProduct(generic, taylorRecall)).toBe(false);
  });

  it('matche singulier/pluriel (lettuces ↔ lettuce)', () => {
    const plural = { ...scannedLettuce, productName: 'Iceberg Lettuces Mix' };
    expect(recallWarnsProduct(plural, taylorRecall)).toBe(true);
  });
});

// Données RÉELLES du rappel FDA de juillet 2026 (page "Taylor Fresh Foods
// Recalls Iceberg Lettuce from Central Mexico Because of Possible Health
// Risk") : firme = raison sociale "Taylor Fresh Foods" (≠ marque consommateur
// "Taylor Farms" renvoyée par Open Food Facts), descriptions food-service
// abrégées ("BLEND LETT/ROM 50/50 NOCLR 4/5#"), lots publiés uniquement en
// PDF (code_info vide), identification par dates "Best if Used By".
describe('cas réel FDA juillet 2026 — Taylor Fresh Foods / iceberg / Cyclospora', () => {
  const fdaJuly2026: RecallRecord = {
    id: 'F-2026-TAYLOR',
    title: 'BLEND LETT/ROM 50/50 NOCLR 4/5#; LETTUCE CHOP 4/5#; shredded iceberg product',
    description:
      'This action was prompted by the multistate Cyclospora outbreak. Iceberg lettuce from Central Mexico, possible health risk. Distributed June 29th thru July 16th in AL, AR, CT, FL, GA, IA, IL, IN, KS, KY, LA, MA, MD, MI, MO, MS, NC, NH, NJ, OH, OK, PA, SC, TN, TX, VA, and WI.',
    lotNumbers: [], // les lots sont dans un PDF lié, pas dans code_info
    codeInfo: 'Best if Used By 7/16/2026 - 8/1/2026',
    brand: 'Taylor Fresh Foods, Inc.',
    productCategory: 'BLEND LETT/ROM 50/50 NOCLR 4/5#',
    country: 'US',
    publishedAt: '2026-07-17',
    link: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/taylor-fresh-foods-recalls-iceberg-lettuce-central-mexico-because-possible-health-risk'
  };

  it("avertit malgré raison sociale ≠ marque consommateur (Taylor Fresh Foods ↔ Taylor Farms)", () => {
    const offProduct = { brand: 'Taylor Farms', productName: 'Shredded Iceberg Lettuce' };
    expect(recallWarnsProduct(offProduct, fdaJuly2026)).toBe(true);
  });

  it('avertit sur les descriptions food-service abrégées (LETTUCE CHOP)', () => {
    const offProduct = { brand: 'Taylor Farms', productName: 'Chopped Lettuce Salad' };
    expect(recallWarnsProduct(offProduct, fdaJuly2026)).toBe(true);
  });

  it("statut 'warning' avec référence + codeInfo (Best if Used By) exposés", () => {
    const scanned: ScannedProduct = {
      id: 'p-real',
      brand: 'Taylor Farms',
      lotNumber: 'TFRS999X',
      productName: 'Shredded Iceberg Lettuce',
      scannedAt: Date.now(),
      recallStatus: 'unknown'
    };
    const result = getRecallStatus(scanned, [fdaJuly2026]);
    expect(result.status).toBe('warning');
    expect(result.recallReference).toBe('F-2026-TAYLOR');
  });

  it("un token de marque GÉNÉRIQUE ne suffit pas (Great Value ↔ Great Lakes Cheese)", () => {
    const cheeseRecall: RecallRecord = {
      ...fdaJuly2026,
      id: 'F-2026-CHEESE',
      title: 'Shredded cheddar cheese 8oz bags',
      description: 'Possible Listeria contamination in shredded cheese',
      brand: 'Great Lakes Cheese Co'
    };
    const walmart = { brand: 'Great Value', productName: 'Shredded Cheddar Cheese' };
    expect(recallWarnsProduct(walmart, cheeseRecall)).toBe(false);
  });

  it("un produit Taylor Farms SANS rapport (salsa) n'est pas flagué", () => {
    const salsa = { brand: 'Taylor Farms', productName: 'Chunky Salsa' };
    expect(recallWarnsProduct(salsa, fdaJuly2026)).toBe(false);
  });
});

describe('getRecallStatus avec repli warning', () => {
  it("renvoie 'warning' + référence quand seul le repli sans-lot matche", () => {
    const result = getRecallStatus(scannedLettuce, [taylorRecall]);
    expect(result.status).toBe('warning');
    expect(result.recallReference).toBe('F-2026-1234');
  });

  it("'recalled' (match par lot) prime sur 'warning'", () => {
    const lotRecall: RecallRecord = {
      ...taylorRecall,
      id: 'F-2026-9999',
      lotNumbers: ['TF20260710']
    };
    const result = getRecallStatus(scannedLettuce, [taylorRecall, lotRecall]);
    expect(result.status).toBe('recalled');
    expect(result.recallReference).toBe('F-2026-9999');
  });

  it("renvoie 'safe' quand ni lot ni recoupement produit", () => {
    const unrelated = { ...scannedLettuce, brand: 'Kraft', productName: 'Cheddar Cheese' };
    const result = getRecallStatus(unrelated, [taylorRecall]);
    expect(result.status).toBe('safe');
  });
});
