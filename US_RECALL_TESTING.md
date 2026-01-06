# Tests de lots rappelés - États-Unis

## 🇺🇸 Sources de données FDA

L'application Numeline interroge les bases de données officielles de la FDA (Food and Drug Administration):

1. **FDA Enforcement Reports API**
   - URL: https://api.fda.gov/food/enforcement.json
   - Produits alimentaires généraux

2. **FSIS Recalls (USDA)**
   - URL: https://www.fsis.usda.gov/recalls
   - Viandes, volailles et œufs spécifiquement

## 🥩 Test 1: Lot de viande rappelé (FSIS/USDA)

### Exemple récent de rappel de viande

**Marque**: Foster Farms
**Produit**: Frozen Fully Cooked Chicken Breast Patties
**Numéro de lot**: P2299 (example - vérifier sur FSIS pour un lot actuel)
**Date de rappel**: Vérifier sur https://www.fsis.usda.gov/recalls
**Raison**: Possible contamination à la Listeria monocytogenes

### Comment tester

1. **Configuration du pays**:
   ```typescript
   // Dans PreferencesStore
   setCountry('us'); // États-Unis
   ```

2. **Scanner le code-barres** (si disponible):
   - Marque: Foster Farms
   - Rechercher un produit avec barcode UPC

3. **Scanner le numéro de lot**:
   - Lot: P2299 (ou numéro actuel d'un rappel en cours)

4. **Vérifier la détection**:
   - L'app doit afficher "RECALLED" (RAPPELÉ)
   - Alerte rouge avec détails du rappel
   - Référence du rappel FSIS

### Rappels de viande récents à tester

Consulter régulièrement:
- https://www.fsis.usda.gov/recalls (liste mise à jour)
- Filtrer par "Open" pour les rappels actifs

**Types de viandes fréquemment rappelées**:
- Bœuf haché (E. coli, Salmonella)
- Poulet (Salmonella, Listeria)
- Porc transformé
- Charcuteries

## 🥫 Test 2: Produit alimentaire général rappelé (FDA)

### Exemple récent de rappel FDA

**Marque**: Various brands
**Produit**: Peanut Butter / Tahini products
**Numéro de lot**: Varie selon le produit
**Raison**: Salmonella contamination

### Produits fréquemment rappelés (FDA)

1. **Produits laitiers**:
   - Fromages au lait cru
   - Crème glacée
   - Raison: Listeria, E. coli

2. **Produits à base de noix**:
   - Beurre de cacahuète
   - Tahini
   - Noix mélangées
   - Raison: Salmonella, allergènes non déclarés

3. **Produits de boulangerie**:
   - Cookies
   - Gâteaux
   - Raison: Allergènes non déclarés, contamination

4. **Fruits et légumes**:
   - Laitues
   - Salades pré-emballées
   - Raison: E. coli, Listeria

### Comment trouver des lots actifs

#### Méthode 1: Via FDA API
```bash
curl "https://api.fda.gov/food/enforcement.json?search=status:Ongoing&limit=10"
```

#### Méthode 2: Site web FDA
1. Aller sur https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts
2. Filtrer par "Food & Beverages"
3. Sélectionner un rappel récent
4. Noter:
   - Brand name (marque)
   - Product description
   - Lot code / Batch number
   - UPC / Barcode si disponible

### Exemples de numéros de lots typiques

Les numéros de lots américains suivent généralement ces formats:

- **Format Julian Date**: `23365` (année 23, jour 365)
- **Format alpha-numérique**: `L2023365A`
- **Best by date**: `BB 12/31/23`
- **Code établissement**: `EST. 123` (pour viandes FSIS)

## 📱 Procédure de test dans l'application

### Étape 1: Configuration
```typescript
// S'assurer que le pays est US
import { usePreferencesStore } from './stores/usePreferencesStore';

const setCountry = usePreferencesStore(state => state.setCountry);
setCountry('us');
```

### Étape 2: Scan d'un produit rappelé

1. **Lancer l'app** en mode US (langue anglaise)
2. **Scanner le code-barres** du produit
3. **Scanner le numéro de lot** (via OCR ou saisie manuelle)
4. **Vérifier la réponse**:
   - Statut: "RECALLED"
   - Alerte rouge affichée
   - Détails du rappel (raison, date, référence)

### Étape 3: Vérifier les sources

L'app doit indiquer la source du rappel:
- "FDA Enforcement Report" pour produits généraux
- "FSIS Recall" pour viandes et volailles

## 🔍 Débogage

### Vérifier les requêtes API

Dans le code, ajouter des logs:

```typescript
// src/services/apiService.ts
export async function fetchRecallsByCountry(country: string) {
  console.log(`[API] Fetching recalls for country: ${country}`);

  if (country === 'us') {
    // Log FDA request
    console.log('[API] Calling FDA API...');
    const fdaUrl = 'https://api.fda.gov/food/enforcement.json?limit=1000';
    console.log('[API] URL:', fdaUrl);

    const response = await fetch(fdaUrl);
    const data = await response.json();
    console.log(`[API] FDA returned ${data.results?.length || 0} recalls`);

    // Log FSIS request
    console.log('[API] Calling FSIS API...');
    // ... FSIS logic
  }
}
```

### Tester avec des données mock

Si aucun rappel actif n'est disponible, créer des données de test:

```typescript
// src/services/apiService.test.ts
const MOCK_US_RECALLS = [
  {
    id: 'test-recall-meat-001',
    country: 'us',
    brand: 'Test Meat Co',
    productName: 'Ground Beef',
    lotNumber: 'TEST2024001',
    recallDate: '2024-01-15',
    reason: 'Possible E. coli O157:H7 contamination',
    source: 'FSIS',
    status: 'Ongoing'
  },
  {
    id: 'test-recall-food-001',
    country: 'us',
    brand: 'Test Foods Inc',
    productName: 'Peanut Butter',
    lotNumber: 'PB240115A',
    recallDate: '2024-01-10',
    reason: 'Possible Salmonella contamination',
    source: 'FDA',
    status: 'Ongoing'
  }
];
```

## 📊 Résultats attendus

### Pour un lot rappelé
```json
{
  "status": "recalled",
  "recallReference": "RECALL-2024-001",
  "recallDate": "2024-01-15",
  "reason": "Possible E. coli contamination",
  "source": "FDA" ou "FSIS",
  "brand": "Brand Name",
  "productName": "Product Name",
  "lotNumber": "LOT12345"
}
```

### Pour un lot sécurisé
```json
{
  "status": "safe",
  "lastChecked": 1705334400000,
  "message": "No recalls found for this product"
}
```

## ⚠️ Notes importantes

1. **Mises à jour fréquentes**:
   - Les bases FDA et FSIS sont mises à jour quotidiennement
   - Tester avec des rappels récents (< 30 jours)

2. **Correspondance exacte**:
   - La correspondance des lots doit être exacte
   - Normaliser les espaces et caractères spéciaux

3. **Sources multiples**:
   - Certains produits peuvent apparaître dans les deux bases
   - Prioriser FSIS pour viandes

4. **Performance**:
   - Cache les résultats pendant 24h
   - Éviter trop de requêtes API

## 🧪 Cas de tests recommandés

| Test Case | Marque | Produit | Lot | Résultat attendu |
|-----------|--------|---------|-----|------------------|
| 1 | Foster Farms | Chicken | P2299 | RECALLED (FSIS) |
| 2 | Generic | Lettuce | L240115 | Vérifier FDA actuel |
| 3 | Unknown Brand | Test Product | INVALID | SAFE (not found) |
| 4 | Jif | Peanut Butter | (lot récent) | Vérifier FDA actuel |

## 📝 Checklist de test

- [ ] Configurer le pays sur US
- [ ] Langue par défaut en anglais
- [ ] Tester un rappel de viande (FSIS)
- [ ] Tester un rappel de produit général (FDA)
- [ ] Vérifier l'affichage des alertes
- [ ] Vérifier la source du rappel (FDA vs FSIS)
- [ ] Tester avec un lot non rappelé
- [ ] Vérifier l'export des données de rappel
- [ ] Tester les notifications push pour nouveaux rappels

## 🔗 Liens utiles

- [FDA Recalls](https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts)
- [FSIS Recalls](https://www.fsis.usda.gov/recalls)
- [FDA API Docs](https://open.fda.gov/apis/food/enforcement/)
- [FSIS Data](https://www.fsis.usda.gov/inspection/compliance-guidance/fsis-data)

## 🎯 Recommandation

Pour des tests fiables, utilisez des rappels datant de moins de 7 jours et vérifiez régulièrement les sites officiels FDA et FSIS pour des numéros de lots actuels.
