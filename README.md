# EatSafe – Application mobile de veille rappels alimentaires

EatSafe est une application React Native (Expo) qui permet de scanner les emballages de produits alimentaires, d'extraire le numéro de lot via OCR et de vérifier instantanément s'ils font l'objet d'un rappel officiel (France, USA, extension Suisse). L'application stocke les scans localement, déclenche des vérifications automatiques quotidiennes et envoie des notifications push lorsqu'un produit scanné devient rappelé.

## Fonctionnalités clés

- Scanner d'emballage avec `expo-camera` et OCR avec `tesseract.js`.
- Sauvegarde locale des scans via SQLite (`expo-sqlite`) + synchronisation manuelle/automatique.
- Vérification des rappels via API RappelConso (France) et OpenFDA (USA).
- Notifications push et tâches de fond (`expo-notifications`, `expo-task-manager`, `expo-background-fetch`).
- Nettoyage automatique des scans âgés de plus de six mois.
- Architecture modulaire (services, hooks, utils) + Expo Router (tabs + modales).

## Démarrage

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Renseigner la configuration Firebase dans `src/services/firebaseService.ts`.

3. Pour iOS/Android (via Expo Go ou build):
   ```bash
   npm run start
   ```

4. Tests unitaires :
   ```bash
   npm test
   ```

## Structure du projet

```
app/                   → Routes Expo Router (tabs, détails, modales)
src/components/        → Composants UI (Scanner, ProductCard…)
src/screens/           → Écrans (Home, Scan, History, Detail, ManualEntry)
src/services/          → Services (OCR, API, DB, notifications, background)
src/utils/             → Helpers (matching, data cleanup)
src/hooks/             → Hooks métier (`useScannedProducts`)
firebase/functions/    → Cloud Functions (purge + notifications rappel)
```

## Points d'attention

- Les fichiers d'icônes `assets/icon.png`, `assets/splash.png`, `assets/adaptive-icon.png` doivent être fournis avant publication.
- Pour l'OCR de production, prévoyez une configuration ML Kit et des tests sur jeu d'images réelles.
- Le background fetch dépend des limitations de la plateforme (iOS/Android).
- RGPD : ajouter politique de confidentialité + écran consentement utilisateur avant mise en prod.

## Prochaines étapes suggérées

1. Intégrer Google ML Kit en natif pour un OCR plus précis (ex: via Firebase ML Vision).
2. Ajouter l'authentification Firebase pour synchroniser les scans entre appareils.
3. Mettre en place un pipeline CI (lint, tests) et des workflows Expo Application Services (EAS).
4. Préparer la soumission App Store / Google Play (icônes, captures, métadonnées).
