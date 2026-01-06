# Checklist de publication Google Play Store

## 🔐 Étape 1: Générer la clé de signature (Keystore)

```bash
# Dans le dossier android/app
cd android/app

# Générer la clé (remplacez les valeurs)
keytool -genkeypair -v -storetype PKCS12 \
  -keystore numeline-release.keystore \
  -alias numeline-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Informations à fournir:
# - Password: [CHOISIR UN MOT DE PASSE SÉCURISÉ]
# - First and last name: Votre nom
# - Organizational unit: Votre équipe
# - Organization: Votre entreprise
# - City/Locality: Votre ville
# - State/Province: Votre région
# - Country code: FR (ou US)
```

**IMPORTANT:**
- ⚠️ **SAUVEGARDEZ CE FICHIER ET LE MOT DE PASSE!**
- ⚠️ Si vous perdez cette clé, vous ne pourrez JAMAIS mettre à jour l'app!
- Stockez-la dans un endroit sûr (cloud chiffré, coffre-fort, etc.)

## 📝 Étape 2: Configurer Gradle

Créez `android/gradle.properties` et ajoutez (sans commit Git!):

```properties
NUMELINE_UPLOAD_STORE_FILE=numeline-release.keystore
NUMELINE_UPLOAD_KEY_ALIAS=numeline-key
NUMELINE_UPLOAD_STORE_PASSWORD=VOTRE_MOT_DE_PASSE
NUMELINE_UPLOAD_KEY_PASSWORD=VOTRE_MOT_DE_PASSE
```

Modifiez `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('NUMELINE_UPLOAD_STORE_FILE')) {
                storeFile file(NUMELINE_UPLOAD_STORE_FILE)
                storePassword NUMELINE_UPLOAD_STORE_PASSWORD
                keyAlias NUMELINE_UPLOAD_KEY_ALIAS
                keyPassword NUMELINE_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

## 🏗️ Étape 3: Builder l'AAB de production

```bash
# Clean
cd android
./gradlew clean

# Build AAB (Android App Bundle - format recommandé)
./gradlew bundleRelease

# Ou APK si nécessaire
./gradlew assembleRelease

# Le fichier sera dans:
# android/app/build/outputs/bundle/release/app-release.aab
# ou
# android/app/build/outputs/apk/release/app-release.apk
```

## 🎨 Étape 4: Préparer les assets du Store

### Screenshots (obligatoire)
- **Minimum:** 2 screenshots
- **Recommandé:** 8 screenshots
- **Format:** PNG ou JPG
- **Taille:**
  - Phone: 320px min, 3840px max (ratio 16:9 ou 9:16)
  - Tablet 7": 1024 x 600 min
  - Tablet 10": 1920 x 1200 min

**Captures à faire:**
1. Écran d'accueil (Home)
2. Scan de produit
3. Résultat de scan (Safe)
4. Résultat de scan (Recalled) - IMPORTANT
5. Historique
6. Détails d'un produit
7. Abonnements
8. Paramètres/Team

### Feature Graphic (obligatoire)
- **Taille:** 1024 x 500 px
- **Format:** PNG ou JPG
- Design attractif avec logo et texte "Food Recall Scanner"

### App Icon (obligatoire)
- **Taille:** 512 x 512 px
- **Format:** PNG 32-bit
- Déjà dans: `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`

### Video (optionnel)
- URL YouTube de démo
- 30s-2min recommandé

## 📝 Étape 5: Rédiger les descriptions

### Titre de l'app (max 50 caractères)
```
Numeline - Food Recall Scanner
```

### Description courte (max 80 caractères)
```
Scan food products and get instant US recall alerts. Stay safe!
```

### Description complète (max 4000 caractères)

```markdown
🍎 STAY SAFE WITH INSTANT FOOD RECALL ALERTS

Numeline helps you protect your family, customers, and employees by scanning food products and checking them against official US recall databases in real-time.

✅ KEY FEATURES

• INSTANT RECALL CHECKS
Scan any food product and instantly know if it's been recalled by the FDA or USDA.

• BARCODE & LOT NUMBER SCANNING
Advanced OCR technology reads barcodes and lot numbers automatically.

• REAL-TIME ALERTS
Get notified immediately when a product you scanned is recalled.

• SCAN HISTORY
Track all your scanned products in one place with automatic recall monitoring.

• TEAM COLLABORATION
Create organizations, invite team members, and share scan history across your business.

• EXPORT REPORTS
Generate PDF, Excel, or CSV reports for compliance and record-keeping.

• OFFICIAL DATA SOURCES
100% based on official FDA and USDA recall databases - no guesswork.

🏢 PERFECT FOR

• Food Trucks & Restaurants
• Schools & Daycares
• Grocery Stores & Supermarkets
• Food Distribution Centers
• Families & Health-Conscious Consumers

💼 SUBSCRIPTION PLANS

Choose from flexible monthly plans or buy scan packs as needed:
- Food Truck: $19.99/month (500 scans)
- Restaurant Small: $39.99/month (1,500 scans)
- Restaurant Large: $79.99/month (5,000 scans)
- School Plans: Starting at $49.99/month

Or buy scan packs: 100, 500, 1000, or 2500 scans.

🔒 PRIVACY & SECURITY

• Photos processed locally - never stored
• Secure cloud sync with Firebase
• GDPR & US privacy compliant

⚠️ DISCLAIMER

This app provides recall information based on official public databases. It does not guarantee product safety or replace official government notifications. Always verify with official sources.

📧 SUPPORT

