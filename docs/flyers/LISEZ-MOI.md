# QR code Numeline FR — fichiers pour flyers

Ces fichiers ne sont **pas publiés sur le site**. Ils servent uniquement aux supports
imprimés. Le dossier `docs/` n'est pas déployé par Vercel.

## Destination du code

```
https://numeline.com/fr/download
```

Cette page redirige automatiquement vers **NumelineFR** selon l'appareil :
App Store `id6772080722` sur iPhone, Google Play `com.numeline.app` sur Android.
Sur ordinateur, aucune redirection : les deux boutons restent affichés.

> Ne pas faire pointer un flyer français vers `numeline.com/download` : cette page-là
> mène à l'application **américaine** (`id6758400953` / `com.eatsafe.app`).

## Les fichiers

| Fichier | Usage |
|---|---|
| `qr-numeline-fr.svg` | **À privilégier.** Vectoriel : net à n'importe quelle taille, de la carte de visite à l'affiche. À donner à un imprimeur ou à importer dans Illustrator, InDesign, Canva. |
| `qr-numeline-fr-print.png` | 2952 px, 300 dpi, soit 25 cm de côté. Pour les outils qui n'acceptent pas le SVG. |

## Caractéristiques techniques

- Correction d'erreur **H**, la plus robuste (tolère environ 30 % de dégradation).
- Logo occupant **24 %** du côté. Volontairement en dessous de la limite de 30 % :
  cette réserve absorbe l'encre qui bave, un pelliculage brillant ou un scan de biais.
- Modules en `#0a1f1f`, la couleur sombre de la charte.

## Vérifications effectuées

Chaque fichier a été relu par **deux décodeurs indépendants** (OpenCV et ZBar), sur
l'image parfaite puis dans cinq conditions dégradées simulant un scan réel : réduit à
200 px, flou gaussien, incliné de 20°, contraste ramené à 35 %, et avec un bruit
d'impression. **Tous les tests passent.**

## À respecter à l'impression

- **Taille minimale conseillée : 2 cm de côté.** En dessous, la lecture devient
  aléatoire sur les téléphones anciens.
- **Garder la marge blanche** autour du code. Elle fait partie du code : la rogner
  empêche les lecteurs de le détecter.
- **Ne pas inverser les couleurs** (clair sur fond sombre) et éviter d'imprimer sur un
  fond coloré : le contraste chute et la lecture échoue.
- Faire un **essai de scan sur l'épreuve imprimée** avant de lancer le tirage.
