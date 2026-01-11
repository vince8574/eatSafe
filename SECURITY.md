# Sécurité des API Keys

## Configuration locale (Développement)

1. **Créer le fichier .env**
   ```bash
   cp .env.example .env
   ```

2. **Remplir vos clés API dans .env**
   ```env
   EXPO_PUBLIC_VISION_API_KEY=votre_vraie_clé_ici
   ```

3. **NE JAMAIS COMMITER le fichier .env**
   - Le fichier .env est dans .gitignore
   - Seul .env.example doit être versionné

## Configuration Production (EAS Build)

Pour sécuriser les clés API en production, utilisez **EAS Secrets** :

### 1. Créer les secrets EAS

```bash
# Google Vision API Key
eas secret:create --scope project --name EXPO_PUBLIC_VISION_API_KEY --value AIzaSyA3cIHYbn2otFdS8DGsq5mi_VgzLYBJbq0

# Vision Endpoint (optionnel si vous utilisez l'endpoint par défaut)
eas secret:create --scope project --name EXPO_PUBLIC_VISION_ENDPOINT --value https://vision.googleapis.com/v1/images:annotate
```

### 2. Lister les secrets existants

```bash
eas secret:list
```

### 3. Supprimer un secret (si nécessaire)

```bash
eas secret:delete --name EXPO_PUBLIC_VISION_API_KEY
```

### 4. Build avec les secrets

Les secrets EAS sont automatiquement injectés lors du build :

```bash
# Build de production
eas build --platform android --profile production

# Build de preview
eas build --platform android --profile preview
```

## Comment ça fonctionne

Le service `visionFallbackService.ts` lit les variables d'environnement dans cet ordre de priorité :

1. **Variables d'environnement** (`process.env.EXPO_PUBLIC_VISION_API_KEY`)
   - En développement : lues depuis le fichier .env
   - En production (EAS Build) : lues depuis EAS Secrets

2. **Fallback vers app.json** (DEPRECATED - retiré pour sécurité)
   - Les clés ne sont plus stockées dans app.json

## Validation des clés API

### Google Vision API

Pour tester si votre clé est valide :

```bash
curl -X POST \
  "https://vision.googleapis.com/v1/images:annotate?key=VOTRE_CLE" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [{
      "image": {"content": "base64_image_here"},
      "features": [{"type": "TEXT_DETECTION"}]
    }]
  }'
```

## Sécurité des clés

### ✅ Bonnes pratiques :
- Utiliser des variables d'environnement
- Utiliser EAS Secrets pour la production
- Ne jamais commiter les fichiers .env
- Restreindre les clés API (API key restrictions dans Google Cloud Console)

### ❌ À éviter :
- Hardcoder les clés dans le code source
- Commiter les clés dans Git
- Partager les clés dans des messages non chiffrés
- Utiliser la même clé pour dev et production

## Rotation des clés

Si une clé est compromise :

1. **Générer une nouvelle clé** dans Google Cloud Console
2. **Mettre à jour EAS Secret**
   ```bash
   eas secret:delete --name EXPO_PUBLIC_VISION_API_KEY
   eas secret:create --scope project --name EXPO_PUBLIC_VISION_API_KEY --value NOUVELLE_CLE
   ```
3. **Reconstruire l'app**
   ```bash
   eas build --platform android --profile production
   ```
4. **Révoquer l'ancienne clé** dans Google Cloud Console

## Support

Pour toute question sur la sécurité des API keys, consultez :
- [EAS Secrets Documentation](https://docs.expo.dev/build-reference/variables/)
- [Google Cloud API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