Questions? Contact us at support@numeline.app
```

### Catégorie
- **Principale:** Food & Drink
- **Secondaire:** Health & Fitness

### Tags
```
food safety, recall, FDA, USDA, food scanner, barcode, restaurant, food truck
```

## 🔒 Étape 6: Documents légaux (OBLIGATOIRE)

### Politique de confidentialité (Privacy Policy)
- **Format:** URL publique accessible
- **Hébergement:** GitHub Pages, votre site web, etc.
- **Fichier:** `PolitiqueConfidentialite.md` (à convertir en HTML)

**Héberger sur GitHub Pages:**
```bash
# 1. Créer un repo GitHub public
# 2. Upload PolitiqueConfidentialite.md
# 3. Activer GitHub Pages
# 4. URL: https://votreusername.github.io/numeline-privacy
```

### Autres documents
- ✅ CGU.md (Terms of Service) - Déjà fait
- ✅ MentionsLegales.md (Legal Notice) - Déjà fait
- ✅ RGPD.md (GDPR Compliance) - Déjà fait

## 📋 Étape 7: Formulaire de contenu du Play Store

### Questionnaire obligatoire

**Classification du contenu:**
- App adaptée à tous les publics
- Pas de violence, nudité, etc.

**Public cible:**
- 18 ans et plus (recommandé pour apps professionnelles)

**Fonctionnalités de santé:**
- ❌ Non (l'app ne donne pas de conseils médicaux)

**Collecte de données:**
Déclarer ce qui est collecté:
- ✅ Email
- ✅ Historique de scans
- ✅ Informations de paiement (via Google Play)

**Publicités:**
- ❌ Non (pas de publicités)

**In-app purchases:**
- ✅ Oui (abonnements et packs)

## 🧪 Étape 8: Tests avant publication

### Tests obligatoires
- [ ] Connexion Email/Password
- [ ] Connexion Google Sign-In
- [ ] Scan de produit (barcode + lot)
- [ ] Vérification recall US (FDA + FSIS)
- [ ] Achat d'abonnement (test sandbox)
- [ ] Achat de scan pack (test sandbox)
- [ ] Création d'organisation
- [ ] Invitation de membre
- [ ] Export PDF/Excel/CSV
- [ ] Changement de langue
- [ ] Mode sombre/clair

### Tests recommandés
- [ ] Performance (pas de lag)
- [ ] Mémoire (pas de fuite)
- [ ] Batterie (consommation normale)
- [ ] Rotation d'écran
- [ ] Différentes tailles d'écran
- [ ] Android 9, 10, 11, 12, 13, 14

## 📤 Étape 9: Upload sur Play Console

1. **Créer une nouvelle app**
   - Play Console > All apps > Create app
   - Nom: Numeline
   - Langue par défaut: Anglais (US)
   - Type: Application
   - Gratuit/Payant: Gratuit (avec achats in-app)

2. **Remplir les informations**
   - Description courte/longue
   - Screenshots
   - Feature graphic
   - App icon

3. **Configurer le pricing**
   - Gratuit à télécharger
   - Ajouter les produits In-App

4. **Upload l'AAB**
   - Production > Create new release
   - Upload `app-release.aab`
   - Notes de version

5. **Remplir le questionnaire de contenu**
   - Classification du contenu
   - Public cible
   - Politique de confidentialité URL

6. **Soumettre pour review**
   - Review prend 1-7 jours en général

## ⏱️ Timeline estimé

| Étape | Durée |
|-------|-------|
| Création compte Play Console | 48h (vérification) |
| Configuration In-App Billing | 2-4h |
| Build & signature | 1h |
| Préparation assets | 4-8h |
| Rédaction descriptions | 2h |
| Tests complets | 4-8h |
| Upload et formulaires | 2h |
| **Review Google** | **1-7 jours** |
| **TOTAL** | **2-3 semaines** |

## 💰 Coûts

| Item | Coût |
|------|------|
| Google Play Developer Account | $25 USD (une fois) |
| Hébergement Privacy Policy | Gratuit (GitHub Pages) |
| Firebase (Spark Plan) | Gratuit jusqu'à 10k users |
| **TOTAL INITIAL** | **$25** |

## ✅ Checklist finale avant soumission

- [ ] Règles Firestore publiées
- [ ] App testée sur Android physique
- [ ] In-App Billing configuré
- [ ] AAB signé généré
- [ ] Screenshots (min 2, recommandé 8)
- [ ] Feature graphic (1024x500)
- [ ] App icon (512x512)
- [ ] Description courte/longue
- [ ] Privacy Policy URL publique
- [ ] Tests de recalls US (FDA + FSIS)
- [ ] Keystore sauvegardé en lieu sûr
- [ ] Version number incrémenté (versionCode)
- [ ] Tests beta effectués
- [ ] Tous les documents légaux à jour

## 🆘 Ressources

- **Play Console:** https://play.google.com/console
- **Guide officiel:** https://developer.android.com/distribute/console
- **In-App Billing:** https://developer.android.com/google/play/billing
- **Asset templates:** https://developer.android.com/distribute/marketing-tools/device-art-generator
- **Politique exemple:** https://app-privacy-policy-generator.firebaseapp.com/

## 📞 Support

Si vous bloquez quelque part:
1. Consultez [PUBLICATION_GUIDE.md](PUBLICATION_GUIDE.md)
2. Vérifiez la doc Google Play
3. Demandez de l'aide!

---

**Prochaine étape:** Publier les règles Firestore et tester l'app! 🚀
