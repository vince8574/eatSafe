# Guide de déploiement Google Play Store - Numeline

## Tâches complétées

- [x] app.json configuré (version 1.0.0, versionCode 1)
- [x] Package: com.eatsafe.app
- [x] EAS Build configuré (eas.json créé)
- [x] Descriptions rédigées (voir google-play-store-listing.md)
- [x] privacy-policy.html créé
- [x] terms-of-service.html créé

## Prochaines étapes

### 1. Héberger les documents légaux

**Option A - GitHub Pages (Gratuit):**
1. Créer un repo GitHub public
2. Activer GitHub Pages dans Settings
3. Upload privacy-policy.html et terms-of-service.html
4. URLs: https://VOTRE_USERNAME.github.io/repo-name/privacy-policy.html

**Option B - Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### 2. Générer l'AAB avec EAS Build

```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter
eas login

# Configurer le projet
eas build:configure

# Générer l'AAB
eas build --platform android --profile production
```

### 3. Google Play Console

1. Se connecter: https://play.google.com/console
2. Créer nouvelle app: "Numeline"
3. Remplir la fiche du Store avec les descriptions de google-play-store-listing.md
4. Upload l'AAB dans Production > Créer une version
5. Déclarer la confidentialité des données
6. Soumettre pour révision

## URLs à fournir à Google Play

- Privacy Policy: https://VOTRE_URL/privacy-policy.html
- Terms of Service: https://VOTRE_URL/terms-of-service.html

## Commandes EAS utiles

```bash
# Voir le statut du build
eas build:list

# Rebuild pour une mise à jour
eas build --platform android --profile production

# Soumettre automatiquement (optionnel)
eas submit --platform android
```

## Checklist finale

- [ ] URLs légales accessibles publiquement
- [ ] AAB généré
- [ ] Screenshots (minimum 2)
- [ ] Icon 512x512
- [ ] Feature graphic 1024x500
- [ ] Description complète
- [ ] Email de contact
- [ ] Catégorie définie
- [ ] Classification contenu
