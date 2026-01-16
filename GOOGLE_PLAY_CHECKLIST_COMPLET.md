# Checklist Complet - Publication sur Google Play Store

## 📋 STATUT GLOBAL

- [ ] **Phase 1 :** Préparation des assets *(CRITIQUE)*
- [ ] **Phase 2 :** Upload du AAB *(EN COURS)*
- [ ] **Phase 3 :** Store Listing
- [ ] **Phase 4 :** Configuration
- [ ] **Phase 5 :** Tarification et distribution
- [ ] **Phase 6 :** Soumission

---

## 🎨 PHASE 1 : PRÉPARATION DES ASSETS (CRITIQUE)

### Icône de l'application
- [ ] Créer icône **512 x 512 pixels**
- [ ] Format : PNG 32 bits
- [ ] Taille max : 1024 Ko
- [ ] Design : Fond transparent OU couleur unie
- [ ] ⚠️ **IMPORTANT :** L'icône doit être CARRÉE (actuellement 864x964 - À CORRIGER)

**Fichier actuel à redimensionner :**
```
assets/icon.png (actuellement 864x964)
```

**Action requise :**
1. Ouvrir assets/icon.png dans un éditeur d'images
2. Redimensionner en 512x512 pixels (rogner ou ajouter des marges)
3. Exporter en PNG 32 bits

---

### Feature Graphic (Image vedette)
- [ ] Créer image **1024 x 500 pixels**
- [ ] Format : PNG ou JPG
- [ ] Taille max : 1024 Ko
- [ ] Contenu : Logo + slogan + visuel attractif

**Suggestion de contenu :**
```
[Logo Numeline] + "Protégez votre famille" + [Icône scan produit]
Couleurs : Utiliser votre palette (#0A1F1F comme base)
```

**Outils recommandés :**
- Canva (gratuit) : https://www.canva.com/
- Figma (gratuit) : https://www.figma.com/
- Photopea (gratuit, comme Photoshop) : https://www.photopea.com/

---

### Screenshots (Captures d'écran)
- [ ] Minimum **2 screenshots** (recommandé : 4-8)
- [ ] Résolution : **1080 x 1920 pixels** (16:9 portrait)
- [ ] Format : PNG ou JPG
- [ ] Taille max : 8 Mo chacune

**Screenshots recommandés :**

1. **Écran d'accueil**
   - Montrer les statistiques (produits scannés, rappelés)
   - Fichier source : app/(tabs)/home.tsx

2. **Écran de scan**
   - Montrer le scan de code-barres en action
   - Fichier source : app/(tabs)/scan.tsx

3. **Historique des produits**
   - Montrer la liste des produits scannés
   - Fichier source : app/(tabs)/history.tsx

4. **Détails d'un produit**
   - Montrer les informations d'un produit avec statut
   - Fichier source : app/details/[id].tsx

5. **Alert de rappel** (optionnel mais recommandé)
   - Montrer une notification de rappel

6. **Support multilingue** (optionnel)
   - Montrer le sélecteur de langue

**Comment capturer les screenshots :**
1. Lancer l'app sur un émulateur Android (Pixel 6, résolution 1080x1920)
2. Naviguer vers chaque écran
3. Prendre une capture d'écran (Ctrl+S dans Android Studio)
4. OU utiliser des outils de mockup : https://mockuphone.com/

---

### Vidéo promotionnelle (OPTIONNEL mais recommandé)
- [ ] Durée : 30 secondes à 2 minutes
- [ ] Résolution : 1920 x 1080 minimum
- [ ] Format : MP4, MPEG
- [ ] Taille max : 100 Mo
- [ ] Contenu : Démonstration rapide de l'app

---

## 📦 PHASE 2 : UPLOAD DU AAB

