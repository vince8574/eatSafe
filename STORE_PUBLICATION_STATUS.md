# 📱 Statut de Publication Google Play Store - Numeline

**Dernière mise à jour**: 11 janvier 2026
**Version de l'app**: 1.0.0

---

## ✅ Ce qui est PRÊT

### 🔐 Sécurité
- ✅ API Keys retirées du code source ([app.json](app.json))
- ✅ Variables d'environnement configurées ([.env](.env))
- ✅ Fichiers .env ignorés par Git ([.gitignore](.gitignore))
- ✅ Scripts de configuration EAS Secrets créés
- ✅ Script de test des API keys créé (`npm run test-api-keys`)
- ✅ Documentation sécurité complète

### 📝 Textes Play Store
- ✅ Nom de l'app: **Numeline**
- ✅ Description courte (80 caractères)
- ✅ Description complète (4000 caractères)
- ✅ Mots-clés et tags
- ✅ Disponible en français ET anglais

### ⚖️ Documents légaux
- ✅ Politique de confidentialité ([privacy-policy.html](privacy-policy.html))
- ✅ Conditions d'utilisation ([terms-of-service.html](terms-of-service.html))
- ✅ Avertissement de sécurité (Disclaimer)
- ✅ Sources de données documentées

### 📚 Documentation
- ✅ Guide complet Google Play Console ([GOOGLE_PLAY_CONSOLE_GUIDE.md](GOOGLE_PLAY_CONSOLE_GUIDE.md))
- ✅ Checklist rapide ([QUICK_STORE_CHECKLIST.md](QUICK_STORE_CHECKLIST.md))
- ✅ Guide création assets ([ASSETS_CREATION_GUIDE.md](ASSETS_CREATION_GUIDE.md))
- ✅ Guide sécurité API ([SECURITY.md](SECURITY.md))
- ✅ Setup rapide API keys ([API_KEYS_SETUP.md](API_KEYS_SETUP.md))

### 🛠️ Configuration technique
- ✅ EAS Build configuré ([eas.json](eas.json))
- ✅ Package Android: `com.eatsafe.app`
- ✅ Build type: AAB (app-bundle)
- ✅ Google Play submission configurée

---

## ⚠️ Ce qui RESTE À FAIRE

### 🚨 CRITIQUE - À faire IMMÉDIATEMENT

1. **Révoquer l'ancienne clé API exposée**
   - [ ] Aller sur https://console.cloud.google.com/apis/credentials
   - [ ] Supprimer la clé `AIzaSyA3cI...Jbq0`
   - [ ] Générer une nouvelle clé
   - [ ] Configurer les restrictions (Android + Vision API uniquement)
   - [ ] Mettre à jour [.env](.env) avec la nouvelle clé
   - [ ] Tester: `npm run test-api-keys`

   **📖 Guide**: [URGENT_SECURITY_WARNING.md](URGENT_SECURITY_WARNING.md)

2. **Configurer EAS Secrets (Production)**
   ```bash
   # Option 1: Script automatique
   .\scripts\setup-eas-secrets.ps1

   # Option 2: Commandes manuelles
   eas secret:create --scope project --name EXPO_PUBLIC_VISION_API_KEY --value NOUVELLE_CLE
   ```

   **📖 Guide**: [API_KEYS_SETUP.md](API_KEYS_SETUP.md)

### 🎨 Création des Assets Graphiques

3. **Icône (512x512 px)**
   - [ ] Vérifier dimensions de [assets/icon.png](assets/icon.png)
   - [ ] Redimensionner si nécessaire à 512x512
   - [ ] Supprimer la transparence (fond blanc)
   - [ ] Sauvegarder comme `store-assets/icon-512.png`

4. **Feature Graphic (1024x500 px)**
   - [ ] Créer sur Canva/Figma
   - [ ] Design: Logo + "Numeline" + slogan
   - [ ] Sauvegarder comme `store-assets/feature-graphic.png`

5. **Captures d'écran (min. 2, recommandé 4-6)**
   - [ ] Screenshot 1: Écran d'accueil / Dashboard
   - [ ] Screenshot 2: Scan en action (code-barres ou lot)
   - [ ] Screenshot 3: Alerte de rappel (modal rouge)
   - [ ] Screenshot 4: Historique des scans
   - [ ] (Optionnel) Screenshot 5: Détails produit
   - [ ] (Optionnel) Screenshot 6: Page abonnements
   - [ ] Dimensions: 1080 x 1920 px
   - [ ] Ajouter device frames (MockUPhone)
   - [ ] Ajouter texte explicatif (optionnel)

   **📖 Guide**: [ASSETS_CREATION_GUIDE.md](ASSETS_CREATION_GUIDE.md)

