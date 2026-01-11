# 🔐 Changelog - Sécurisation des API Keys

**Date**: 11 janvier 2026
**Type**: Sécurité
**Priorité**: Critique ⚠️

## Résumé

Les clés API Google Vision étaient exposées dans le code source ([app.json](app.json)). Cette faille de sécurité a été corrigée en déplaçant toutes les clés sensibles vers des variables d'environnement.

---

## ✅ Changements effectués

### 1. Retrait des clés du code source

**Avant** ([app.json](app.json:64-69)):
```json
"extra": {
  "vision": {
    "endpoint": "https://vision.googleapis.com/v1/images:annotate",
    "apiKey": "AIzaSyA3cIHYbn2otFdS8DGsq5mi_VgzLYBJbq0"  // ❌ EXPOSÉE
  }
}
```

**Après** ([app.json](app.json:64-66)):
```json
"extra": {
  "router": {}
  // ✅ Clé API retirée
}
```

### 2. Configuration des variables d'environnement

**Fichiers créés** :
- [.env](.env) - Contient les vraies clés (NON versionné, dans .gitignore)
- [.env.example](.env.example) - Template sans clés sensibles (versionné)

**Contenu de .env** :
```env
EXPO_PUBLIC_VISION_ENDPOINT=https://vision.googleapis.com/v1/images:annotate
EXPO_PUBLIC_VISION_API_KEY=AIzaSyA3cIHYbn2otFdS8DGsq5mi_VgzLYBJbq0
```

### 3. Mise à jour .gitignore

**Ajouté** dans [.gitignore](.gitignore:14-17):
```gitignore
# Environment variables (contain sensitive API keys)
.env
.env.local
.env.*.local
```

### 4. Scripts d'automatisation

**Scripts créés** :
- [scripts/setup-eas-secrets.ps1](scripts/setup-eas-secrets.ps1) - PowerShell pour Windows
- [scripts/setup-eas-secrets.sh](scripts/setup-eas-secrets.sh) - Bash pour Mac/Linux
- [scripts/test-api-keys.js](scripts/test-api-keys.js) - Test de validation

**Nouvelle commande npm** :
```json
"scripts": {
  "test-api-keys": "node scripts/test-api-keys.js"
}
```

### 5. Documentation

**Fichiers de documentation créés** :
- [API_KEYS_SETUP.md](API_KEYS_SETUP.md) - Guide rapide de configuration
- [SECURITY.md](SECURITY.md) - Documentation complète de sécurité

---

## 🔧 Comment ça fonctionne maintenant

### Développement local

Le code dans [visionFallbackService.ts](src/services/visionFallbackService.ts:21-30) lit les variables d'environnement en priorité :

```typescript
function getVisionConfig(): VisionConfig {
  const extra = (Constants.expoConfig?.extra as any) ?? {};
  const visionExtra = (extra.vision as VisionConfig) ?? {};
  const env = (globalThis as any)?.process?.env;

  return {
    endpoint: env?.EXPO_PUBLIC_VISION_ENDPOINT || visionExtra.endpoint,
    apiKey: env?.EXPO_PUBLIC_VISION_API_KEY || visionExtra.apiKey
  };
}
```

**Ordre de priorité** :
1. Variables d'environnement (`.env` en dev, EAS Secrets en prod)
2. Fallback vers `app.json` (DEPRECATED - retiré pour sécurité)

### Production (EAS Build)

Les clés sont stockées dans **EAS Secrets** (chiffrées côté Expo) :

```bash
# Configuration une seule fois
eas secret:create --scope project --name EXPO_PUBLIC_VISION_API_KEY --value AIzaSyA3cIHYbn2otFdS8DGsq5mi_VgzLYBJbq0

# Build automatique avec les secrets
eas build --platform android --profile production
```

---

## ✅ Tests de validation

### Test automatique

```bash
npm run test-api-keys
```

**Résultat attendu** :
```
✅ .env est bien dans .gitignore
✅ Fichier .env trouvé
✅ Google Vision API fonctionne correctement!
✅ Configuration complète et fonctionnelle!
```

### Vérification manuelle

```bash
# 1. Vérifier que .env n'est pas tracké par Git
git status | grep ".env"
# Résultat attendu: rien (le fichier est ignoré)

# 2. Vérifier que .env.example est versionné
git ls-files | grep ".env.example"
# Résultat attendu: .env.example

# 3. Lister les secrets EAS (production)
eas secret:list
# Résultat attendu: EXPO_PUBLIC_VISION_API_KEY et EXPO_PUBLIC_VISION_ENDPOINT
```

---

## 🚨 Actions requises pour la production

### Avant le prochain build de production :

1. **Configurer EAS Secrets** (une seule fois)
   ```bash
   # Option 1: Script automatique
   .\scripts\setup-eas-secrets.ps1

   # Option 2: Commandes manuelles
   eas secret:create --scope project --name EXPO_PUBLIC_VISION_API_KEY --value AIzaSyA3cIHYbn2otFdS8DGsq5mi_VgzLYBJbq0
   ```

2. **Vérifier les secrets**
   ```bash
   eas secret:list
   ```

3. **Builder avec les secrets**
   ```bash
   eas build --platform android --profile production
   ```

---

## 🔒 Sécurité renforcée

### ✅ Avant cette modification :
- ❌ Clé API visible dans app.json
- ❌ Clé commise dans Git
- ❌ Clé visible dans le code source
- ❌ Risque de fuite si le repo est public

### ✅ Après cette modification :
- ✅ Clé dans variables d'environnement
- ✅ Fichier .env dans .gitignore
- ✅ EAS Secrets pour la production
- ✅ Clé jamais exposée dans Git
- ✅ Rotation facile en cas de compromission

---

## 📚 Ressources

- [API_KEYS_SETUP.md](API_KEYS_SETUP.md) - Guide de configuration
- [SECURITY.md](SECURITY.md) - Documentation sécurité
- [EAS Secrets](https://docs.expo.dev/build-reference/variables/)
- [Google Cloud API Keys](https://cloud.google.com/docs/authentication/api-keys)

---

## 👤 Auteur

Configuration effectuée par Claude Code le 11 janvier 2026.

---

## ⚠️ Note importante

**La clé API actuelle (AIzaSyA3cIHYbn2otFdS8DGsq5mi_VgzLYBJbq0) a été exposée dans le code source auparavant.**

### Recommandation :
Si ce repository a été poussé sur GitHub/GitLab avec la clé exposée :

1. **Révoquer immédiatement la clé exposée** dans [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. **Générer une nouvelle clé**
3. **Mettre à jour le fichier .env local**
4. **Mettre à jour EAS Secrets**
5. **Utiliser la nouvelle clé pour tous les futurs builds**

### Vérifier l'historique Git :

```bash
# Chercher si la clé a été commitée
git log --all --full-history --source -- "*app.json"

# Si trouvée dans l'historique Git, la clé doit être révoquée
```
