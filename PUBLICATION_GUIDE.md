# Guide de publication - Numeline (eatSafe)

## 📱 Publication sur Google Play Store

### Prérequis
1. **Compte Google Play Developer** (coût unique de 25$)
2. **Bundle ID configuré** : `com.eatsafe.app` (déjà dans app.json)
3. **Icône et splash screen** prêts

### Étapes de publication

#### 1. Build Android (AAB)
```bash
# Nettoyer et rebuild
cd android
./gradlew clean

# Générer le bundle de release
cd ..
eas build --platform android --profile production
```

Ou en local:
```bash
cd android
./gradlew bundleRelease
```

Le fichier AAB sera dans: `android/app/build/outputs/bundle/release/app-release.aab`

#### 2. Signer l'application
Si ce n'est pas déjà fait, créer un keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore numeline-release.keystore -alias numeline-key -keyalg RSA -keysize 2048 -validity 10000
```

Configurer dans `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=numeline-release.keystore
MYAPP_RELEASE_KEY_ALIAS=numeline-key
MYAPP_RELEASE_STORE_PASSWORD=VotreMotDePasse
MYAPP_RELEASE_KEY_PASSWORD=VotreMotDePasse
```

#### 3. Publier sur Play Console
1. Aller sur https://play.google.com/console
2. Créer une nouvelle application
3. Remplir:
   - **Nom**: Numeline
   - **Description courte** (80 caractères):
     > Food safety tracker - Scan products and check FDA recalls instantly

   - **Description complète** (4000 caractères):
     > Numeline helps food businesses track product safety by scanning barcodes and lot numbers to check against FDA recall databases.
     >
     > KEY FEATURES:
     > • Barcode scanning for quick product identification
     > • Lot number OCR recognition
     > • Real-time FDA recall checking
     > • Export history to PDF/Excel/CSV
     > • Multi-user support for teams
     > • Regulatory format reports for compliance
     >
     > PERFECT FOR:
     > • Food trucks
     > • Restaurants
     > • Schools and daycares
     > • Any food business prioritizing safety
     >
     > SUBSCRIPTION PLANS:
     > From $19/month with various tiers for different business sizes

4. **Screenshots** (minimum 2, recommandé 8):
   - Écran de scan de code-barres
   - Écran de scan de lot
   - Écran d'historique
   - Écran de détails produit
   - Écran d'export
   - Écran d'abonnements

5. **Classification du contenu**:
   - Pas de violence
   - Pas de contenu mature
   - Âge: Tous publics

6. **Prix**: Gratuit (avec achats in-app)

7. **Pays de distribution**: États-Unis en priorité

#### 4. Configuration des achats in-app
1. Dans Play Console > Monétisation > Produits
2. Créer les abonnements:
   - `foodtruck_starter` - 19$/mois
   - `foodtruck_pro` - 29$/mois
   - `restaurant_standard` - 39$/mois
   - `restaurant_premium` - 69$/mois
   - `school_security` - 59$/mois
   - `school_premium` - 99$/mois

3. Créer les achats uniques (packs de scans):
   - `pack_small` - 0.99$
   - `pack_medium` - 4.99$
   - `pack_large` - 9.99$
   - `pack_xlarge` - 19.99$

---

## 🍎 Publication sur Apple App Store

### Prérequis
1. **Apple Developer Account** (99$/an)
2. **Bundle ID**: `com.eatsafe.app` (déjà configuré)
3. **Mac avec Xcode** (pour build iOS)

### Étapes de publication

#### 1. Build iOS
```bash
# Via EAS Build (recommandé)
eas build --platform ios --profile production