### 🌐 Hébergement Documents Légaux

6. **Héberger privacy-policy.html et terms-of-service.html**

   **Option A: GitHub Pages (Recommandé)**
   ```bash
   git add privacy-policy.html terms-of-service.html
   git commit -m "Add legal documents"
   git push

   # Activer GitHub Pages:
   # Repo Settings → Pages → Source: main → Save
   ```

   **URL finale**:
   ```
   https://VOTRE_USERNAME.github.io/VOTRE_REPO/privacy-policy.html
   https://VOTRE_USERNAME.github.io/VOTRE_REPO/terms-of-service.html
   ```

   **Option B: Firebase Hosting**
   ```bash
   firebase init hosting
   cp privacy-policy.html public/
   cp terms-of-service.html public/
   firebase deploy --only hosting
   ```

   - [ ] Héberger les documents
   - [ ] Noter les URLs pour Google Play Console
   - [ ] Mettre à jour les descriptions avec les vraies URLs

### 📦 Build & Upload

7. **Générer l'AAB (Android App Bundle)**
   ```bash
   # Vérifier que les secrets sont configurés
   eas secret:list

   # Générer le build de production
   eas build --platform android --profile production

   # Attendre 10-20 minutes
   # Télécharger le .aab depuis https://expo.dev/
   ```

   - [ ] Build réussi sans erreurs
   - [ ] AAB téléchargé localement

### 🏪 Google Play Console

8. **Créer et configurer l'application**
   - [ ] Créer compte développeur Google Play (25 USD)
   - [ ] Créer nouvelle application "Numeline"
   - [ ] Langue par défaut: Français ou Anglais

9. **Remplir la fiche Play Store**
   - [ ] Nom: Numeline
   - [ ] Description courte
   - [ ] Description complète (URLs mises à jour!)
   - [ ] Icône uploadée
   - [ ] Feature graphic uploadée
   - [ ] Screenshots uploadés (min. 2)
   - [ ] Email de contact
   - [ ] Catégorie: Santé et remise en forme

10. **Politique et classification**
    - [ ] URL Politique de confidentialité
    - [ ] Questionnaire de contenu
    - [ ] Classification d'âge (16+)
    - [ ] Pays: États-Unis
    - [ ] Type: Gratuit avec achats intégrés

11. **Achats intégrés** (Monétisation)
    - [ ] Pack 500 scans configuré
    - [ ] Abonnement mensuel configuré
    - [ ] Abonnement annuel configuré
    - [ ] Prix définis

12. **Upload et soumission**
    - [ ] AAB uploadé dans Production
    - [ ] Notes de version ajoutées
    - [ ] Toutes les sections validées (✅ vertes)
    - [ ] Soumis pour examen

   **📖 Guide**: [GOOGLE_PLAY_CONSOLE_GUIDE.md](GOOGLE_PLAY_CONSOLE_GUIDE.md)

---

## 📊 Progression Globale

```
████████░░░░░░░░░░  40% Complété

✅ Documentation:     100%
✅ Sécurité:           80%  (⚠️ Clé à révoquer)
✅ Textes:            100%
✅ Documents légaux:  100%  (⚠️ À héberger)
⏳ Assets:             0%  (À créer)
⏳ Build:              0%  (À générer)
⏳ Google Play:        0%  (À configurer)
```

---

## 🎯 Plan d'Action Prioritaire

### Jour 1 - Sécurité (30 min)
1. Révoquer ancienne clé API ⚠️ URGENT
2. Générer nouvelle clé Google Vision
3. Configurer EAS Secrets
4. Tester: `npm run test-api-keys`

### Jour 2 - Assets (2-3 heures)
1. Créer Feature Graphic (1024x500)
2. Faire 4-6 screenshots de l'app
3. Ajouter device frames et textes
4. Vérifier dimensions et tailles

### Jour 3 - Hébergement (30 min)
1. Héberger privacy-policy.html
2. Héberger terms-of-service.html
3. Tester que les URLs fonctionnent
4. Mettre à jour descriptions avec URLs

