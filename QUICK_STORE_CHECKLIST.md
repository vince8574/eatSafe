# ✅ Checklist Rapide - Publication Google Play Store

## 📋 Avant de commencer

- [ ] Compte Google Play Developer créé (25 USD)
- [ ] API Keys sécurisées ([API_KEYS_SETUP.md](API_KEYS_SETUP.md))
- [ ] Build AAB généré avec EAS

---

## 1️⃣ TEXTES (10 min)

### Nom de l'application
```
Numeline
```

### Description courte (80 caractères)
```
Scannez vos produits et recevez des alertes en cas de rappel alimentaire aux États-Unis
```

### Description complète
✅ Copier depuis [GOOGLE_PLAY_CONSOLE_GUIDE.md](GOOGLE_PLAY_CONSOLE_GUIDE.md) section 2.1

**À personnaliser**:
- [ ] Remplacer `[VOTRE_EMAIL]`
- [ ] Remplacer `[URL_PRIVACY_POLICY]`
- [ ] Remplacer `[URL_TERMS]`

---

## 2️⃣ IMAGES (30 min)

### Icône (512x512 px)
- [ ] Utiliser [assets/icon.png](assets/icon.png)
- [ ] Vérifier dimensions: 512x512
- [ ] Format: PNG sans transparence

### Feature Graphic (1024x500 px)
- [ ] Créer sur Canva/Figma
- [ ] Dimensions: 1024 x 500 pixels
- [ ] Design: Logo + slogan

**Template Canva**: https://www.canva.com/design/DAF... (créer votre design)

### Captures d'écran (min. 2)
Dimensions: 1080 x 1920 px (ratio 9:16)

**À capturer**:
- [ ] 1. Écran d'accueil (dashboard)
- [ ] 2. Scan de code-barres
- [ ] 3. Alerte de rappel
- [ ] 4. Historique des scans
- [ ] 5. (Optionnel) Scan de lot
- [ ] 6. (Optionnel) Détails produit

**Outil recommandé**: https://screenshots.pro/ pour ajouter des cadres de téléphone

---

## 3️⃣ LÉGAL (20 min)

### Politique de confidentialité

**Fichier**: [privacy-policy.html](privacy-policy.html) ✅ Déjà créé

**Héberger sur**:

#### Option A: GitHub Pages (Gratuit) - RECOMMANDÉ
```bash
git add privacy-policy.html terms-of-service.html
git commit -m "Add legal documents"
git push

# Activer GitHub Pages:
# Settings → Pages → Source: main branch → Save
```

**URL finale**:
```
https://numeline.vercel.app/privacy-policy
```

#### Option B: Firebase Hosting
```bash
firebase init hosting
cp privacy-policy.html public/
firebase deploy --only hosting
```

**À faire**:
- [ ] Héberger privacy-policy.html
- [ ] Héberger terms-of-service.html
- [ ] Noter les URLs pour Google Play Console

---

## 4️⃣ GOOGLE PLAY CONSOLE

### Créer l'application
- [ ] Nom: Numeline
- [ ] Langue par défaut: Français (ou English)
- [ ] Gratuit avec achats intégrés

### Fiche du Play Store
- [ ] Nom: Numeline
- [ ] Description courte: [copier ci-dessus]
- [ ] Description complète: [copier depuis guide]
- [ ] Icône: [uploader 512x512]
- [ ] Feature graphic: [uploader 1024x500]
- [ ] Captures d'écran: [min. 2 images]

### Catégorisation
- [ ] Catégorie: Santé et remise en forme
- [ ] Public: 16+
- [ ] Tags: santé, alimentation, rappels

### Politique
- [ ] URL Politique de confidentialité: https://numeline.vercel.app/privacy-policy
- [ ] Email de contact: votre@email.com
- [ ] Questionnaire de contenu: Complété

### Distribution
- [ ] Pays: États-Unis (cocher)
- [ ] Type: Gratuit
- [ ] Achats intégrés: Oui
- [ ] Publicités: Non

### Achats intégrés
- [ ] Pack 500 scans (ID: `pack_500_scans`)
- [ ] Abonnement mensuel (ID: `subscription_unlimited_monthly`)
- [ ] Abonnement annuel (ID: `subscription_unlimited_yearly`)

---

## 5️⃣ BUILD & UPLOAD

### Générer l'AAB
```bash
# 1. Vérifier les secrets EAS
eas secret:list

# 2. Générer le build
eas build --platform android --profile production

# 3. Attendre (10-20 min)
# 4. Télécharger le .aab depuis https://expo.dev/
```

### Upload sur Google Play
- [ ] Production → Créer une release
- [ ] Uploader le fichier .aab
- [ ] Version: 1.0.0
- [ ] Notes de version: [copier ci-dessous]

**Notes de version**:
```
🎉 Première version de Numeline !

Fonctionnalités:
• Scan de code-barres et numéros de lot
• Alertes en temps réel en cas de rappel
• Base de données FDA/USDA
• Historique complet des scans
• Formules gratuites et premium
```

---

## 6️⃣ SOUMISSION

### Vérification finale
- [ ] Toutes les sections ont une ✅ verte
- [ ] Politique de confidentialité accessible
- [ ] Email de contact valide
- [ ] Build uploadé sans erreurs

### Soumettre
- [ ] Cliquer sur "Envoyer pour examen"
- [ ] Confirmer la soumission

**Délai**: 3-7 jours pour la première soumission

---

## 📞 Liens utiles

| Document | Lien |
|----------|------|
| Guide complet | [GOOGLE_PLAY_CONSOLE_GUIDE.md](GOOGLE_PLAY_CONSOLE_GUIDE.md) |
| Textes Play Store | [google-play-store-listing.md](google-play-store-listing.md) |
| Politique confidentialité | [privacy-policy.html](privacy-policy.html) |
| Conditions utilisation | [terms-of-service.html](terms-of-service.html) |
| Sécurité API Keys | [API_KEYS_SETUP.md](API_KEYS_SETUP.md) |

---

## ⏱️ Temps estimé total

| Étape | Temps |
|-------|-------|
| 1. Textes | 10 min |
| 2. Images | 30-60 min |
| 3. Légal | 20 min |
| 4. Google Play Console | 30 min |
| 5. Build & Upload | 30 min |
| **TOTAL** | **2-3 heures** |

---

## 🎯 Après publication

**Suivi**:
- [ ] Vérifier les statistiques (téléchargements)
- [ ] Répondre aux avis utilisateurs
- [ ] Monitorer les crashs

**Mises à jour**:
```bash
# 1. Incrémenter version dans app.json
"version": "1.0.1"
"android.versionCode": 2

# 2. Rebuild
eas build --platform android --profile production

# 3. Upload nouveau AAB
# 4. Soumettre pour examen
```

---

## ✅ Validation

Une fois tous les éléments complétés, vous êtes prêt à soumettre!

**Questions ?** Consultez [GOOGLE_PLAY_CONSOLE_GUIDE.md](GOOGLE_PLAY_CONSOLE_GUIDE.md) pour plus de détails.
