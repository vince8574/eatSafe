// nanoid/non-secure ships ESM that jest-expo's transformIgnorePatterns doesn't
// transform → stub it (dietaryProfile.ts only uses it to mint person ids).
jest.mock('nanoid/non-secure', () => ({ nanoid: () => 'test-id' }));

import {
  checkProductAgainstProfile,
  type ProductDietaryData
} from '../src/services/dietaryCheckService';
import type { DietaryProfile, DietaryPerson } from '../src/services/dietaryProfile';

const person = (o: Partial<DietaryPerson>): DietaryPerson => ({
  id: 'p1',
  name: 'Test',
  allergens: [],
  avoidFoods: [],
  vegetarian: false,
  vegan: false,
  pregnant: false,
  thresholds: {},
  ...o
});

const prof = (p: DietaryPerson): DietaryProfile =>
  ({ people: [p], updatedAt: 0 } as DietaryProfile);

describe('dietaryCheck — pork false positive (rennet / présure)', () => {
  it('does NOT flag pork for a gorgonzola whose ingredients list "présure"', () => {
    const product: ProductDietaryData = {
      productName: 'Mascarpone & Gorgonzola',
      ingredientsText:
        'Crème de lait de vache, acide citrique, gorgonzola (lait pasteurisé de vache, sel, présure).'
    };
    const res = checkProductAgainstProfile(product, prof(person({ avoidFoods: ['pork'] })));
    expect(res.warnings.some((w) => w.key === 'pork')).toBe(false);
  });

  it('still flags real pork (jambon)', () => {
    const res = checkProductAgainstProfile(
      { ingredientsText: 'jambon, sel, conservateur' },
      prof(person({ avoidFoods: ['pork'] }))
    );
    expect(res.warnings.some((w) => w.key === 'pork')).toBe(true);
  });
});

describe('dietaryCheck — pregnancy raw meat detected via product NAME', () => {
  it('flags a beef carpaccio (raw meat only named in the title) for a pregnant person', () => {
    const product: ProductDietaryData = {
      productName: 'Carpaccio de bœuf',
      ingredientsText: "Viande de bœuf, huile d'olive, sel, poivre." // no "cru"/"carpaccio" here
    };
    const res = checkProductAgainstProfile(product, prof(person({ pregnant: true })));
    const w = res.warnings.find((x) => x.type === 'pregnancy' && x.key === 'raw-meat');
    expect(w).toBeTruthy();
    expect(res.status).toBe('danger');
  });

  it('does NOT flag "sauce tartare" as raw meat', () => {
    const res = checkProductAgainstProfile(
      { productName: 'Sauce tartare', ingredientsText: 'huile, moutarde, cornichons, câpres' },
      prof(person({ pregnant: true }))
    );
    expect(res.warnings.some((w) => w.key === 'raw-meat')).toBe(false);
  });
});
