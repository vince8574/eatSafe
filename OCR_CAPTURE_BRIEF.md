# Brief — Lecture du numéro de lot trop incomplète (OCR / capture caméra)

> Document autonome à donner à une IA pour obtenir une solution. Tout le contexte
> nécessaire est ici (problème, diagnostic, ce qui a été essayé, code pertinent,
> question précise). Pas besoin du dépôt complet.

## 1. Contexte produit

App mobile **Expo / React Native** (iOS, testée sur iPhone via TestFlight).
Elle scanne le **numéro de lot** imprimé sur des emballages alimentaires pour le
croiser avec des rappels produits. Pile OCR en cascade :

1. **ML Kit** (`@react-native-ml-kit/text-recognition`) — on-device, premier essai.
2. **Google Cloud Vision** (via une Cloud Function proxy `ocrVision`) — si ML Kit ne sort pas de lot.
3. **Claude** (Cloud Function `ocrClaude`) — dernier recours.

Caméra via **`expo-camera`** (`CameraView`). Le numéro de lot visé est un code
**point-matrice / jet d'encre pâle**, ex. réel : **`MG26148R49A`** (suivi d'une
date `30/06/26` et d'une heure `10:24` sur l'emballage).

## 2. Le problème

Le numéro de lot n'est **jamais lu en entier**. Exemples de sorties réelles pour
le code `MG26148R49A` :
- `R49A30` (fragment + chiffre de la date)
- `48R49`, `8R 49A` (fragment du milieu)
- souvent **rien**.

## 3. Diagnostic CLÉ (déjà établi via les logs serveur)

On a instrumenté la Cloud Function pour logger le texte EXACT renvoyé par Google
Vision. Résultat sur le code difficile :

```
RAW pass     : "8R 49A"     ← Google Vision sur l'image telle que l'app l'envoie
ENHANCED pass: "Y6+88"      ← variante contraste agressif (flou+contraste) = bruit
(autres captures)           RAW: ""   ENHANCED: ""   ← rien de lisible
```

**Conclusion : même la passe BRUTE de Google Vision ne lit qu'un fragment, ou
rien.** Donc **l'image que l'app capture/envoie est déjà trop mauvaise** (floue,
partielle, ou mal cadrée) pour l'OCR. Ce **n'est pas** un problème d'analyse de
texte ni de contraste serveur : on ne peut pas récupérer des caractères absents
de l'image.