- [x] Build AAB créé avec succès
- [ ] Aller sur [Google Play Console](https://play.google.com/console)
- [ ] Sélectionner l'app "Numeline" (ou créer une nouvelle app)
- [ ] Menu : **Production** > **Créer une nouvelle version**
- [ ] Upload du fichier AAB depuis Téléchargements
- [ ] Ajouter notes de version (exemple ci-dessous)
- [ ] Enregistrer (ne pas publier encore)

**Notes de version suggérées :**
```
Version 1.0.0 - Lancement initial
• Scan intelligent de codes-barres et numéros de lot
• Vérification automatique contre les bases FDA/USDA
• Notifications en temps réel en cas de rappel
• Historique complet de vos produits scannés
• Support de 14 langues
• Interface moderne et intuitive
```

---

## 🏪 PHASE 3 : STORE LISTING (Fiche du Store)

### Informations principales
- [ ] **Titre de l'app :** `Numeline - Food Recall Scanner`
- [ ] **Description courte :** (Choisir parmi les options dans GOOGLE_PLAY_STORE_DESCRIPTIONS.md)
- [ ] **Description complète :** (Copier depuis GOOGLE_PLAY_STORE_DESCRIPTIONS.md)

### Graphiques et assets
- [ ] **Icône de l'app :** 512x512 PNG *(À CRÉER - voir Phase 1)*
- [ ] **Feature graphic :** 1024x500 PNG/JPG *(À CRÉER - voir Phase 1)*
- [ ] **Screenshots :** Minimum 2 *(À CRÉER - voir Phase 1)*
- [ ] **Vidéo YouTube :** URL (optionnel)

### Catégorisation
- [ ] **Catégorie :** Health & Fitness
- [ ] **Tags :** food safety, recall, scanner

### Coordonnées
- [ ] **Email de contact :** [Votre email professionnel]
- [ ] **Site web :** [URL optionnel]
- [ ] **Numéro de téléphone :** [Optionnel]

---

## ⚙️ PHASE 4 : CONFIGURATION DE L'APP

### Classification du contenu
- [ ] Remplir le questionnaire de classification
- [ ] **Public cible :** 12+ (Everyone 12+)
- [ ] **Contenu :** Aucun contenu sensible
- [ ] Soumettre pour obtenir la classification

### Politique de confidentialité (CRITIQUE)
- [ ] **URL de la politique de confidentialité** *(OBLIGATOIRE)*

**Options :**

**Option A : Générateur en ligne (RAPIDE)**
```
1. Aller sur https://www.freeprivacypolicy.com/
2. Remplir le formulaire pour "Mobile App"
3. Générer la politique
4. Copier l'URL fournie
5. Coller dans Google Play Console
```

**Option B : GitHub Pages (GRATUIT)**
```
1. Créer fichier privacy-policy.html
2. Créer dépôt GitHub public
3. Activer GitHub Pages
4. URL : https://numeline.vercel.app/privacy-policy
```

**Option C : Template inclus**
```
Voulez-vous que je génère un template de politique de confidentialité ?
```

### Déclaration de sécurité des données
- [ ] Remplir le formulaire "Sécurité des données"
- [ ] **Données collectées :** Marque et numéro de lot (stockés localement uniquement)
- [ ] **Données partagées :** Aucune
- [ ] **Chiffrement des données :** Oui (en transit)
- [ ] **Suppression des données :** Oui (utilisateur peut supprimer)

**Réponses suggérées :**
```
Q: Votre app collecte-t-elle des données utilisateur ?
R: Oui

Q: Quelles données sont collectées ?
R:
- Marque de produit (stockée localement)
- Numéro de lot (stocké localement)
- Aucune donnée personnelle identifiable

Q: Ces données sont-elles partagées avec des tiers ?
R: Non

Q: Les données sont-elles chiffrées en transit ?
R: Oui (HTTPS)

Q: L'utilisateur peut-il demander la suppression ?
R: Oui (suppression locale dans l'app)
```

### Publicités
- [ ] **Votre app contient-elle des publicités ?**
  - ☑️ Non (si pas de pub)
  - ☐ Oui (si vous ajoutez des pubs)

---

## 💰 PHASE 5 : TARIFICATION ET DISTRIBUTION

### Tarification
- [ ] **Type :** Gratuite *(recommandé pour le lancement)*
- [ ] OU **Payante :** [Prix en USD]

### Pays de distribution
- [ ] **Distribution :** Tous les pays *(recommandé)*
- [ ] OU sélectionner pays spécifiques

### Programme pour les développeurs
- [ ] Accepter les conditions du programme pour développeurs

---

## 🚀 PHASE 6 : SOUMISSION FINALE

### Vérifications pré-soumission
- [ ] Tous les champs obligatoires remplis
- [ ] Icône et graphiques validés
- [ ] Politique de confidentialité accessible
- [ ] AAB uploadé et validé
- [ ] Classification du contenu approuvée
- [ ] Formulaire de sécurité des données complété

### Soumission
- [ ] Cliquer sur "Envoyer pour examen"
- [ ] Confirmer la soumission
- [ ] Attendre l'examen (généralement 24-72 heures)

### Après soumission
- [ ] Surveiller les emails de Google Play
- [ ] Répondre aux demandes de Google si nécessaire
- [ ] Une fois approuvé : App publiée ! 🎉

---

## 📊 RÉSUMÉ DES FICHIERS REQUIS

| Asset | Taille | Format | Statut | Priorité |
|-------|--------|--------|--------|----------|
| Icône app | 512x512 | PNG | ❌ À créer | CRITIQUE |
| Feature graphic | 1024x500 | PNG/JPG | ❌ À créer | CRITIQUE |
| Screenshot 1 (Accueil) | 1080x1920 | PNG/JPG | ❌ À créer | CRITIQUE |
| Screenshot 2 (Scan) | 1080x1920 | PNG/JPG | ❌ À créer | CRITIQUE |
| Screenshots 3-8 | 1080x1920 | PNG/JPG | ❌ À créer | Recommandé |
| Fichier AAB | - | .aab | ✅ Prêt | CRITIQUE |
| Politique confidentialité | - | URL | ❌ À héberger | CRITIQUE |
| Description courte | 80 char | Texte | ✅ Prêt | CRITIQUE |
| Description complète | 4000 char | Texte | ✅ Prêt | CRITIQUE |

---

## ⏱️ ESTIMATION TEMPS

- **Création icône 512x512 :** 15-30 min
- **Création feature graphic :** 30-60 min
- **Capture screenshots :** 30-45 min
- **Upload AAB :** 5 min
- **Remplissage store listing :** 20-30 min
- **Configuration app :** 30-45 min
- **Politique confidentialité :** 20-40 min

**TOTAL ESTIMÉ : 2h30 - 4h**

---

## 🆘 AIDE ET RESSOURCES

- **Documentation officielle :** https://support.google.com/googleplay/android-developer
- **Exigences graphiques :** https://support.google.com/googleplay/android-developer/answer/9866151
- **Générateur privacy policy :** https://www.freeprivacypolicy.com/
- **Mockup screenshots :** https://mockuphone.com/
- **Éditeur images gratuit :** https://www.photopea.com/

---

## 📞 PROCHAINES ÉTAPES IMMÉDIATES

1. **CRITIQUE :** Créer icône 512x512 carrée
2. **CRITIQUE :** Créer feature graphic 1024x500
3. **CRITIQUE :** Capturer 2-4 screenshots
4. **CRITIQUE :** Héberger politique de confidentialité
5. Uploader le AAB sur Google Play Console
6. Remplir le store listing
7. Soumettre pour review

---

**Voulez-vous que je vous aide à :**
- Générer un template de politique de confidentialité ?
- Créer un script pour redimensionner l'icône automatiquement ?
- Obtenir des exemples de feature graphics ?
