import { getRecallStatus, matchLots } from '../src/utils/lotMatcher';
import { RecallRecord, ScannedProduct } from '../src/types';

const product: ScannedProduct = {
  id: '1',
  brand: 'Test',
  lotNumber: 'L12345',
  scannedAt: Date.now(),
  recallStatus: 'unknown'
};

const recall: RecallRecord = {
  id: 'recall-1',
  title: 'Produit rappelé',
  lotNumbers: ['L12345'],
  country: 'FR',
  publishedAt: new Date().toISOString()
};

describe('lotMatcher', () => {
  it('matches identical lot numbers', () => {
    expect(matchLots(product, recall)).toBe(true);
  });

  it('returns recall status when match is found', () => {
    const result = getRecallStatus(product, [recall]);
    expect(result.status).toBe('recalled');
    expect(result.recallReference).toBe('recall-1');
  });

  it('returns safe when no match', () => {
    const result = getRecallStatus(product, [
      { ...recall, lotNumbers: ['L9999'], id: 'recall-2' }
    ]);
    expect(result.status).toBe('safe');
  });
});

// Cas réel : l'écran de scan détectait le rappel bettergoods, mais la saisie
// manuelle — qui passe par getRecallStatus/recallMatchesProduct — le manquait,
// parce que ce chemin ne comparait que `brand` ("Boticelli Foods", la société)
// sans les alias issus du titre. Deux réponses différentes pour un même produit.
describe('marque du rayon vs société qui rappelle', () => {
  const pressRecall: RecallRecord = {
    id: 'fda-press-bettergoods',
    title: 'Boticelli Foods Recalls Bettergoods Pistachio Nut Butter Because of Possible Health Risk',
    lotNumbers: ['LB028ACP04'],
    brand: 'Boticelli Foods',
    brandAliases: ['Bettergoods Pistachio Nut Butter'],
    country: 'US',
    publishedAt: new Date().toISOString(),
    source: 'fda-press'
  };
  const scanned = (brand: string, lotNumber: string): ScannedProduct => ({
    id: '1',
    brand,
    lotNumber,
    scannedAt: Date.now(),
    recallStatus: 'unknown'
  });

  it('la marque imprimée sur le pot déclenche le rappel', () => {
    expect(getRecallStatus(scanned('bettergoods', 'LB028ACP04'), [pressRecall]).status).toBe('recalled');
  });

  it('le lot reste indispensable — l’alias seul n’alerte pas', () => {
    expect(getRecallStatus(scanned('bettergoods', 'ZZ999ZZ99'), [pressRecall]).status).not.toBe('recalled');
  });

  it('une marque étrangère au rappel n’alerte pas, même avec le bon lot', () => {
    expect(getRecallStatus(scanned('Trader Joes', 'LB028ACP04'), [pressRecall]).status).not.toBe('recalled');
  });
});
