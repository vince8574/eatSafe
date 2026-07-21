// Alerte "rappel possible" sur COMMUNIQUÉ FDA sans numéro de lot.
//
// Politique (objectif produit : alerter dès le communiqué, cas réel Taylor
// Fresh Foods juil. 2026 — lots/dates publiés seulement dans la page) :
// - SOURCE : uniquement le flux RSS officiel des communiqués ('fda-press').
//   Les ~2 400 enregistrements enforcement sans lot n'alertent JAMAIS
//   (incident du 20/07 : notifications en série sur Kraft/Nestlé/Coca/"U").
// - RÉCENCE : communiqué de moins de 60 jours.
// - MARQUE : égalité exacte OU token distinctif partagé (≥4 lettres, hors
//   termes d'entreprise). Jamais de sous-chaîne.
// - Alerte au NIVEAU MARQUE : toute la gamme passe "à vérifier" (ambre), avec
//   les infos publiées (dates "Best if Used By") affichées. Jamais rouge.
import { recallWarnsProduct, getRecallStatus } from '../src/utils/lotMatcher';
import { extractPressBrand } from '../src/services/apiService';
import { RecallRecord, ScannedProduct } from '../src/types';

const RECENT = new Date(Date.now() - 5 * 24 * 3600 * 1000).toUTCString();
const STALE = new Date(Date.now() - 90 * 24 * 3600 * 1000).toUTCString();

const press = (brand: string, title: string, over: Partial<RecallRecord> = {}): RecallRecord => ({
  id: 'fda-press-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60),
  title,
  brand,
  lotNumbers: [],
  country: 'US',
  publishedAt: RECENT,
  source: 'fda-press',
  ...over
});

const taylorPress = press(
  'Taylor Fresh Foods',
  'Taylor Fresh Foods Recalls Iceberg Lettuce from Central Mexico Because of Possible Health Risk',
  { codeInfo: 'Best if Used By 7/16/2026 - 8/3/2026' }
);

describe('recallWarnsProduct — communiqués FDA (alerte niveau marque)', () => {
  it('avertit : marque consommateur ≠ raison sociale (Taylor Farms ↔ Taylor Fresh Foods)', () => {
    expect(recallWarnsProduct({ brand: 'Taylor Farms', productName: 'Shredded Iceberg Lettuce' }, taylorPress)).toBe(true);
  });

  it('avertit TOUTE la gamme de la marque (salade en kit, sans mot "iceberg")', () => {
    expect(recallWarnsProduct({ brand: 'Taylor Farms', productName: 'Chopped Salad Kit' }, taylorPress)).toBe(true);
  });

  it('avertit même sans nom de produit (scan sans code-barres)', () => {
    expect(recallWarnsProduct({ brand: 'Taylor Farms' }, taylorPress)).toBe(true);
  });

  it('avertit une marque COURTE de 4 lettres (Dole)', () => {
    const dole = press('Dole Fresh Vegetables Inc', 'Dole Recalls Shredded Lettuce');
    expect(recallWarnsProduct({ brand: 'Dole', productName: 'Shredded Lettuce' }, dole)).toBe(true);
  });

  it('avertit sur égalité exacte de marque (Malichita)', () => {
    const m = press('Malichita', 'Malichita Brand Cantaloupes Recalled');
    expect(recallWarnsProduct({ brand: 'Malichita', productName: 'Whole Cantaloupe' }, m)).toBe(true);
  });

  it("n'avertit PAS quand la marque diffère", () => {
    expect(recallWarnsProduct({ brand: 'Marketside', productName: 'Iceberg Lettuce' }, taylorPress)).toBe(false);
  });

  it("n'avertit PAS quand le rappel a des lots publiés (le match par lot tranche)", () => {
    expect(recallWarnsProduct({ brand: 'Taylor Farms' }, { ...taylorPress, lotNumbers: ['ABC123'] })).toBe(false);
  });

  it("n'avertit PAS pour un communiqué PÉRIMÉ (> 60 jours)", () => {
    expect(recallWarnsProduct({ brand: 'Taylor Farms' }, { ...taylorPress, publishedAt: STALE })).toBe(false);
  });

  it("n'avertit PAS quand la date du communiqué est illisible", () => {
    expect(recallWarnsProduct({ brand: 'Taylor Farms' }, { ...taylorPress, publishedAt: '' })).toBe(false);
  });
});

