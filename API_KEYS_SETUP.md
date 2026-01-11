# 🔐 Configuration des API Keys - Guide Rapide

## Pour le développement local

### 1. Créer le fichier .env

```bash
cp .env.example .env
```

### 2. Le fichier .env a déjà été créé avec votre clé

Le fichier [.env](.env) contient déjà votre clé Google Vision API. **Ne le commitez jamais sur Git** (il est dans .gitignore).

### 3. Vérifier que ça fonctionne

Lancez l'app en mode développement :

```bash
npm start
# ou
npx expo start
```

L'app devrait maintenant lire la clé depuis le fichier .env.

---

## Pour la production (Google Play Store)

### Option 1 : Script automatique (Recommandé)

#### Sur Windows (PowerShell)
```powershell
.\scripts\setup-eas-secrets.ps1
```

#### Sur Mac/Linux
```bash
chmod +x scripts/setup-eas-secrets.sh
./scripts/setup-eas-secrets.sh
```

### Option 2 : Commandes manuelles

```bash
# 1. Créer le secret pour la clé API
eas secret:create --scope project --name EXPO_PUBLIC_VISION_API_KEY --value AIzaSyA3cIHYbn2otFdS8DGsq5mi_VgzLYBJbq0

# 2. Créer le secret pour l'endpoint
eas secret:create --scope project --name EXPO_PUBLIC_VISION_ENDPOINT --value https://vision.googleapis.com/v1/images:annotate

# 3. Vérifier les secrets
eas secret:list
```

### Construire l'app avec les secrets

```bash
# Build AAB pour Google Play Store
eas build --platform android --profile production
```

---

## Vérification

### Vérifier les secrets EAS

```bash
eas secret:list
```

Vous devriez voir :
```
┌────────────────────────────────────┬──────────┐
│ Name                               │ Updated  │
├────────────────────────────────────┼──────────┤
│ EXPO_PUBLIC_VISION_API_KEY         │ ...      │
│ EXPO_PUBLIC_VISION_ENDPOINT        │ ...      │
└────────────────────────────────────┴──────────┘
```

### Tester la clé Google Vision API

```bash
curl -X POST \
  "https://vision.googleapis.com/v1/images:annotate?key=AIzaSyA3cIHYbn2otFdS8DGsq5mi_VgzLYBJbq0" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [{
      "image": {"content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="},
      "features": [{"type": "TEXT_DETECTION"}]
    }]
  }'
```

Si la réponse contient `"responses"`, la clé est valide ✅

---

## Sécurité

### ✅ Ce qui a été fait :

1. **Clé retirée de app.json** - Plus de clé exposée dans le code source
2. **Fichier .env créé** - Pour le développement local (dans .gitignore)
3. **Fichier .env.example créé** - Template sans clé sensible (versionné)
4. **.gitignore mis à jour** - Les fichiers .env ne seront jamais commités
5. **Scripts automatiques créés** - Pour configurer EAS Secrets facilement

### ⚠️ Important :

- **Ne jamais commiter le fichier .env**
- **Ne jamais partager votre clé API en clair**
- Utiliser EAS Secrets pour tous les builds de production

### 🔄 Rotation des clés (si compromises)

Si votre clé API est compromise :

1. Générer une nouvelle clé dans [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Mettre à jour le fichier .env local
3. Mettre à jour EAS Secrets :
   ```bash
   eas secret:delete --name EXPO_PUBLIC_VISION_API_KEY
   eas secret:create --scope project --name EXPO_PUBLIC_VISION_API_KEY --value NOUVELLE_CLE
   ```
4. Rebuild l'app :
   ```bash
   eas build --platform android --profile production
   ```
5. Révoquer l'ancienne clé dans Google Cloud Console

---

## Documentation complète

Pour plus de détails, consultez [SECURITY.md](SECURITY.md).
