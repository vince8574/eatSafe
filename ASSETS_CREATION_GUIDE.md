# 🎨 Guide de Création des Assets Graphiques

Guide complet pour créer tous les assets nécessaires au Google Play Store.

---

## 📐 Spécifications techniques

| Asset | Dimensions | Format | Taille max | Requis |
|-------|------------|--------|------------|---------|
| Icône | 512 x 512 px | PNG (pas de transparence) | 1 MB | ✅ Oui |
| Feature Graphic | 1024 x 500 px | PNG ou JPG | 1 MB | ✅ Oui |
| Screenshots | 1080 x 1920 px | PNG ou JPG | 8 MB | ✅ Min. 2 |
| Vidéo promo | - | YouTube URL | - | ❌ Optionnel |

---

## 1️⃣ Icône de l'application (512x512)

### Vérifier l'icône actuelle

Votre icône est dans [assets/icon.png](assets/icon.png).

**Vérifier les dimensions**:
```bash
# Sur Windows (PowerShell)
Get-ChildItem assets/icon.png | Select-Object Name, Length

# Sur Mac/Linux
file assets/icon.png
identify assets/icon.png  # Avec ImageMagick
```

### Redimensionner si nécessaire

**Avec ImageMagick** (gratuit):
```bash
# Installer ImageMagick
# Windows: https://imagemagick.org/script/download.php#windows
# Mac: brew install imagemagick
# Linux: apt-get install imagemagick

# Redimensionner
magick convert assets/icon.png -resize 512x512 assets/icon-512.png
```

**Avec GIMP** (gratuit):
1. Ouvrir assets/icon.png dans GIMP
2. Image → Échelle et taille de l'image
3. Largeur: 512, Hauteur: 512
4. Interpolation: Cubique
5. Échelle
6. Fichier → Exporter sous → icon-512.png

**En ligne** (gratuit):
- https://www.iloveimg.com/resize-image
- https://redketchup.io/image-resizer

### Supprimer la transparence

**Important**: Google Play n'accepte pas la transparence pour l'icône.

**Avec ImageMagick**:
```bash
magick convert assets/icon-512.png -background white -alpha remove -alpha off icon-512-no-alpha.png
```

**Avec GIMP**:
1. Calque → Transparence → Supprimer le canal alpha
2. Ou: Ajouter un calque de fond blanc

---

## 2️⃣ Feature Graphic (1024x500)

### Option A: Canva (Recommandé - Gratuit)

**Étapes**:

1. **Aller sur Canva**
   - https://www.canva.com/
   - Créer un compte gratuit

2. **Créer un design personnalisé**
   - Dimensions: 1024 x 500 pixels
   - Cliquer sur "Créer un design" → "Taille personnalisée"

3. **Template suggéré**:

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   [Logo 200x200]    Numeline                                  │
│                     Protégez votre santé                       │
│                     Alertes rappels alimentaires USA           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Éléments à ajouter**:
- Logo Numeline (importer assets/icon.png)
- Texte "Numeline" (Police: Montserrat Bold, 48px)
- Slogan "Protégez votre santé" (Police: Montserrat Regular, 32px)
- Sous-titre "Alertes rappels alimentaires USA" (Police: Montserrat Light, 24px)

**Couleurs** (selon votre thème):
```
Primaire: #0BAE86 (vert)
Secondaire: #0A1F1F (noir foncé)
Surface: #FFFFFF (blanc)
```

4. **Télécharger**
   - Format: PNG
   - Qualité: Standard
   - Nom: feature-graphic.png

### Option B: Figma (Gratuit)

1. Créer un compte sur https://figma.com/
2. Nouveau fichier → Frame: 1024 x 500
3. Ajouter logo, texte, éléments graphiques
4. Export → PNG → 1x

### Option C: Adobe Express (Gratuit)

1. https://www.adobe.com/express/
2. Créer → Taille personnalisée → 1024 x 500
3. Utiliser templates "Banner" ou "Header"
4. Personnaliser avec votre logo et texte

### Templates prêts à l'emploi

**Exemples de layouts**:

**Layout 1 - Minimaliste**:
```
[Logo]  Numeline
        Votre gardien de sécurité alimentaire
```

**Layout 2 - Centré**:
```
                 Numeline
        [Logo]
    Alertes rappels alimentaires
```