// RÉGRESSION incident 2026-07-20 : notifications en masse. Ces cas RÉELS
// (relevés sur les notifications reçues) ne doivent JAMAIS alerter.
describe('anti-faux-positifs (incident notifications du 20/07)', () => {
  it("les enregistrements ENFORCEMENT sans lot n'alertent jamais, marque identique ou pas", () => {
    const enforcement: RecallRecord = {
      id: 'r1',
      title: 'Kraft Heinz Foods Company Recalls Ready-To-Eat Ham and Cheese Loaf',
      brand: 'Kraft Heinz Foods Company',
      lotNumbers: [],
      country: 'US',
      publishedAt: RECENT,
      source: 'usda'
    };
    expect(recallWarnsProduct({ brand: 'Kraft', productName: 'cheddar cheese' }, enforcement)).toBe(false);
    // idem sans tag source (donnée ancienne non migrée)
    expect(recallWarnsProduct({ brand: 'Kraft' }, { ...enforcement, source: undefined })).toBe(false);
  });

  it("une marque d'UNE lettre ('U') n'alerte jamais, même sur communiqué", () => {
    const p = press('Georgia Nut Co', 'Georgia Nut Co Recalls tru fru Strawberries');
    expect(recallWarnsProduct({ brand: 'U', productName: 'Crème entière UHT' }, p)).toBe(false);
  });

  it('pas de sous-chaîne : Coca-Cola ≠ COCACOLA SOUTHWEST BEVERAGES (mot collé)', () => {
    const p = press('COCACOLA SOUTHWEST BEVERAGES LLC', 'Coca-Cola 12oz Can Recall');
    expect(recallWarnsProduct({ brand: 'Coca-Cola', productName: 'PET 1.75L' }, p)).toBe(false);
  });

  it('un token de marque GÉNÉRIQUE ne relie pas deux marques (Great Value ↔ Great Lakes Cheese)', () => {
    const p = press('Great Lakes Cheese Co', 'Great Lakes Cheese Recalls Shredded Cheese');
    expect(recallWarnsProduct({ brand: 'Great Value', productName: 'Shredded Cheddar' }, p)).toBe(false);
  });
});

describe('extraction de marque des titres de communiqués', () => {
  it('extrait la marque des titres réels du flux', () => {
    expect(
      extractPressBrand('Taylor Fresh Foods Recalls Iceberg Lettuce from Central Mexico Because of Possible Health Risk')
    ).toBe('Taylor Fresh Foods');
    expect(
      extractPressBrand('Khong Guan Corporation Issues Recall of Glutinous Rice Balls With Black Sesame Filling Due to Undeclared Peanuts')
    ).toBe('Khong Guan Corporation');
    expect(
      extractPressBrand('MorningStar Farms Voluntarily Recalling Two Varieties Due to Possible Plastic Presence')
    ).toBe('MorningStar Farms');
    expect(extractPressBrand('NARA ORGANICS RECALLS ALL LOTS OF NARA INFANT FORMULA')).toBe('NARA ORGANICS');
  });

  it("titre SANS marque en tête ('Voluntary Recall of…') → pas de marque, donc jamais d'alerte", () => {
    expect(extractPressBrand('Voluntary Recall of Two Lots of PEDIGREE Can High Protein Wet Dog Food')).toBe('');
    const p = press('', 'Voluntary Recall of Two Lots of PEDIGREE Can High Protein Wet Dog Food');
    expect(recallWarnsProduct({ brand: 'Pedigree' }, p)).toBe(false);
  });
});

describe('getRecallStatus avec repli warning', () => {
  const scanned: ScannedProduct = {
    id: 'p1',
    brand: 'Taylor Farms',
    lotNumber: 'TF20260710',
    productName: 'Shredded Iceberg Lettuce',
    scannedAt: Date.now(),
    recallStatus: 'unknown'
  };

  it("renvoie 'warning' + référence quand seul un communiqué matche", () => {
    const result = getRecallStatus(scanned, [taylorPress]);
    expect(result.status).toBe('warning');
    expect(result.recallReference).toBe(taylorPress.id);
  });

  it("'recalled' (match par lot) prime sur 'warning'", () => {
    const lotRecall: RecallRecord = {
      ...taylorPress,
      id: 'F-2026-9999',
      // enregistrement enforcement : marque consommateur + lots publiés
      brand: 'Taylor Farms',
      lotNumbers: ['TF20260710'],
      source: 'fda'
    };
    const result = getRecallStatus(scanned, [taylorPress, lotRecall]);
    expect(result.status).toBe('recalled');
    expect(result.recallReference).toBe('F-2026-9999');
  });

  it("renvoie 'safe' quand ni lot ni communiqué de la marque", () => {
    const unrelated = { ...scanned, brand: 'Kraft', productName: 'Cheddar Cheese' };
    expect(getRecallStatus(unrelated, [taylorPress]).status).toBe('safe');
  });
});
