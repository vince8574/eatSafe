# Protection du Code - Configuration

## Configuration mise en place

### 1. Hermes Engine
- **Fichier**: [app.json](app.json:59)
- **Effet**: Compile le JavaScript en bytecode natif (plus difficile à décompiler)
- **Actif**: Automatiquement sur tous les builds

### 2. Obfuscation du code
- **Fichier**: [metro.config.js](metro.config.js)
- **Effet**: Rend le code JavaScript illisible
- **Actif**: Uniquement en production

### 3. Configuration de build
- **Fichier**: [eas.json](eas.json:20-22)
- **Effet**: Définit NODE_ENV=production pour activer l'obfuscation

## Comment utiliser

### Développement (code normal et lisible)
```bash
# Lancer l'app en mode développement
expo start

# Ou avec npm
npm start
```
**Résultat**: Code NON obfusqué, facile à déboguer

### Build de production (code protégé)
```bash
# Build Android
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production
```
**Résultat**: Code obfusqué + Hermes bytecode

## Ce qui est protégé

✅ **Noms de variables et fonctions** → Transformés en noms courts (a, b, c, etc.)
✅ **Structure du code** → Réorganisée et compactée
✅ **Console.log** → Supprimés automatiquement
✅ **Commentaires** → Supprimés
✅ **Code mort** → Supprimé
✅ **JavaScript** → Compilé en bytecode Hermes (Android)

## Ce qui n'est PAS protégé à 100%

⚠️ **Limites de l'obfuscation**:
- Quelqu'un de très déterminé peut quand même décompiler
- Les clés API dans le code restent extractibles
- Le trafic réseau est visible

## Bonnes pratiques de sécurité

### ✅ À FAIRE
1. **Secrets côté serveur**: Gardez les clés API sensibles sur Firebase Functions
2. **Validation serveur**: Toute logique critique doit être validée côté serveur
3. **Chiffrement des données**: Utilisez `expo-secure-store` pour les données sensibles
4. **HTTPS uniquement**: Toutes les communications doivent être chiffrées

### ❌ À NE PAS FAIRE
1. ❌ Stocker des clés API privées dans le code
2. ❌ Faire confiance aux validations côté client uniquement
3. ❌ Stocker des tokens en clair dans AsyncStorage
4. ❌ Compter uniquement sur l'obfuscation pour la sécurité

## Vérifier que ça fonctionne

### Test 1: Vérifier l'obfuscation
Après un build de production, vous pouvez extraire l'APK et vérifier que le code est illisible.

### Test 2: Vérifier Hermes
Dans les logs de build, vous devriez voir:
```
✓ Using Hermes engine
✓ Building JavaScript bundle
```

## Modification du code

**Important**: Votre code source reste TOUJOURS lisible et modifiable.

```
Votre code source (lisible)
  ↓
  Vous modifiez normalement
  ↓
Build de production
  ↓
Code obfusqué (distribué aux utilisateurs)
```

L'obfuscation est une transformation automatique lors du build. Vous ne voyez jamais le code obfusqué.

## Commandes rapides

```bash
# Développement
npm start

# Build production Android
eas build --platform android --profile production

# Build preview (pour tester sans publier)
eas build --platform android --profile preview
```

## Fichiers modifiés

- ✅ [app.json](app.json:59) - Ajout de `"jsEngine": "hermes"`
- ✅ [metro.config.js](metro.config.js) - Configuration d'obfuscation
- ✅ [eas.json](eas.json:20-22) - Ajout de `NODE_ENV=production`

## Questions fréquentes

**Q: Est-ce que ça ralentit mon app?**
R: Non, Hermes améliore même les performances de démarrage.

**Q: Est-ce que je peux déboguer en production?**
R: Oui, mais c'est plus difficile. Utilisez les profils preview pour tester avant production.

**Q: Est-ce que mes clés Firebase sont protégées?**
R: L'obfuscation aide, mais pour une vraie protection, utilisez Firebase Functions pour les opérations sensibles.

**Q: Puis-je désactiver l'obfuscation temporairement?**
R: Oui, supprimez la ligne `"env": { "NODE_ENV": "production" }` dans eas.json ou utilisez le profil `preview`.