➡️ **Le levier restant est la QUALITÉ DE CAPTURE côté app** (netteté / mise au
point / cadrage / résolution / taille du code dans l'image).

## 4. Ce qui a déjà été essayé / écarté

- ✅ **Côté serveur** : prétraitement contraste (niveaux de gris + normalisation
  histogramme + contraste), passe `DOCUMENT_TEXT_DETECTION`, OCR de l'image brute
  ET d'une variante contrastée fusionnées. **Plafond atteint** : marche un peu
  mieux mais ne récupère pas le code entier. Un flou « fusion de points » trop
  agressif a même **dégradé** la lecture (`MG26148R49A` → `Y6+88`).
- ✅ **Extraction / parsing** : le sélecteur de lot choisit déjà le meilleur
  candidat par score. Si Vision renvoyait `MG26148R49A` en un bloc, il serait
  choisi (vérifié). Donc le parsing n'est pas en cause — c'est l'OCR en amont.
- ❌ **Zoom caméra** (`zoom` sur `CameraView`) : essayé pour grossir le code,
  mais **casse la capture pleine résolution sur iOS** (frames noires) → retiré.

## 5. Code pertinent (état actuel)

### 5a. Capture caméra — `src/components/Scanner.tsx`

La `CameraView` est montée ainsi (props essentielles ; **aucune** config de mise
au point, de `pictureSize`/résolution, ni de `mode`) :

```tsx
<CameraView
  ref={cameraRef}
  style={styles.camera}          // plein écran (StyleSheet.absoluteFillObject)
  facing="back"
  active={isFocused}
  flash={flashOn && isFocused ? 'on' : 'off'}
  enableTorch={flashOn && isFocused}
  onCameraReady={() => setCameraReady(true)}
  // (mode code-barres : barcodeScannerSettings + onBarcodeScanned)
/>
```

La capture (déclenchée automatiquement, mains-libres) :

```tsx
const handleCapture = useCallback(async () => {
  if (!cameraRef.current || isProcessingRef.current || !cameraReady) return;
  // ... (verrou anti-collision avec la boucle OCR de prévisualisation) ...
  const frameCount = Math.max(1, multiFrameCount);   // 3 (voyant) / 4 (malvoyant)
  const uris: string[] = [];
  for (let i = 0; i < frameCount; i++) {
    const photo = await cameraRef.current.takePictureAsync({
      quality: 1.0,
      skipProcessing: false,
      shutterSound: false
    });
    if (photo?.uri) uris.push(photo.uri);
    if (i < frameCount - 1 && multiFrameDelayMs > 0) {
      await new Promise((r) => setTimeout(r, multiFrameDelayMs));  // 200-250 ms
    }
  }
  if (uris.length > 0) await onCapture(uris.length === 1 ? uris[0] : uris);
}, [cameraReady, onCapture, multiFrameCount, multiFrameDelayMs]);
```

Il existe aussi une **boucle de prévisualisation OCR** qui prend ~toutes les
1,8 s une photo légère (`quality: 0.4, skipProcessing: true`) → ML Kit on-device,
pour détecter la *présence* d'un lot et déclencher l'auto-capture. (Le `MG…` n'a
pas besoin de focus pour cette détection, mais la capture finale, si.)

### 5b. Prétraitement avant OCR — `src/services/ocrService.ts`

L'image capturée est **resizée puis recadrée en bande centrale** avant d'être
envoyée à ML Kit / Vision :

```ts
const visionPreprocessConfig = { resize: { width: 2000 }, format: JPEG, compress: 0.85 };
// (ML Kit : PNG 1800px)

// Recadrage "bande" (mode lot) — c'est CE qui est envoyé à l'OCR :
const bandHeightFactor = narrowBand ? 0.22 : 0.5;   // 22% de la hauteur
const bandWidthFactor  = narrowBand ? 0.90 : 0.96;  // 90% de la largeur, centré
// → crop centré (originX = 5% largeur, bande horizontale de 22% de haut),
//   puis sortie JPEG 2000px de large pour Vision.
```

Donc Vision reçoit une **bande horizontale recadrée** de l'image. Hypothèses à
investiguer : la bande **coupe** le code (trop étroite en largeur/hauteur), et/ou
le code est **petit** dans l'image d'origine (upscalé → flou), et/ou la photo est
**hors mise au point** (codes très rapprochés).

### 5c. Serveur — `firebase/functions/src/ocrVision.ts`

Proxy Google Vision. Reçoit `{ imageBase64, languageHints }`, fait Vision sur
l'image brute + une variante contrastée (jimp : `greyscale().normalize().contrast(0.25)`),
fusionne, renvoie `{ text, lines, confidence }`. **Ce niveau est jugé à son
plafond** (cf. diagnostic).

## 6. Contraintes

- iOS, build via GitHub Actions (pas d'EAS). Dév sur **Windows** (pas de build iOS
  local ; itération via TestFlight = lente).
- Le serveur (`ocrVision`) est déployable seul, **sans rebuild app** (utile pour
  itérer vite côté traitement, mais le diagnostic dit que le levier est la capture).
- L'utilisateur ne peut pas viser parfaitement (mode **malvoyant** existe aussi).

## 7. Question pour l'IA

Comment **améliorer la qualité de capture** (côté `expo-camera` / preprocessing)
pour que Google Vision lise le code point-matrice pâle **en entier** (`MG26148R49A`)
plutôt qu'un fragment ? Pistes attendues (mais ouvertes) :

1. **Mise au point** : forcer l'autofocus / `autofocus`/`focusable` / tap-to-focus
   sur `CameraView` (expo-camera), focus macro pour codes rapprochés ?
2. **Résolution de capture** : `pictureSize` / `pictureSizes` plus élevé sur iOS ?
   La capture est-elle réellement pleine résolution ?
3. **Cadrage / recadrage** : la bande 22% h × 90% l coupe-t-elle le code ? Faut-il
   l'élargir, ou cadrer dynamiquement sur le bloc de texte détecté ?
4. **Anti-flou** : choisir la frame la plus nette de la rafale (mesure de netteté /
   variance du Laplacien) ? Augmenter la rafale ? Stabilisation ?
5. **Traitement image** côté app (avant upload) qui aiderait sur du point-matrice
   pâle sans détruire les caractères (vs. ce qui a échoué côté serveur) ?
6. Toute autre approche (ex. zone de scan plus serrée + macro, super-résolution,
   multi-frame fusion, etc.).

Donner des **changements de code concrets** pour `Scanner.tsx` (config `CameraView`
+ `takePictureAsync`) et/ou `preprocessImage` dans `ocrService.ts`.
