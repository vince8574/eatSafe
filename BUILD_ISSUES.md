# Problème de Build Android - Gradle Daemon Crash

## 🔴 Problème

Le build APK échoue avec l'erreur:
```
Gradle build daemon disappeared unexpectedly (it may have been killed or may have crashed)
```

**Cause**: Le daemon Gradle manque de mémoire RAM pendant la phase `mergeLibDexDebug` / `mergeExtDexDebug`. C'est un problème fréquent sur Windows avec les gros projets React Native/Expo.

---

## ✅ Solutions

### Solution 1: Test en Mode Développement (RECOMMANDÉ - Immédiat)

Testez l'application **maintenant** sans builder d'APK:

```bash
# Démarrer le serveur Expo
npx expo start

# Sur votre téléphone:
# 1. Installez "Expo Go" depuis Play Store
# 2. Scannez le QR code affiché
# 3. L'app se lance avec toutes les nouvelles fonctionnalités
```

**Avantages**:
- ✅ Fonctionne immédiatement
- ✅ Hot reload (modifications en temps réel)
- ✅ Parfait pour tester l'authentification
- ✅ Testez le multi-utilisateurs facilement

**Note**: Toutes les fonctionnalités sont disponibles, y compris:
- Authentification email/password
- Google Sign-In
- Multi-utilisateurs
- Firebase Firestore
- Scan de produits

---

### Solution 2: Build APK avec Plus de RAM

Si vous avez besoin d'un APK standalone:

#### Option A: Utiliser EAS Build (Cloud - GRATUIT)

```bash
# 1. Installer EAS CLI
npm install -g eas-cli

# 2. Login Expo
eas login

# 3. Configurer le projet
eas build:configure

# 4. Build dans le cloud (GRATUIT pour builds Android)
eas build --platform android --profile preview

# L'APK sera téléchargeable après 10-15 minutes
```

**Avantages**:
- ✅ Build dans le cloud (pas de problème de RAM local)
- ✅ Gratuit pour Android
- ✅ APK optimisé et signé

#### Option B: Augmenter la RAM Gradle (Si vous avez >16GB RAM)

Modifier `android/gradle.properties`:

```properties
org.gradle.jvmargs=-Xmx8192m -XX:MaxMetaspaceSize=2048m
kotlin.daemon.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

Puis:
```bash
cd android
./gradlew --stop
./gradlew assembleDebug --no-daemon
```

#### Option C: Builder sur une autre machine

- Machine avec >16GB RAM
- Linux/Mac (généralement plus stable pour Gradle)
- Machine virtuelle avec RAM allouée

---

### Solution 3: Optimiser le Projet

Réduire la taille du build:

1. **Désactiver l'architecture New Architecture temporairement**

`android/gradle.properties`:
```properties
newArchEnabled=false
```

2. **Builder seulement pour arm64-v8a**

```bash
cd android
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
```

---

## 🎯 Recommandation

**Pour tester MAINTENANT** → **Solution 1** (Mode développement)

**Pour Play Store plus tard** → **Solution 2A** (EAS Build)

---

## 📋 Status Actuel

✅ **Code prêt**:
- Authentification email/password
- Google Sign-In configuré
- Multi-utilisateurs implémenté
- Traductions complètes (14 langues)
- Déconnexion dans Paramètres
- AuthGuard protège les routes

❌ **Build APK bloqué**: Problème de RAM Gradle

✅ **Alternative fonctionnelle**: Mode développement Expo

---

## 🧪 Comment Tester Maintenant

### Étape 1: Lancer le serveur
```bash
npx expo start
```

### Étape 2: Scanner le QR code
- Sur Android: Avec l'app "Expo Go" (Play Store)

### Étape 3: Tester l'authentification
1. L'app s'ouvre sur l'écran de connexion
2. Créer un compte (email + mot de passe)
3. Se connecter
4. Vérifier l'email affiché dans Paramètres
5. Tester la déconnexion

### Étape 4: Tester le multi-utilisateurs
1. Aller dans Paramètres → Team Management
2. Créer une organisation
3. Inviter un 2ème utilisateur (par email)
4. Se déconnecter et se connecter avec le 2ème compte
5. Accepter l'invitation
6. Scanner un produit
7. Vérifier que l'autre utilisateur voit le scan

---

## 📞 Prochaines Étapes

**Aujourd'hui**:
- ✅ Tester en mode développement
- ✅ Valider que tout fonctionne

**Cette semaine**:
- Builder l'APK avec EAS Build (pour tests offline)
- Continuer les tests multi-utilisateurs

**Pour le Play Store**:
- Utiliser EAS Build pour l'AAB de production
- Suivre le [PLAY_STORE_CHECKLIST.md](PLAY_STORE_CHECKLIST.md)