# Ou avec Xcode
cd ios
pod install
xcodebuild -workspace eatSafe.xcworkspace -scheme eatSafe archive
```

#### 2. App Store Connect
1. Aller sur https://appstoreconnect.apple.com
2. Créer une nouvelle app
3. Remplir:
   - **Nom**: Numeline
   - **Sous-titre** (30 caractères):
     > Food Safety Recall Scanner

   - **Description** (4000 caractères):
     > Numeline is your essential food safety companion, helping businesses track products and check FDA recalls in real-time.
     >
     > FEATURES:
     > • Fast barcode scanning
     > • Intelligent lot number recognition
     > • Instant FDA recall alerts
     > • Professional export formats (PDF, Excel, CSV)
     > • Team collaboration features
     > • Compliance-ready reports
     >
     > DESIGNED FOR:
     > • Food service professionals
     > • Restaurant managers
     > • School cafeteria staff
     > • Food truck operators
     >
     > FLEXIBLE PRICING:
     > Choose from multiple subscription tiers starting at $19/month

4. **Mots-clés** (100 caractères):
   > food,safety,recall,FDA,scanner,barcode,restaurant,compliance,tracking

5. **Catégories**:
   - Principale: Food & Drink
   - Secondaire: Business

6. **Screenshots** (iPhone 6.5" et 5.5" minimum):
   - Mêmes captures que pour Android
   - Utiliser des mockups iPhone si nécessaire

#### 3. Configuration des achats in-app
1. Dans App Store Connect > In-App Purchases
2. Créer les abonnements auto-renouvelables:
   - Groupe d'abonnement: "Numeline Subscriptions"
   - Créer chaque tier avec son prix

3. Créer les produits consommables (packs de scans)

#### 4. Privacy & Permissions
Dans `app.json`, vérifier:
```json
"ios": {
  "infoPlist": {
    "NSCameraUsageDescription": "We need camera access to scan barcodes and lot numbers",
    "NSPhotoLibraryUsageDescription": "We need photo library access to save scan images"
  }
}
```

---

## 🔥 Configuration Firebase

### Achats in-app avec RevenueCat (recommandé)
Pour gérer les achats sur les deux plateformes:

```bash
npm install react-native-purchases
```

1. Créer un compte sur https://www.revenuecat.com
2. Configurer les produits
3. Lier Play Store et App Store
4. Utiliser l'API RevenueCat pour vérifier les abonnements

### Alternative: Gestion native
Utiliser `expo-in-app-purchases`:
```bash
npx expo install expo-in-app-purchases
```

---

## ✅ Checklist avant publication

### Général
- [ ] Version incrémentée dans `app.json`
- [ ] Icône et splash screen finalisés
- [ ] Toutes les traductions complètes
- [ ] Permissions demandées sont justifiées
- [ ] Privacy policy URL configurée
- [ ] Terms of service URL configurée

### Android
- [ ] Keystore sauvegardé en lieu sûr
- [ ] Bundle signé et testé
- [ ] Screenshots 16:9 prêts
- [ ] Description traduite si multilingue
- [ ] Achats in-app configurés dans Play Console

### iOS
- [ ] Certificats de distribution créés
- [ ] Provisioning profiles configurés
- [ ] Screenshots iPhone et iPad prêts
- [ ] Métadonnées complètes dans App Store Connect
- [ ] Achats in-app configurés et approuvés

---

## 📊 Analytics & Monitoring

### Firebase Analytics (déjà configuré)
- Suivre les scans
- Taux de conversion abonnements
- Rétention utilisateurs

### Crashlytics
```bash
npx expo install @react-native-firebase/crashlytics
```

### Sentry (alternative)
```bash
npm install @sentry/react-native
npx sentry-wizard -i reactNative -p ios android
```

---

## 🚀 Publication Expo (plus simple)

Si vous utilisez Expo managed workflow:

```bash
# Build et submit en une commande
eas build --platform all --auto-submit

# Ou séparément
eas submit --platform ios
eas submit --platform android
```

---

## 📝 Notes importantes

1. **Délai d'approbation**:
   - Google Play: 1-3 jours
   - Apple App Store: 1-7 jours

2. **Rejets fréquents**:
   - Permissions mal justifiées
   - Screenshots de mauvaise qualité
   - Achats in-app non fonctionnels
   - Bugs critiques

3. **Tests avant publication**:
   - Tester sur vrais devices (pas émulateur)
   - Tester les achats in-app en sandbox
   - Vérifier tous les flux utilisateur
   - Tester en mode release (pas debug)

4. **Après publication**:
   - Monitorer les crashs quotidiennement
   - Répondre aux reviews
   - Publier des updates régulières
   - Suivre les métriques clés (rétention, conversion)

---

## 🆘 Ressources

- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Google Play Console](https://support.google.com/googleplay/android-developer)
- [App Store Connect](https://developer.apple.com/app-store-connect/)
- [Firebase Console](https://console.firebase.google.com/)
- [RevenueCat Docs](https://docs.revenuecat.com/)
