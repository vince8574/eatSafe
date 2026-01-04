# Build iOS pour Numeline

## Configuration complÃ©tÃ©e âœ…

Les modifications suivantes ont Ã©tÃ© effectuÃ©es pour supporter iOS avec les 286 044 marques :

### 1. Assets iOS
- Script `scripts/eas-build-pre-install.sh` crÃ©Ã©
- Copie automatiquement `brands.json` (5.2 MB) dans les ressources iOS lors du build EAS

### 2. Configuration EAS
- `eas.json` mis Ã  jour avec hook `postinstall` pour iOS
- Resource class `m-medium` configurÃ©e pour gÃ©rer le build avec assets volumineux

### 3. Chargement des marques
- `brandMatcher.ts` supporte dÃ©jÃ  le chargement depuis `FileSystem.bundleDirectory`
- Fonctionne automatiquement sur iOS et Android

## Comment builder pour iOS

### Option 1 : EAS Build (RecommandÃ© - depuis Windows)

1. **Installer EAS CLI** (si pas dÃ©jÃ  fait) :
```bash
npm install -g eas-cli
```

2. **Se connecter Ã  Expo** :
```bash
eas login
```

3. **Configurer le projet** (premiÃ¨re fois seulement) :
```bash
eas build:configure
```

4. **Lancer le build iOS** :

Pour un build de dÃ©veloppement (pour tester) :
```bash
eas build --platform ios --profile development
```

Pour un build de production :
```bash
eas build --platform ios --profile production
```

5. **RÃ©cupÃ©rer l'app** :
- Le build se fait sur les serveurs Expo (cloud)
- Tu recevras un lien pour tÃ©lÃ©charger le fichier `.ipa`
- Installer sur iPhone via TestFlight ou directement

### Option 2 : Build local (NÃ©cessite un Mac)

1. **GÃ©nÃ©rer les fichiers natifs iOS** (sur Mac) :
```bash
npx expo prebuild --platform ios
```

2. **Ouvrir dans Xcode** :
```bash
open ios/eatsok.xcworkspace
```

3. **Builder depuis Xcode** :
- SÃ©lectionner un device/simulateur
- Product â†’ Archive
- Distribuer l'app

## Structure des assets

### Android
```
android/app/src/main/assets/brands.json (5.2 MB)
```

### iOS (gÃ©nÃ©rÃ© lors du build)
```
ios/eatsok/Resources/brands.json (5.2 MB)
```

## Notes importantes

- âœ… Les 286 044 marques sont incluses dans l'app (pas de tÃ©lÃ©chargement)
- âœ… Chargement asynchrone au dÃ©marrage (pas de ralentissement)
- âœ… Cache en mÃ©moire aprÃ¨s premier chargement
- âœ… MÃªme code pour Android et iOS

## Taille de l'app

- **Android APK** : ~45-50 MB (avec les 286k marques)
- **iOS IPA** : ~50-55 MB (estimation)

Les marques reprÃ©sentent seulement 5.2 MB, le reste est le code React Native et les dÃ©pendances natives.