**Layout 3 - Avec capture d'écran**:
```
[Screenshot]    Numeline
                Scannez. Vérifiez. Soyez en sécurité.
```

---

## 3️⃣ Captures d'écran (1080x1920)

### Faire les captures d'écran

#### Option A: Émulateur Android Studio

```bash
# 1. Lancer l'émulateur Android Studio
# 2. Lancer l'app: npx expo run:android
# 3. Dans l'émulateur: Cliquer sur l'icône caméra (Ctrl+S)
# 4. Les screenshots sont dans ~/Pictures/Screenshots/
```

#### Option B: Appareil physique

```bash
# 1. Connecter votre téléphone Android
# 2. Activer le débogage USB
# 3. Lancer l'app: npx expo run:android

# Méthode 1: Via ADB
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ./screenshots/

# Méthode 2: Directement sur le téléphone
# Bouton Power + Volume Bas
```

#### Option C: Expo Go (Développement)

```bash
# 1. Lancer: npx expo start
# 2. Scanner le QR code avec Expo Go
# 3. Faire des screenshots sur votre téléphone
# 4. Transférer vers votre PC
```

### Écrans à capturer

**Liste recommandée** (ordre d'importance):

1. **Écran d'accueil / Dashboard** ⭐ PRIORITÉ 1
   - Vue d'ensemble avec statistiques
   - Montre les produits scannés

2. **Scan en action** ⭐ PRIORITÉ 1
   - Caméra avec overlay de scan
   - Montre la fonctionnalité principale

3. **Alerte de rappel** ⭐ PRIORITÉ 2
   - Modal rouge avec avertissement
   - Montre la valeur de l'app

4. **Historique** ⭐ PRIORITÉ 2
   - Liste des produits
   - Filtres visibles

5. **Détails produit** ⭐ PRIORITÉ 3
   - Informations complètes
   - Statut de rappel

6. **Scan de lot** ⭐ PRIORITÉ 3
   - OCR en action
   - Numéro de lot détecté

7. **Abonnements** (Optionnel)
   - Page des formules
   - Prix clairement affichés

### Post-production des screenshots

**Ajouter des cadres de téléphone** (Device Frames):

#### Outil 1: MockUPhone (Gratuit)
https://mockuphone.com/

1. Upload screenshot
2. Choisir: Google Pixel 6 Pro (ou similaire)
3. Télécharger avec le cadre

#### Outil 2: Screely (Gratuit)
https://www.screely.com/

1. Upload screenshot
2. Ajouter ombre, fond coloré
3. Télécharger

#### Outil 3: Screenshots.pro (Gratuit)
https://screenshots.pro/

1. Upload screenshots (batch)
2. Choisir device frame
3. Ajouter texte overlay (optionnel)
4. Télécharger tout

**Ajouter du texte explicatif**:

**Exemple avec Canva**:
1. Créer design 1080 x 1920
2. Importer screenshot
3. Ajouter zone de texte en haut ou en bas:
   - "Scannez vos produits en quelques secondes"
   - "Alertes instantanées en cas de rappel"
   - "Consultez votre historique complet"

**Templates de texte suggérés**:

| Screenshot | Texte overlay |
|------------|---------------|
| Dashboard | "Tableau de bord intuitif" |
| Scan barcode | "Scan rapide par code-barres" |
| Scan lot | "Reconnaissance automatique du lot" |
| Alerte | "Alertes instantanées en cas de rappel" |
| Historique | "Suivez tous vos produits" |
| Détails | "Informations officielles FDA/USDA" |

### Optimisation des images

**Réduire la taille** (si > 8 MB):

```bash
# Avec ImageMagick
magick convert screenshot.png -quality 85 screenshot-optimized.png

# Avec pngquant (meilleure compression PNG)
pngquant --quality=80-90 screenshot.png
```

**En ligne**:
- https://tinypng.com/
- https://compressor.io/

---

## 4️⃣ Vidéo promotionnelle (Optionnel)

### Créer une vidéo simple

**Outils recommandés**:

1. **CapCut** (Gratuit - Mobile & Desktop)
   - https://www.capcut.com/
   - Parfait pour montages simples

2. **DaVinci Resolve** (Gratuit - Desktop)
   - https://www.blackmagicdesign.com/products/davinciresolve
   - Plus professionnel

3. **Canva Video** (Gratuit)
   - https://www.canva.com/video-editor/
   - Templates prêts à l'emploi

### Script vidéo (30-45 secondes)

```
[0:00-0:05] Logo Numeline + animation d'apparition
            Texte: "Numeline"

[0:05-0:15] Montage rapide de scans
            - Scan code-barres
            - Scan numéro de lot
            - Résultat "SAFE" ou "RECALLED"

[0:15-0:25] Dashboard avec notifications
            Texte: "Alertes en temps réel"

[0:25-0:35] Historique des produits
            Texte: "Protégez votre famille"

[0:35-0:45] CTA (Call To Action)
            Texte: "Téléchargez Numeline"
            Logo Google Play
```

### Uploader sur YouTube

1. Créer une chaîne YouTube (si nécessaire)
2. Uploader la vidéo en "Non répertorié"
3. Titre: "Numeline - Food Safety Scanner"
4. Copier l'URL YouTube
5. Coller dans Google Play Console

**Exemple URL**: `https://www.youtube.com/watch?v=XXXXX`

---

## 5️⃣ Organisation des fichiers

**Structure recommandée**:

```
eatSafe/
├── assets/
│   ├── icon.png              (original)
│   ├── icon-512.png          (pour Play Store)
│   └── adaptive-icon.png
│
├── store-assets/
│   ├── icon-512.png          (icône finale)
│   ├── feature-graphic.png   (1024x500)
│   ├── screenshots/
│   │   ├── 01-home.png       (1080x1920)
│   │   ├── 02-scan.png
│   │   ├── 03-alert.png
│   │   ├── 04-history.png
│   │   └── 05-details.png
│   └── promo-video.mp4       (optionnel)
```

### Créer le dossier

```bash
# Créer le dossier
mkdir -p store-assets/screenshots

# Déplacer les fichiers (exemple)
cp assets/icon-512.png store-assets/
cp feature-graphic.png store-assets/
cp screenshots/*.png store-assets/screenshots/
```

---

## 6️⃣ Validation des assets

### Checklist finale

- [ ] **Icône** (512x512)
  - [ ] Dimensions correctes
  - [ ] Pas de transparence
  - [ ] Format PNG
  - [ ] < 1 MB

- [ ] **Feature Graphic** (1024x500)
  - [ ] Dimensions correctes
  - [ ] Bonne qualité visuelle
  - [ ] Logo visible
  - [ ] Texte lisible
  - [ ] < 1 MB

- [ ] **Screenshots** (1080x1920)
  - [ ] Minimum 2 images
  - [ ] Dimensions correctes
  - [ ] Écrans variés (home, scan, alert, history)
  - [ ] Texte lisible (pas trop petit)
  - [ ] < 8 MB chacun

- [ ] **(Optionnel) Vidéo**
  - [ ] Uploadée sur YouTube
  - [ ] Durée: 30s - 2min
  - [ ] URL copiée

### Tester les images

**Vérifier dimensions et taille**:

```bash
# Windows (PowerShell)
Get-ChildItem store-assets/*.png | ForEach-Object {
    Write-Host $_.Name "-" $_.Length "bytes"
}

# Mac/Linux
ls -lh store-assets/*.png

# Vérifier dimensions avec ImageMagick
identify store-assets/*.png
```

**Résultat attendu**:
```
icon-512.png         512x512   < 1MB
feature-graphic.png  1024x500  < 1MB
01-home.png         1080x1920 < 8MB
02-scan.png         1080x1920 < 8MB
...
```

---

## 📚 Ressources

**Outils gratuits**:
- Canva: https://www.canva.com/
- Figma: https://figma.com/
- GIMP: https://www.gimp.org/
- ImageMagick: https://imagemagick.org/
- MockUPhone: https://mockuphone.com/
- Screenshots.pro: https://screenshots.pro/
- TinyPNG: https://tinypng.com/

**Templates**:
- Feature Graphics: https://www.canva.com/templates/
- App Screenshots: https://www.mockuphone.com/

**Documentation officielle**:
- Google Play Asset Guidelines: https://support.google.com/googleplay/android-developer/answer/9866151

---

## ✅ Prochaines étapes

Une fois tous les assets créés, passez à:
1. [QUICK_STORE_CHECKLIST.md](QUICK_STORE_CHECKLIST.md) - Checklist rapide
2. [GOOGLE_PLAY_CONSOLE_GUIDE.md](GOOGLE_PLAY_CONSOLE_GUIDE.md) - Guide complet

Bon courage! 🚀