### Jour 4 - Build (1 heure)
1. Vérifier configuration EAS
2. Lancer `eas build --platform android --profile production`
3. Attendre et télécharger AAB

### Jour 5 - Google Play (2 heures)
1. Créer application sur Google Play Console
2. Remplir tous les champs
3. Upload assets et AAB
4. Soumettre pour examen

**Total estimé**: 7-10 heures réparties sur 5 jours

---

## 📁 Structure des fichiers

```
eatSafe/
├── 📚 Documentation Store
│   ├── GOOGLE_PLAY_CONSOLE_GUIDE.md    ← Guide complet
│   ├── QUICK_STORE_CHECKLIST.md        ← Checklist rapide
│   ├── ASSETS_CREATION_GUIDE.md        ← Guide assets
│   ├── google-play-store-listing.md    ← Textes originaux
│   └── STORE_PUBLICATION_STATUS.md     ← Ce fichier
│
├── 🔐 Sécurité
│   ├── API_KEYS_SETUP.md               ← Setup API keys
│   ├── SECURITY.md                     ← Documentation complète
│   ├── URGENT_SECURITY_WARNING.md      ← ⚠️ À LIRE
│   ├── CHANGELOG_SECURITY.md           ← Historique
│   ├── .env.example                    ← Template
│   └── .env                            ← Clés (NON commité)
│
├── ⚖️ Légal
│   ├── privacy-policy.html             ← Politique confidentialité
│   └── terms-of-service.html           ← Conditions utilisation
│
├── 🛠️ Scripts
│   ├── setup-eas-secrets.ps1           ← Windows
│   ├── setup-eas-secrets.sh            ← Mac/Linux
│   └── test-api-keys.js                ← Test config
│
└── 🎨 Assets (À créer)
    └── store-assets/
        ├── icon-512.png                ← Icône
        ├── feature-graphic.png         ← Bannière
        └── screenshots/                ← Captures d'écran
            ├── 01-home.png
            ├── 02-scan.png
            └── ...
```

---

## 🆘 Besoin d'aide ?

### Documentation par sujet

| Besoin | Fichier |
|--------|---------|
| **Démarrage rapide** | [QUICK_STORE_CHECKLIST.md](QUICK_STORE_CHECKLIST.md) |
| **Guide complet Play Store** | [GOOGLE_PLAY_CONSOLE_GUIDE.md](GOOGLE_PLAY_CONSOLE_GUIDE.md) |
| **Créer les images** | [ASSETS_CREATION_GUIDE.md](ASSETS_CREATION_GUIDE.md) |
| **Sécuriser les API keys** | [API_KEYS_SETUP.md](API_KEYS_SETUP.md) |
| **Alerte sécurité** | [URGENT_SECURITY_WARNING.md](URGENT_SECURITY_WARNING.md) |
| **Sécurité complète** | [SECURITY.md](SECURITY.md) |

### Commandes utiles

```bash
# Tester la configuration des API keys
npm run test-api-keys

# Configurer EAS Secrets (Windows)
.\scripts\setup-eas-secrets.ps1

# Configurer EAS Secrets (Mac/Linux)
./scripts/setup-eas-secrets.sh

# Lister les secrets EAS
eas secret:list

# Builder l'app
eas build --platform android --profile production

# Vérifier git status
git status
```

---

## ✅ Quand vous aurez tout fait

Une fois toutes les étapes complétées, votre application sera:

- 🔐 **Sécurisée** (API keys protégées)
- 📝 **Documentée** (tous les textes prêts)
- ⚖️ **Conforme** (politiques en ligne)
- 🎨 **Présentable** (assets professionnels)
- 📦 **Buildée** (AAB généré)
- 🏪 **Soumise** (en attente d'approbation Google)

**Délai d'approbation**: 3-7 jours pour la première soumission

---

**Bon courage pour la publication! 🚀**

**Questions ?** Relisez les guides dans l'ordre:
1. [QUICK_STORE_CHECKLIST.md](QUICK_STORE_CHECKLIST.md)
2. [ASSETS_CREATION_GUIDE.md](ASSETS_CREATION_GUIDE.md)
3. [GOOGLE_PLAY_CONSOLE_GUIDE.md](GOOGLE_PLAY_CONSOLE_GUIDE.md)
