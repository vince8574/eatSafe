# 📱 Guide Complet - Google Play Console

## Table des matières

1. [Accès à Google Play Console](#1-accès-à-google-play-console)
2. [Détails de l'application](#2-détails-de-lapplication)
3. [Assets graphiques](#3-assets-graphiques)
4. [Classification du contenu](#4-classification-du-contenu)
5. [Tarifs et distribution](#5-tarifs-et-distribution)
6. [Politique de confidentialité](#6-politique-de-confidentialité)
7. [Checklist finale](#7-checklist-finale)

---

## 1. Accès à Google Play Console

### Créer/Accéder à votre compte développeur

1. **Aller sur Google Play Console**
   - URL: https://play.google.com/console

2. **Créer un compte développeur** (si pas déjà fait)
   - Frais unique: 25 USD
   - Informations requises: Nom, email, pays

3. **Créer une nouvelle application**
   - Cliquer sur "Créer une application"
   - Nom: **Numeline**
   - Langue par défaut: Français
   - Type: Application
   - Gratuit/Payant: Gratuit (avec achats intégrés)

---

## 2. Détails de l'application

### 2.1 Fiche du Play Store

Aller dans: **Croissance → Fiche du Play Store → Détails de l'application**

#### Nom de l'application
```
Numeline
```
- Maximum: 30 caractères
- **Important**: Doit correspondre au nom dans [app.json](app.json) (`"name": "Numeline"`)

#### Description courte
```
Scannez vos produits et recevez des alertes en cas de rappel alimentaire aux États-Unis
```
- Maximum: 80 caractères
- Actuellement: 79 caractères ✅

#### Description complète

Copiez ce texte (4000 caractères max):

```
🛡️ Protégez votre santé avec Numeline

Numeline est l'application essentielle pour suivre les rappels de produits alimentaires aux États-Unis. Scannez vos produits et recevez des notifications instantanées en cas de rappel officiel.

✨ FONCTIONNALITÉS PRINCIPALES

📸 Scan intelligent
• Scan de code-barres pour identifier automatiquement les produits
• Reconnaissance OCR des numéros de lot via l'appareil photo
• Saisie manuelle pour tous les autres cas
• Historique complet de tous vos scans

🚨 Alertes en temps réel
• Notifications push instantanées en cas de rappel
• Vérification automatique quotidienne de vos produits scannés
• Informations détaillées sur les risques (contamination, allergènes, etc.)
• Liens directs vers les avis officiels FDA/USDA

📊 Suivi personnalisé
• Tableau de bord avec statut de tous vos produits
• Filtres par statut (sûr, rappelé, en attente)
• Statistiques de scan
• Export de données (format PDF, Excel, CSV)

🔒 Confidentialité garantie
• Aucune photo stockée - tout est traité localement
• Seuls la marque et le numéro de lot sont sauvegardés
• Données stockées uniquement sur votre appareil
• Conformité RGPD et politique de confidentialité transparente

🌍 Sources officielles
• Base de données FDA (Food and Drug Administration)
• Base de données USDA (U.S. Department of Agriculture)
• Mise à jour quotidienne des rappels
• Couverture complète du marché américain

💼 FORMULES DISPONIBLES

Version gratuite
• 10 scans de produits
• Alertes de rappel
• Historique limité

Pack 500 scans
• 500 scans de produits
• Toutes les fonctionnalités gratuites
• Achat unique

Abonnement illimité
• Scans illimités
• Export de données (PDF, Excel, CSV)
• Formats réglementaires pour professionnels
• Support multi-sites (restaurateurs, distributeurs)
• Gestion d'équipe

🎯 POUR QUI ?

• Familles soucieuses de la sécurité alimentaire
• Personnes avec allergies alimentaires
• Parents de jeunes enfants
• Professionnels de la restauration
• Distributeurs et commerçants
• Organismes de contrôle qualité

⚠️ AVERTISSEMENT IMPORTANT

Cette application fournit des informations sur les rappels de produits alimentaires à titre informatif uniquement. Elle ne constitue pas un avis médical ou professionnel.

• Les informations proviennent de bases de données publiques (FDA, USDA)
• Nous ne garantissons pas l'exactitude, l'exhaustivité ou l'actualité des informations
• L'absence de rappel ne garantit pas la sécurité du produit
• En cas de doute, consultez toujours les sources officielles et un professionnel de santé
• L'application ne vérifie pas les dates de péremption ou la fraîcheur des produits

📞 SUPPORT

Questions ? Contactez-nous à [VOTRE_EMAIL]
Politique de confidentialité : [URL_PRIVACY_POLICY]
Conditions d'utilisation : [URL_TERMS]

🚀 Téléchargez Numeline dès maintenant et protégez votre santé !
```

**Actions requises**:
- Remplacer `[VOTRE_EMAIL]` par votre email de contact
- Remplacer `[URL_PRIVACY_POLICY]` par l'URL de votre politique de confidentialité
- Remplacer `[URL_TERMS]` par l'URL de vos conditions d'utilisation

---

### 2.2 Informations de l'application

#### Catégorie
```
Catégorie: Santé et remise en forme
Tags: santé, alimentation, sécurité alimentaire, rappels
```

#### Coordonnées
```
Email: [VOTRE_EMAIL_SUPPORT]
Site web: [VOTRE_SITE_WEB] (optionnel)
Téléphone: [VOTRE_NUMERO] (optionnel)
```

#### Confidentialité
```
URL de la politique de confidentialité: [URL_VERS_PRIVACY_POLICY.HTML]
```

**Note**: Vous devrez héberger [privacy-policy.html](privacy-policy.html) sur un serveur web accessible publiquement.

---

## 3. Assets graphiques

Aller dans: **Croissance → Fiche du Play Store → Assets graphiques**

### 3.1 Icône de l'application

**Requis**: Oui
**Format**: PNG (pas de transparence)
**Dimensions**: 512 x 512 pixels
**Taille max**: 1 MB

**Votre icône actuelle**: [assets/icon.png](assets/icon.png)

**Actions requises**:
1. Vérifier que [assets/icon.png](assets/icon.png) fait 512x512 pixels
2. Si non, redimensionner :
   ```bash
   # Avec ImageMagick
   magick convert assets/icon.png -resize 512x512 assets/icon-512.png
   ```

### 3.2 Feature Graphic (Bannière)

**Requis**: Oui
**Format**: PNG ou JPG
**Dimensions**: 1024 x 500 pixels
**Taille max**: 1 MB

**À créer**: Une bannière avec le logo Numeline + slogan

**Suggestions de design**:
```
┌────────────────────────────────────────────────────┐
│                                                    │
│   [Logo Numeline]    Protégez votre santé         │
│                      Alertes rappels alimentaires  │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Outils recommandés**:
- Canva: https://www.canva.com/
- Figma: https://www.figma.com/
- Adobe Express: https://www.adobe.com/express/

**Template dimensions**: 1024 x 500 px

### 3.3 Captures d'écran

**Requis**: Minimum 2, maximum 8
**Format**: PNG ou JPG
**Dimensions recommandées**: 1080 x 1920 pixels (ratio 9:16)
**Taille max**: 8 MB par image

**Écrans à capturer**:

1. **Écran d'accueil** (Home)
   - Montrer le dashboard avec statistiques
   - Texte overlay: "Tableau de bord intuitif"

2. **Scan de code-barres**
   - Scanner en action
   - Texte: "Scan rapide par code-barres"

3. **Scan de numéro de lot**
   - OCR en action
   - Texte: "Reconnaissance automatique du lot"

4. **Alerte de rappel**
   - Modal d'alerte rouge
   - Texte: "Alertes instantanées en cas de rappel"

5. **Historique**
   - Liste des produits scannés
   - Texte: "Suivez tous vos produits"

6. **Détails produit**
   - Informations de rappel
   - Texte: "Informations officielles FDA/USDA"

7. **Paramètres / Abonnements**
   - Page des formules
   - Texte: "Formules adaptées à vos besoins"

**Comment faire des captures**:

```bash
# Option 1: Depuis l'émulateur Android Studio
# Utiliser l'outil de capture intégré

# Option 2: Depuis un appareil physique
# Utiliser adb
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Option 3: Depuis Expo
# Lancer l'app et faire des captures avec votre téléphone
```

**Post-production recommandée**:
- Ajouter un device frame (cadre de téléphone)
- Ajouter du texte overlay explicatif
- Utiliser https://screenshots.pro/ ou https://www.mockuphone.com/

### 3.4 Vidéo promotionnelle (Optionnel)

**Format**: YouTube URL
**Durée**: 30 secondes - 2 minutes

**Script suggéré**:
```
0:00-0:05 : Logo Numeline + slogan
0:05-0:15 : Scan d'un produit (code-barres + lot)
0:15-0:25 : Alerte de rappel (animation)
0:25-0:35 : Dashboard + historique
0:35-0:45 : Téléchargement + CTA "Téléchargez maintenant"
```

---

## 4. Classification du contenu

Aller dans: **Politique → Classification du contenu**

### Questionnaire

**Type d'application**: Application
**Catégorie**: Santé et remise en forme

**Questions importantes**:

1. **Votre application contient-elle de la violence ?**
   - ❌ Non

2. **Votre application affiche-t-elle du contenu pour adultes ?**
   - ❌ Non

3. **Votre application permet-elle aux utilisateurs de communiquer ?**
   - ❌ Non (pas de chat/messagerie)

4. **Votre application partage-t-elle la position de l'utilisateur ?**
   - ❌ Non

5. **Votre application collecte-t-elle des données personnelles ?**
   - ✅ Oui
   - Données collectées: Email, historique de scans
   - Usage: Authentification et suivi des produits

6. **Votre application contient-elle de la publicité ?**
   - ❌ Non

7. **Votre application propose-t-elle des achats intégrés ?**
   - ✅ Oui
   - Abonnements et packs de scans

### Âge cible

```
Public cible: 16 ans et plus
(Application de santé, nécessite maturité pour comprendre les alertes)
```

---

## 5. Tarifs et distribution

Aller dans: **Politique → Tarifs et distribution**

### 5.1 Pays de distribution

**Recommandation**: Sélectionner uniquement les États-Unis au début

```
☑ États-Unis
```

**Pourquoi ?**
- Les données de rappel proviennent de la FDA/USDA (USA uniquement)
- Éviter la confusion dans d'autres pays
- Possibilité d'étendre plus tard avec d'autres sources de données

### 5.2 Tarification

```
Application gratuite: ✅ Oui
Contient des achats intégrés: ✅ Oui
Contient des publicités: ❌ Non
```

### 5.3 Achats intégrés

**À configurer dans**: **Monétisation → Produits → Abonnements**

**Produits à créer**:

1. **Pack 500 scans**
   ```
   ID: pack_500_scans
   Nom: Pack 500 scans
   Description: Achetez 500 scans supplémentaires
   Prix: 4,99 USD (à définir)
   Type: Achat unique (consommable)
   ```

2. **Abonnement Illimité Mensuel**
   ```
   ID: subscription_unlimited_monthly
   Nom: Abonnement Illimité
   Description: Scans illimités, export de données, support multi-sites
   Prix: 9,99 USD/mois (à définir)
   Type: Abonnement avec renouvellement automatique
   Période d'essai: 7 jours gratuits (optionnel)
   ```

3. **Abonnement Illimité Annuel**
   ```
   ID: subscription_unlimited_yearly
   Nom: Abonnement Illimité Annuel
   Description: Scans illimités, export de données, support multi-sites (économisez 20%)
   Prix: 99,99 USD/an (à définir)
   Type: Abonnement avec renouvellement automatique
   ```

---

## 6. Politique de confidentialité

### 6.1 Héberger la politique de confidentialité

**Fichier à héberger**: [privacy-policy.html](privacy-policy.html)

**Options d'hébergement**:

#### Option 1: GitHub Pages (Gratuit)

```bash
# 1. Créer un repo GitHub (ou utiliser celui existant)
git add privacy-policy.html terms-of-service.html
git commit -m "Add legal documents"
git push

# 2. Activer GitHub Pages
# Aller sur: Settings → Pages
# Source: Deploy from branch → main → /root
# Sauvegarder

# 3. URL sera:
# https://VOTRE_USERNAME.github.io/REPO_NAME/privacy-policy.html
```

#### Option 2: Firebase Hosting (Gratuit)

```bash
# 1. Installer Firebase CLI
npm install -g firebase-tools

# 2. Initialiser Firebase Hosting
firebase init hosting

# 3. Copier les fichiers dans le dossier public
cp privacy-policy.html public/
cp terms-of-service.html public/

# 4. Déployer
firebase deploy --only hosting

# 5. URL sera:
# https://VOTRE_PROJET.web.app/privacy-policy.html
```

#### Option 3: Vercel/Netlify (Gratuit)

1. Créer un compte sur https://vercel.com/ ou https://netlify.com/
2. Connecter votre repo GitHub
3. Déployer automatiquement

### 6.2 Ajouter l'URL dans app.json

Après hébergement, mettez à jour:

```json
// app.json
{
  "expo": {
    "privacy": "public",
    "privacyPolicyUrl": "https://VOTRE_URL/privacy-policy.html"
  }
}
```

---

## 7. Checklist finale

### Avant de soumettre l'application

- [ ] **Détails de l'application**
  - [ ] Nom: Numeline
  - [ ] Description courte (80 caractères)
  - [ ] Description complète (avec URLs mises à jour)
  - [ ] Email de contact configuré

- [ ] **Assets graphiques**
  - [ ] Icône 512x512 uploadée
  - [ ] Feature graphic 1024x500 créée et uploadée
  - [ ] Minimum 2 captures d'écran uploadées
  - [ ] (Optionnel) Vidéo YouTube ajoutée

- [ ] **Classification**
  - [ ] Questionnaire de contenu complété
  - [ ] Âge cible défini (16+)
  - [ ] Classification ESRB/PEGI obtenue

- [ ] **Politique de confidentialité**
  - [ ] privacy-policy.html hébergé en ligne
  - [ ] URL ajoutée dans Google Play Console
  - [ ] terms-of-service.html hébergé en ligne

- [ ] **Distribution**
  - [ ] Pays sélectionnés (USA recommandé au début)
  - [ ] Tarification configurée (Gratuit + achats intégrés)

- [ ] **Achats intégrés**
  - [ ] Pack 500 scans configuré
  - [ ] Abonnement mensuel configuré
  - [ ] Abonnement annuel configuré

- [ ] **Build**
  - [ ] AAB généré avec EAS Build
  - [ ] Version uploadée dans Production
  - [ ] Tests internes effectués

- [ ] **Sécurité**
  - [ ] API Keys sécurisées (EAS Secrets configurés)
  - [ ] Ancienne clé révoquée
  - [ ] Nouvelle clé testée

---

## 8. Soumettre l'application

### Étape 1: Générer le AAB

```bash
# Vérifier que les secrets EAS sont configurés
eas secret:list

# Générer le build de production
eas build --platform android --profile production

# Attendre la fin du build (peut prendre 10-20 minutes)
# Télécharger le AAB depuis https://expo.dev/
```

### Étape 2: Uploader le AAB

1. **Aller dans**: Production → Releases → Créer une release

2. **Uploader le AAB**
   - Cliquer sur "Upload"
   - Sélectionner le fichier .aab téléchargé

3. **Nom de la version**
   ```
   Version 1.0.0
   ```

4. **Notes de version** (Release notes)
   ```
   🎉 Première version de Numeline !

   Fonctionnalités:
   • Scan de code-barres et numéros de lot
   • Alertes en temps réel en cas de rappel
   • Base de données FDA/USDA
   • Historique complet des scans
   • Formules gratuites et premium
   ```

### Étape 3: Soumettre pour examen

1. **Vérifier tous les prérequis**
   - Toutes les sections doivent avoir une ✅ verte

2. **Cliquer sur "Envoyer pour examen"**

3. **Délai de traitement**
   - Première soumission: 3-7 jours
   - Mises à jour: 1-3 jours

---

## 9. Après la publication

### Suivi

**Aller dans**: Tableau de bord

- **Statistiques**: Téléchargements, installations actives
- **Avis**: Répondre aux avis utilisateurs
- **Crashs**: Monitorer les rapports de plantage

### Mises à jour

Pour publier une mise à jour:

```bash
# 1. Incrémenter la version dans app.json
# "version": "1.0.1"
# "android.versionCode": 2

# 2. Builder la nouvelle version
eas build --platform android --profile production

# 3. Uploader le nouveau AAB dans Google Play Console
# Production → Releases → Créer une release

# 4. Ajouter les notes de version

# 5. Soumettre pour examen
```

---

## 📞 Support

**Questions ?**
- Documentation EAS Build: https://docs.expo.dev/build/introduction/
- Google Play Console Help: https://support.google.com/googleplay/android-developer

**Fichiers de référence**:
- [google-play-store-listing.md](google-play-store-listing.md) - Textes complets
- [privacy-policy.html](privacy-policy.html) - Politique de confidentialité
- [terms-of-service.html](terms-of-service.html) - Conditions d'utilisation
- [API_KEYS_SETUP.md](API_KEYS_SETUP.md) - Configuration des clés API
