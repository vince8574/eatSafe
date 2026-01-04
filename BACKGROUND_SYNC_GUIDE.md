# Guide - VÃ©rification Automatique des Rappels

## ðŸŽ¯ Fonctionnement

L'application vÃ©rifie **automatiquement toutes les heures** si vos produits scannÃ©s ont Ã©tÃ© rappelÃ©s.

### Comment Ã§a marche ?

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  ðŸ“± TÃ©lÃ©phone (stockage local)   â”‚
â”‚                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚  Base de donnÃ©es SQLite    â”‚ â”‚
â”‚  â”‚  - Produits scannÃ©s        â”‚ â”‚
â”‚  â”‚  - Marques et nÂ° de lot    â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚              â†“                   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚  TÃ¢che de fond (1h)        â”‚ â”‚
â”‚  â”‚  â†“ Interroge API Rappel    â”‚ â”‚
â”‚  â”‚  â†“ Compare avec scans      â”‚ â”‚
â”‚  â”‚  â†“ Envoie notification     â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## âœ… Ce qui a Ã©tÃ© implÃ©mentÃ©

### 1. **VÃ©rification automatique locale**
- â° **FrÃ©quence** : Toutes les heures
- ðŸ“¦ **DonnÃ©es** : StockÃ©es localement (SQLite)
- ðŸ”’ **Vie privÃ©e** : Rien n'est envoyÃ© sur le cloud
- ðŸ”‹ **Batterie** : OptimisÃ© pour Ã©conomiser la batterie

### 2. **Notifications avec logo**
- ðŸŽ¨ **Logo Numeline** : AffichÃ© dans la notification
- ðŸ”Š **Son** : Notification sonore
- ðŸš¨ **PrioritÃ© haute** : Pour les rappels importants
- ðŸ“± **Badge** : Indicateur sur l'icÃ´ne de l'app

### 3. **Gestion intelligente**
- âœ… Ne notifie que pour les **nouveaux** rappels
- âœ… Met Ã  jour le statut en arriÃ¨re-plan
- âœ… Fonctionne mÃªme si l'app est fermÃ©e
- âœ… DÃ©marre automatiquement au dÃ©marrage du tÃ©lÃ©phone

## ðŸ“Š Consommation de DonnÃ©es

### Par vÃ©rification (toutes les heures)
- **API Rappel Conso** : ~10-15 KB
- **Traitement local** : 0 KB (SQLite local)

### Par jour (24 vÃ©rifications)
- **Total** : ~240-360 KB/jour
- **Ã‰quivalent** : 1-2 photos Instagram compressÃ©es

### Par mois
- **Total** : ~7-11 MB/mois
- **% d'un forfait 20 GB** : < 0.1%

### Optimisations
âœ… Utilise `minimumInterval` (Android optimise l'exÃ©cution)
âœ… RequÃªtes API limitÃ©es Ã  100 rappels rÃ©cents
âœ… Cache local pour Ã©viter requÃªtes inutiles
âœ… Aucune synchronisation cloud

## ðŸ”§ Configuration

### Permissions Android
```json
"android.permission.RECEIVE_BOOT_COMPLETED"  â†’ DÃ©marrage automatique
```

### ParamÃ¨tres de la tÃ¢che de fond
```typescript
minimumInterval: 60 * 60  // 1 heure (3600 secondes)
stopOnTerminate: false    // Continue aprÃ¨s fermeture app
startOnBoot: true         // DÃ©marre au boot du tÃ©lÃ©phone
```

## ðŸ“¬ Format des Notifications

### Titre
```
âš ï¸ Rappel produit dÃ©tectÃ©
```

### Corps
```
[Nom du produit] fait l'objet d'un rappel sanitaire.
```

### DonnÃ©es incluses
- Type : `recall`
- ID du produit
- ID du rappel
- Marque
- NumÃ©ro de lot

### Apparence
- âœ… Logo Numeline
- âœ… Couleur verte (#0BAE86)
- âœ… Son de notification
- âœ… PrioritÃ© haute
- âœ… Badge sur l'icÃ´ne

## ðŸ§ª Tests

### Test manuel
Pour tester immÃ©diatement sans attendre 1 heure :

1. Scanner un produit dans l'app
2. Ouvrir les paramÃ¨tres dÃ©veloppeur Android
3. Forcer l'exÃ©cution de la tÃ¢che de fond
4. VÃ©rifier les logs dans Logcat

### Logs Ã  surveiller
```
[BackgroundSync] Starting recall check...
[BackgroundSync] Found X scanned products
[BackgroundSync] Fetched Y recalls from API
[BackgroundSync] New recall detected for [brand] - [lot]
[BackgroundSync] Notification sent for [brand]
[BackgroundSync] Complete in Xms - Y notifications sent
```

## âš¡ Optimisations Android

Android peut ajuster la frÃ©quence rÃ©elle selon :
- ðŸ”‹ Niveau de batterie
- ðŸ“¡ Connexion rÃ©seau
- âš™ï¸ Mode Ã©conomie d'Ã©nergie
- ðŸ“Š Utilisation de l'app

**Note** : L'intervalle de 1 heure est un **minimum**. Android peut espacer les vÃ©rifications pour Ã©conomiser la batterie.

## ðŸ› DÃ©pannage

### La tÃ¢che ne s'exÃ©cute pas
1. VÃ©rifier que l'app n'est pas en mode "Ã‰conomie de batterie stricte"
2. Autoriser l'exÃ©cution en arriÃ¨re-plan dans les paramÃ¨tres
3. VÃ©rifier les permissions

### Pas de notification
1. VÃ©rifier que les notifications sont autorisÃ©es
2. VÃ©rifier le canal de notification "recall-alerts"
3. VÃ©rifier les logs pour voir si un rappel a Ã©tÃ© dÃ©tectÃ©

### Consommation data excessive
1. VÃ©rifier les logs de frÃ©quence d'exÃ©cution
2. Android devrait respecter le `minimumInterval`
3. VÃ©rifier qu'il n'y a pas de doublons de tÃ¢ches

## ðŸ“± Commandes utiles

### VÃ©rifier l'Ã©tat de la tÃ¢che
```typescript
await TaskManager.isTaskRegisteredAsync('recall-background-sync');
```

### DÃ©sactiver la tÃ¢che
```typescript
await unregisterBackgroundTask();
```

### Forcer une exÃ©cution (dÃ©veloppement)
```bash
adb shell cmd jobscheduler run -f com.eatsafe.app <job-id>
```

## âœ¨ Avantages de cette solution

| CritÃ¨re | RÃ©sultat |
|---------|----------|
| **Vie privÃ©e** | âœ… DonnÃ©es 100% locales |
| **CoÃ»t** | âœ… Gratuit (pas de serveur) |
| **Batterie** | âœ… OptimisÃ© par Android |
| **Data mobile** | âœ… ~10 MB/mois |
| **FiabilitÃ©** | âœ… IndÃ©pendant du cloud |
| **Temps rÃ©el** | âš ï¸ Max 1h de dÃ©lai |

---

**ðŸŽ‰ Les utilisateurs recevront automatiquement une notification avec le logo Numeline dÃ¨s qu'un produit scannÃ© est rappelÃ© !**

