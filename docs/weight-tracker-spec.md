# Spec — Module « Objectif poids » (MVP)

*Numeline / NumelineFR — feature de suivi de poids et d'objectif calorique.*
*Statut : proposition. Rédigé le 2026-07-28.*

---

## 1. Intention et positionnement

**Ne PAS** faire « encore un MyFitnessPal ». Le faire comme une **extension de l'ADN Numeline** : *« perdre du poids en mangeant sûr et adapté à soi »*.

Argument unique, impossible à copier pour un tracker classique : chaque aliment que l'utilisateur enregistre est **déjà** analysé par Numeline pour :
- son **statut de rappel** (FDA/USDA ou RappelConso),
- son **adéquation au profil** (allergènes, cœliaque, grossesse, aliments à éviter),
- sa **qualité** (Nutri-Score + NOVA, déjà remontés d'Open Food Facts).

On ajoute par-dessus : objectif calorique automatique, journal, courbe de poids. Le comptage calorique devient la **couche d'engagement quotidien** ; la sécurité/qualité reste le **différenciateur**.

**KPI cible :** faire passer l'app d'un usage épisodique (on scanne quand on doute) à un **usage quotidien** (on logge ses repas) → rétention D7/D30 et base d'abonnés premium.

---

## 2. Périmètre

### Dans le MVP (Phase 1)
- Profil corporel : sexe, date de naissance, taille, poids actuel, poids cible, niveau d'activité, objectif (perte / maintien / prise).
- **Objectif calorique quotidien calculé** (Mifflin-St Jeor → TDEE → déficit).
- **Journal alimentaire** : ajout d'un aliment par **scan code-barres** (réutilise le pipeline existant) ou saisie manuelle, avec choix de la portion.
- Total du jour (kcal + macros) vs objectif ; anneau de progression.
- **Courbe de poids** (saisies manuelles) + tendance vs objectif.
- Sur chaque aliment loggé : badge **rappel / adéquation profil / Nutri-Score / NOVA** (réutilisé).

### Hors MVP (Phase 2+)
- Base d'exercices avec METs. *(MVP : simple multiplicateur d'activité + import Apple Santé / Google Fit pour les kcal dépensées.)*
- Repas favoris / recettes / plans de repas.
- Coaching, rappels de repas, streaks, gamification.
- Photo-logging (reconnaissance d'image).
- Objectifs de macros personnalisés, jeûne intermittent.

---

## 3. Parcours utilisateur (écrans)

1. **Onboarding poids** (une fois) — 4 à 5 étapes courtes :
   - Sexe · date de naissance · taille · poids actuel · poids cible.
   - Niveau d'activité (sédentaire → très actif).
   - Rythme souhaité (0,25 / 0,5 / 0,75 kg par semaine) → l'app affiche l'objectif kcal calculé et une **date d'atteinte estimée**.
   - **Consentement données de santé** (réutilise le mécanisme `healthConsentAt` déjà en place).
2. **Écran « Aujourd'hui »** (nouvel onglet) :
   - Anneau : kcal consommées / objectif, restant.
   - Barres macros (protéines / glucides / lipides).
   - Liste des aliments du jour (petit-déj / déj / dîner / snacks), chacun avec kcal + badges sécurité/qualité.
   - Bouton **+ Ajouter** → scan ou recherche.
3. **Ajout d'un aliment** :
   - Scan code-barres → produit OFF → sélection **portion** (portion OFF si dispo, sinon grammes) → kcal calculées → ajouté au repas.
   - Alerte immédiate si rappel / allergène / non adéquat au profil.
4. **Écran « Progrès »** :
   - Courbe de poids + ligne d'objectif + tendance (moyenne mobile 7 j).
   - Bouton **+ Peser** (saisie du jour).
   - Résumé : moyenne kcal/jour sur 7 j vs objectif, variation de poids.
5. **Réglages objectif** : modifier poids cible, rythme, activité → recalcul.

---

## 4. Modèle de données

### 4.1 Extension du profil personne
`DietaryPerson` (dans `src/services/dietaryProfile.ts`) gagne un bloc **optionnel** `body` (rétro-compatible : absent = module non activé) :

```ts
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type WeightGoal = 'lose' | 'maintain' | 'gain';

export type BodyProfile = {
  sex: 'male' | 'female';
  birthDate: string;        // ISO 'YYYY-MM-DD' (on calcule l'âge, pas de stockage d'âge figé)
  heightCm: number;
  startWeightKg: number;
  targetWeightKg: number;
  activity: ActivityLevel;
  goal: WeightGoal;
  paceKgPerWeek: number;    // 0.25 | 0.5 | 0.75
  calorieTarget: number;    // dérivé, mis en cache
  createdAt: number;
};

export type DietaryPerson = DietaryCriteria & {
  id: string;
  name: string;
  body?: BodyProfile;       // NOUVEAU, optionnel
};
```

### 4.2 Journal alimentaire — Firestore
Nouvelle sous-collection, alignée sur l'existant `scannedProducts/{uid}/products` :

```
foodLog/{uid}/entries/{entryId}
  personId:   string           // multi-profil (comme le régime)
  date:       string           // 'YYYY-MM-DD' (jour local)
  meal:       'breakfast' | 'lunch' | 'dinner' | 'snack'
  barcode?:   string
  name:       string
  brand?:     string
  quantityG:  number           // quantité consommée en grammes
  kcal:       number           // calculé et figé au log
  protein_g?: number
  carbs_g?:   number
  fat_g?:     number
  nutriscore?: string          // repris d'OFF (affichage)
  nova?:      number
  recallStatus?: 'safe'|'recalled'|'warning'  // snapshot au moment du log
  createdAt:  number
```

### 4.3 Courbe de poids — Firestore
```
weightLog/{uid}/entries/{YYYY-MM-DD}
  personId: string
  weightKg: number
  createdAt: number
```

> Doc-id = date → une pesée par jour, écriture idempotente (comme les statuts de rappel).

---

## 5. Formules (standard, éprouvées)

**Métabolisme de base (BMR) — Mifflin-St Jeor :**
```
homme : BMR = 10·poids(kg) + 6.25·taille(cm) − 5·âge + 5
femme : BMR = 10·poids(kg) + 6.25·taille(cm) − 5·âge − 161
```

**Dépense totale (TDEE) = BMR × facteur d'activité :**
| Activité | Facteur |
|---|---|
| Sédentaire | 1.2 |
| Légère | 1.375 |
| Modérée | 1.55 |
| Active | 1.725 |
| Très active | 1.9 |

**Objectif calorique :**
```
déficit_journalier = paceKgPerWeek · 7700 / 7      // ~1100 kcal/j pour 1 kg/sem
objectif = TDEE − déficit         (perte)
objectif = TDEE + surplus         (prise)
```
**Garde-fous** : plancher de sécurité (ex. ≥ 1200 kcal femme / 1500 kcal homme), plafond de rythme (≤ 1 kg/sem), refus si objectif menant à un IMC < 18,5 → message « consultez un professionnel » (voir §8).

**Date d'atteinte estimée :** `(poids_actuel − poids_cible) / paceKgPerWeek` semaines.

**Tendance de poids :** moyenne mobile 7 jours (lisse le bruit hydrique) ; c'est la tendance, pas la pesée brute, qu'on affiche comme « vraie » évolution.

---

## 6. Calcul kcal d'un aliment scanné

Open Food Facts fournit `nutriments` en **/100 g** (déjà récupérés dans `ProductInfo.nutriments`, `src/services/productLookupService.ts`). Clés utiles :
`energy-kcal_100g`, `proteins_100g`, `carbohydrates_100g`, `fat_100g`.

```
kcal = nutriments['energy-kcal_100g'] · quantityG / 100
```
- Si `energy-kcal_100g` absent mais `energy_100g` (kJ) présent : `kcal = kJ / 4.184`.
- **Portions** : proposer la portion OFF (`serving_size` / `serving_quantity`) si dispo, sinon un choix rapide (30 / 50 / 100 / 150 g) + saisie libre. Point de friction connu → soigner ce sélecteur.
- Si aucune donnée énergétique : autoriser le log « sans calories » (juste pour la traçabilité sécurité) ou saisie manuelle des kcal.

---

## 7. Réutilisation du code existant (le gros de l'avantage)

| Besoin | Déjà en place |
|---|---|
| Scan code-barres → produit | pipeline `Scanner` + `productLookupService` (OFF US + FR) |
| Nutriments, Nutri-Score, NOVA | `ProductInfo.nutriments / nutriscoreGrade / novaGroup` |
| Statut de rappel d'un produit | `lotMatcher` / `recallCheckService` |
| Adéquation au profil (allergènes, cœliaque, grossesse) | `dietaryCheckService` + `useDietaryProfileStore` |
| Multi-profil (famille) | `DietaryPerson[]` — le poids se greffe par personne |
| Consentement données de santé | `healthConsentAt / healthConsentVersion` |
| Premium / gating | `useSubscriptionStatus().isSubscribed` |
| Persistance + sync Firestore | même schéma que `scannedProducts/{uid}` |

→ Le module poids est surtout de l'**UI + 2 collections Firestore + les formules**. Le moteur nutrition/sécurité existe déjà.

---

## 8. Conformité, santé, RGPD

- **Pas de promesse médicale.** Vocabulaire « estimation », « à titre indicatif ». Disclaimer visible : *« Ces estimations ne remplacent pas l'avis d'un professionnel de santé. »*
- **Données de santé (RGPD art. 9)** : poids, IMC, objectif = données sensibles → réutiliser le **consentement explicite** déjà implémenté, stockage chiffré au repos (Firestore), suppression sur suppression de compte (déjà géré).
- **Troubles alimentaires / mineurs** : refuser un objectif menant à un IMC < 18,5 ; plancher calorique ; pas de ciblage < 18 ans sans garde-fou (politiques Apple 1.4.3 / Google « santé »). Ne jamais afficher de « poids idéal » prescriptif.
- **Stores** : Apple et Google scrutent les apps de perte de poids → captures et description sobres, disclaimers, pas de « avant/après ».

---

## 9. Monétisation

- Feature **Premium** (gating `isSubscribed`) : le journal illimité + la courbe + l'objectif auto derrière l'abonnement, avec un **aperçu gratuit** (ex. objectif calculé + 3 jours de journal) pour donner envie.
- Cohérent avec l'offre actuelle (packs de scans + abonnements) : le suivi poids justifie un **abonnement mensuel récurrent** bien mieux qu'un usage épisodique.

---

## 10. Phasage

- **Phase 1 (MVP)** : profil corporel + objectif auto + journal par scan/saisie + courbe de poids + badges sécurité/qualité réutilisés. Onglet « Objectif ».
- **Phase 2** : import Apple Santé / Google Fit (pas / kcal dépensées), aliments favoris, macros personnalisées, rappels de repas.
- **Phase 3** : base d'exercices (METs), recettes, plans, gamification/streaks.

**Estimation grossière Phase 1** : ~3–4 écrans neufs, 2 collections Firestore, un service `weightService` (formules + CRUD). L'essentiel du risque est UX (sélecteur de portion, courbe) plutôt que technique.

---

## 11. Décisions ouvertes (à trancher avant de coder)

1. **Un seul utilisateur suivi** ou multi-profil poids (la famille) ? *(Reco : MVP = la personne active uniquement, comme le régime en gratuit.)*
2. Portions : quelle granularité par défaut ? *(Reco : portion OFF si dispo, sinon boutons 30/50/100/150 g + saisie.)*
3. Exercice au MVP : **exclu** (multiplicateur d'activité seul) — confirmer.
4. Gratuit vs premium : où mettre le mur ? *(Reco : objectif + 3 jours gratuits, journal illimité + courbe = premium.)*
5. Le sortir sur **les deux apps** (US + FR) d'emblée, ou d'abord FR pour tester ?

---

*Prochaine étape possible : je peux prototyper la Phase 1 (onglet « Objectif » + `weightService` + formules + écran Aujourd'hui branché sur le scan existant), ou détailler les maquettes écran par écran.*
