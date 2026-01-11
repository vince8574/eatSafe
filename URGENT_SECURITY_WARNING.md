# 🚨 AVERTISSEMENT DE SÉCURITÉ URGENT

**Date**: 11 janvier 2026
**Priorité**: CRITIQUE ⚠️

---

## ⚠️ CLÉS API EXPOSÉES DANS L'HISTORIQUE GIT

### Problème identifié

Votre clé Google Vision API **a été commitée dans Git** et est présente dans l'historique des commits :

```
Clé exposée: AIzaSyA3cIHYbn2otFdS8DGsq5mi_VgzLYBJbq0
Fichier: app.json
Commits concernés: c9e15b2, 2af6841, et potentiellement d'autres
```

### Gravité

- ⚠️ **Si le repository est public** : La clé est accessible à tous
- ⚠️ **Si le repository est privé** : La clé est accessible aux collaborateurs
- ⚠️ **L'historique Git conserve la clé** même après suppression du fichier

---

## 🔥 ACTIONS IMMÉDIATES REQUISES

### Étape 1 : Vérifier si le repository est public

```bash
# Vérifier la visibilité du repo
git remote -v
```

- Si GitHub : Aller sur `https://github.com/VOTRE_USERNAME/VOTRE_REPO/settings`
- Vérifier si "Public" ou "Private"

### Étape 2 : Révoquer la clé exposée

**IMPORTANT**: Cette action doit être effectuée **IMMÉDIATEMENT**, quel que soit le statut du repo.

1. **Aller sur Google Cloud Console**
   - URL: https://console.cloud.google.com/apis/credentials

2. **Localiser la clé**
   - Chercher une clé commençant par `AIzaSyA3cI...`

3. **Révoquer la clé**
   - Cliquer sur la clé
   - Cliquer sur "Supprimer" ou "Désactiver"
   - Confirmer l'action

### Étape 3 : Créer une nouvelle clé

1. **Dans Google Cloud Console**
   - Cliquer sur "Créer des identifiants"
   - Sélectionner "Clé API"
   - Copier la nouvelle clé générée

2. **Configurer les restrictions** (IMPORTANT)
   - Restrictions d'application : HTTP referrers ou Android apps
   - Restrictions d'API : Limiter à "Cloud Vision API" uniquement
   - Quotas : Définir des limites raisonnables

### Étape 4 : Mettre à jour les configurations

**Local (développement)** :
```bash
# Éditer le fichier .env
nano .env  # ou notepad .env sous Windows
```

Remplacer :
```env
EXPO_PUBLIC_VISION_API_KEY=AIzaSyA3cIHYbn2otFdS8DGsq5mi_VgzLYBJbq0  # Ancienne clé
```

Par :
```env
EXPO_PUBLIC_VISION_API_KEY=NOUVELLE_CLE_ICI  # Nouvelle clé
```

**Production (EAS Secrets)** :
```bash
# Supprimer l'ancien secret
eas secret:delete --name EXPO_PUBLIC_VISION_API_KEY

# Créer un nouveau secret avec la nouvelle clé
eas secret:create --scope project --name EXPO_PUBLIC_VISION_API_KEY --value VOTRE_NOUVELLE_CLE
```

### Étape 5 : Tester la nouvelle configuration

```bash
npm run test-api-keys
```

Résultat attendu : `✅ Configuration complète et fonctionnelle!`

---

## 🧹 (Optionnel) Nettoyer l'historique Git

**ATTENTION**: Ces opérations réécrivent l'historique Git et sont **DESTRUCTIVES**.

### Option 1 : Utiliser BFG Repo-Cleaner (Recommandé)

```bash
# Télécharger BFG
# https://rtyley.github.io/bfg-repo-cleaner/

# Sauvegarder d'abord!
git clone --mirror https://github.com/VOTRE_USERNAME/VOTRE_REPO.git

# Supprimer la clé de l'historique
java -jar bfg.jar --replace-text passwords.txt VOTRE_REPO.git

# Nettoyer
cd VOTRE_REPO.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Pousser les changements (FORCE PUSH)
git push --force
```

### Option 2 : Utiliser git-filter-repo

```bash
# Installer git-filter-repo
pip install git-filter-repo

# Sauvegarder!
git clone --mirror https://github.com/VOTRE_USERNAME/VOTRE_REPO.git backup-repo

# Créer un fichier avec les clés à remplacer
echo 'AIzaSyA3cIHYbn2otFdS8DGsq5mi_VgzLYBJbq0==>REDACTED_API_KEY' > replacements.txt

# Nettoyer l'historique
git filter-repo --replace-text replacements.txt

# Force push
git push origin --force --all
```

### ⚠️ Risques du nettoyage d'historique

- Tous les collaborateurs devront re-cloner le repo
- Les forks et branches existantes seront désynchronisés
- Peut casser les CI/CD en cours
- **À faire en dehors des heures de production**

---

## 📋 Checklist de sécurité

- [ ] J'ai vérifié si le repository est public ou privé
- [ ] J'ai révoqué l'ancienne clé API dans Google Cloud Console
- [ ] J'ai généré une nouvelle clé API
- [ ] J'ai configuré les restrictions sur la nouvelle clé
- [ ] J'ai mis à jour le fichier .env local
- [ ] J'ai mis à jour les EAS Secrets
- [ ] J'ai testé la nouvelle configuration (`npm run test-api-keys`)
- [ ] J'ai rebuild l'app de production avec la nouvelle clé
- [ ] (Optionnel) J'ai nettoyé l'historique Git
- [ ] J'ai informé tous les collaborateurs du changement

---

## 🛡️ Prévention future

### Configuration Google Cloud

**Activer les restrictions de clé** :

1. **Restrictions d'application**
   - Pour Android : Restreindre aux signatures de package
   - Pour Web : Restreindre aux domaines autorisés

2. **Restrictions d'API**
   - Limiter uniquement à "Cloud Vision API"
   - Désactiver toutes les autres APIs

3. **Quotas et alertes**
   - Définir des quotas journaliers/mensuels
   - Configurer des alertes de dépassement

### Surveillance

**Configurer Google Cloud Monitoring** :
- Alertes sur utilisation anormale
- Logs d'utilisation de l'API
- Notifications par email

**Vérifier régulièrement** :
```bash
# Vérifier que .env n'est jamais commité
git status | grep ".env"

# Chercher des clés dans le code
git grep -E 'AIza[0-9A-Za-z_-]{35}'
```

---

## 📞 Support

Si vous avez des questions ou besoin d'aide :

1. **Documentation** : [SECURITY.md](SECURITY.md)
2. **Google Cloud Support** : https://cloud.google.com/support
3. **Expo Forums** : https://forums.expo.dev/

---

## 📚 Ressources complémentaires

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)
- [Google Cloud: API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)

---

**Ce document doit être traité avec la plus haute priorité.**
