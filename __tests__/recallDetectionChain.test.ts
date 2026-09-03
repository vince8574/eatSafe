// Chaîne COMPLÈTE de détection d'un rappel, du champ brut publié par la FDA
// jusqu'au verdict rendu à l'utilisateur qui saisit son numéro de lot.
//
// Les autres tests vérifient les maillons isolément. Celui-ci part d'une fiche
// FDA RÉELLE, non retouchée, et rejoue le trajet entier — c'est le seul moyen
// d'attraper une régression qui ne casse aucun maillon mais rompt la liaison
// entre deux d'entre eux.
//
// Cas de référence : rappel H-0767-2026, riz jasmin blanc Lundberg Family Farms
// (Wehah Farms), corps étranger, classe II, statut « ongoing ». Avant correctif,
// extractFdaLotNumbers renvoyait [] sur ce `code_info` : ScanLotScreen écarte
// tout rappel sans lot, donc un utilisateur scannant le lot 260201MA
// n'obtenait AUCUNE alerte sur un rappel pourtant en cours.
import { extractFdaLotNumbers } from '../src/services/apiService';
import { normalizeLotValue } from '../src/utils/lotMatcher';
import { brandMatchesRecall } from '../src/utils/bestByDate';

// Champs recopiés tels quels depuis api.fda.gov/food/enforcement.json.
// La coquille « FAMRS » est celle de la FDA, pas une faute de frappe ici.
const FDA_RECORD = {
  recall_number: 'H-0767-2026',
  code_info: 'Lot, Best Before: 260201MA, 01FEB2027; 260202MA, 02FEB2027.',
  recalling_firm: 'Wehah Farms',
  product_description:
    'LUNDBERG FAMILY FAMRS WHITE RICE JASMINE NET WT 32 OZ (2 lb) 907 g  Manufactured and Distributed by: Lundberg Family Farms Richvale, CA 95974  UPC: 073416040281',
  reason_for_recall: 'Potential contamination with foreign materials.'
};

// Reproduit le mapping de fetchFdaRecalls() : `brand` vaut recalling_firm.
const recall = {
  id: FDA_RECORD.recall_number,
  lotNumbers: extractFdaLotNumbers(FDA_RECORD.code_info),
  brand: FDA_RECORD.recalling_firm,
  codeInfo: FDA_RECORD.code_info
};

describe('chaîne de détection — riz Lundberg H-0767-2026 (fiche FDA réelle)', () => {
  test('les deux lots publiés sont extraits, sans les dates', () => {
    expect(recall.lotNumbers).toEqual(['260201MA', '260202MA']);
  });

  test('le rappel franchit le filtre « rappel sans lot » de ScanLotScreen', () => {
    // ScanLotScreen : if (!recall.lotNumbers || length === 0) return false;
    // C'est ici que le rappel disparaissait avant correctif.
    expect(recall.lotNumbers.length).toBeGreaterThan(0);
  });

  test('la marque ne correspond PAS : la fiche porte le fabricant', () => {
    // La FDA publie « Wehah Farms », l'utilisateur voit « Lundberg Family Farms ».
    // Ce test verrouille la raison pour laquelle le match EXACT du lot doit
    // rester accepté sans corroboration de marque — sinon ce rappel redevient
    // indétectable.
    expect(brandMatchesRecall('Lundberg Family Farms', recall)).toBe(false);
  });

  test('le lot saisi par l’utilisateur déclenche un match exact', () => {
    const detecte = (saisie: string) => {
      const candidate = normalizeLotValue(saisie);
      return recall.lotNumbers.some((lot) => normalizeLotValue(lot) === candidate);
    };
    // Casse, espaces parasites et séparateurs ne doivent rien changer.
    expect(detecte('260201MA')).toBe(true);
    expect(detecte('260201ma')).toBe(true);
    expect(detecte(' 260201MA ')).toBe(true);
    expect(detecte('260201-MA')).toBe(true);
    expect(detecte('260202MA')).toBe(true);
  });

  test('un lot voisin non rappelé n’est jamais signalé', () => {
    const candidate = normalizeLotValue('260203MA');
    expect(recall.lotNumbers.some((lot) => normalizeLotValue(lot) === candidate)).toBe(false);
  });

  test('la date « best before » n’est pas publiée comme numéro de lot', () => {
    expect(recall.lotNumbers).not.toContain('01FEB2027');
    expect(recall.lotNumbers).not.toContain('02FEB2027');
  });
});
