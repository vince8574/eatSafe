import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Image, Animated, KeyboardAvoidingView, Platform, AppState } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Scanner, type ScannerHandle } from '../components/Scanner';
import { performOcr, performOcrMultiFrame, bestDisplayLot, isReliableLot, type OcrStage } from '../services/ocrService';
import { fetchRecallsByCountry } from '../services/apiService';
import { useScannedProducts } from '../hooks/useScannedProducts';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';
import { GradientBackground } from '../components/GradientBackground';
import { ResultBottomNav } from '../components/ResultBottomNav';
import { ImmediateRecallAlert } from '../components/ImmediateRecallAlert';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { saveLotPattern, validateLotAgainstBrandPatterns } from '../services/lotPatternService';
import { recallWarnsProduct } from '../utils/lotMatcher';
import { extractBestByDate, findBestByRecalls } from '../utils/bestByDate';
import { useSubscription } from '../hooks/useSubscription';
import { useUsageQuota } from '../hooks/useUsageQuota';
import { decrementScanCounter } from '../services/subscriptionService';
import * as Notifications from 'expo-notifications';
import { useVoiceGuide } from '../hooks/useVoiceGuide';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { useKeepAwake } from 'expo-keep-awake';

// En mode malvoyant on laisse beaucoup plus de temps avant la capture auto :
// l'utilisateur a besoin de stabiliser le téléphone face à l'étiquette.
const AUTO_CAPTURE_DELAY_VOICE_MS = 3000;
const AUTO_CAPTURE_DELAY_SIGHTED_MS = 400;

// Accessibility-mode constants for blind lot scanning.
const MAX_ACCESSIBILITY_RETRIES = 10;
// Cap paid OCR (Vision/Claude) calls across a continuous blind-scan session.
const MAX_PAID_OCR_PER_SESSION = 6;
const COACHING_SUPPRESS_MS = 7000;
const LOT_COACH_ROTATION = {
  1: ['lotCoach1a', 'lotCoach1b', 'lotCoach1c'], // retries 1-3: keep moving
  2: ['lotCoach2a', 'lotCoach2b', 'lotCoach2c'], // retries 4-6: where to look
  3: ['lotCoach3a', 'lotCoach3b', 'lotCoach3c'], // retries 7-9: insist + hold steady
} as const;
function pickLotCoachKey(retry: number): string {
  if (retry >= MAX_ACCESSIBILITY_RETRIES) return 'accessibility.voice.lotGiveUpSoon';
  const phase = retry <= 3 ? 1 : retry <= 6 ? 2 : 3;
  const variant = (retry - 1) % 3;
  return `accessibility.voice.${LOT_COACH_ROTATION[phase][variant]}`;
}

// Presence detection: reuses isReliableLot so the preview only triggers a capture
// on a real lot-shaped token (not a date / unit / price / word).
function detectLotLike(text: string): boolean {
  const cleaned = text.replace(/\s+/g, ' ').toUpperCase();
  if (/(?:^|[^A-Z])LOT[:\s\-.]*[A-Z0-9]{3,22}/.test(cleaned)) return true;
  if (/(?:^|[^A-Z])L\d{3,15}[A-Z0-9]{0,10}(?:[^A-Z0-9]|$)/.test(cleaned)) return true;
  const tokens = cleaned.match(/[A-Z0-9\/]{4,24}/g) || [];
  return tokens.some((tok) => isReliableLot(tok));
}

function normalizeLotValue(lot: string) {
  // Also strip "/" for recall COMPARISON (4100/01473 -> 410001473). Display keeps it.
  return lot.replace(/\s+/g, '').replace(/[-_.\/]/g, '').toUpperCase();
}

// Lot ACCEPTABLE pour confirmer en mode accessibilité. isReliableLot exige
// >=5 chiffres pour un code purement numérique → un vrai lot court (Giraudet
// "104", Divella "4085") était jugé "non fiable" et le mode voix re-scannait en
// BOUCLE (jusqu'à 10×) au lieu de l'annoncer. Claude/Vision ayant déjà ISOLÉ le
// code, on accepte aussi un court numérique (3-4 chiffres). On NE touche PAS
// isReliableLot (utilisé par la détection d'aperçu) → l'aperçu ne sur-déclenche
// pas sur les nombres à 3-4 chiffres d'une étiquette.
function isAcceptableLotForConfirm(lot: string): boolean {
  if (!lot) return false;
  if (isReliableLot(lot)) return true;
  return /^\d{3,4}$/.test(lot.replace(/\s+/g, ''));
}

export function ScanLotScreen() {
  // Prevent the screen from sleeping during lot detection (can be long in
  // accessibility mode: continuous scan until consensus).
  useKeepAwake();
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { brand, productName, productImage } = useLocalSearchParams<{
    brand: string;
    productName?: string;
    productImage?: string;
  }>();
  const { addProduct, updateRecall, updateProduct } = useScannedProducts();
  const country = usePreferencesStore((state) => state.country);
  const accessibilityMode = usePreferencesStore((state) => state.accessibilityMode);
  const { subscription, loading: subLoading } = useSubscription();
  // Quota de la SAISIE MANUELLE du lot (9 le 1er mois puis 10/mois ; illimitée
  // pour les abonnés). Distinct du quota de scan IA, qui reste sur Firestore.
  const { canManualLot, incrementManualLot } = useUsageQuota();
  const { speak } = useVoiceGuide();

  const scannerRef = useRef<ScannerHandle | null>(null);
  const lotInFrameAnnouncedRef = useRef(false);
  // Horodatage de la dernière fois que l'aperçu a vu une vraie ÉTIQUETTE (cadre
  // rempli de texte). Sert à empêcher la capture de secours de partir sur une
  // scène large / un texte au loin (cas réel : "aucun texte détecté" sur une vue
  // de table). Couplé à richTextStreakRef (stabilité) ci-dessous.
  const lastPreviewTextAtRef = useRef(0);
  // Nombre de lectures d'aperçu consécutives RICHES en texte (étiquette qui
  // remplit le cadre). Décrémenté sur une lecture pauvre. La capture de secours
  // n'part que si une étiquette est STABLE (streak >= 2) → moins de photos
  // floues / mal cadrées qui reviennent "aucun texte".
  const richTextStreakRef = useRef(0);
  const autoFlashAppliedRef = useRef(false);
  const userOverrodeFlashRef = useRef(false);
  const autoCaptureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackCaptureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const isProcessingRef = useRef(false);
  // Vrai tant que l'écran de lot est au premier plan. Sert de garde-fou contre
  // toute (re)capture automatique après qu'on a quitté la page (pas de boucle).
  const isScreenFocusedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  // Accessibility blind-mode: retry loop + anti-truncation consensus.
  const lastLotRef = useRef('');
  const accessibilityRetryRef = useRef(0);
  const lastCoachingAtRef = useRef(0);
  const paidOcrCountRef = useRef(0);
  // BRIDAGE IA : l'IA (lecture auto du lot) est autorisée si ABONNÉ ou s'il reste
  // des scans gratuits. Sinon (non-abonné, 5 scans épuisés) → caméra floutée +
  // saisie manuelle (gratuite, illimitée) + proposition d'abonnement. Pendant le
  // chargement de l'abonnement on autorise (pour ne pas flasher le gate).
  const isSubscribed = (subscription?.status ?? 'none') === 'active';
  const aiAllowed = subLoading || isSubscribed || (subscription?.scansRemaining ?? 0) > 0;
  const aiAllowedRef = useRef(aiAllowed);
  aiAllowedRef.current = aiAllowed;
  // Passe à true dès qu'une lecture IA sert pour CE scan → décrémente au confirm
  // (le manuel ne consomme rien). Remis à false au reset et à l'entrée manuelle.
  const aiUsedThisScanRef = useRef(false);
  const lotSeenCountRef = useRef<Map<string, { count: number; display: string }>>(new Map());
  const lastIntraAgreementRef = useRef(0);

  const [ocrText, setOcrText] = useState('');
  const [ocrSource, setOcrSource] = useState<string>('');
  const [ocrStage, setOcrStage] = useState<OcrStage | null>(null);
  const [lotNumber, setLotNumber] = useState('');
  const [lotCandidates, setLotCandidates] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isConfirmModalVisible, setConfirmModalVisible] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isEditingLot, setIsEditingLot] = useState(false);
  const [editedLot, setEditedLot] = useState('');
  const [isCheckingRecall, setIsCheckingRecall] = useState(false);
  const [hasRecall, setHasRecall] = useState<boolean | null>(null);
  const [matchedLot, setMatchedLot] = useState<string>('');
  const [matchedRecall, setMatchedRecall] = useState<any>(null);
  const [showRecallAlert, setShowRecallAlert] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);
  const [scannerResetToken, setScannerResetToken] = useState(0);
  // Bouton photo manuel : apparaît si aucune capture n'a eu lieu au bout de 5 s
  // (capture auto qui ne part pas — lot pâle / cadrage difficile) pour laisser
  // l'utilisateur déclencher la photo lui-même.
  const [showManualCapture, setShowManualCapture] = useState(false);
  // Mode « Pas de numéro de lot » : beaucoup de produits (frais, marques
  // distributeur type Trader Joe's) n'ont pas de lot — la FDA/USDA les identifie
  // alors par la date "Best if Used By"/"Use By" (souvent une plage). Dans ce
  // mode, l'OCR lit la DATE au lieu du lot, l'affiche à l'utilisateur, et le
  // matching se fait par fenêtre de dates du rappel (bestByInRecallWindow).
  const [bestByMode, setBestByMode] = useState(false);
  const bestByModeRef = useRef(false);
  const [bestByIso, setBestByIso] = useState<string | null>(null);

  // Le quota est désormais appliqué DIRECTEMENT sur la caméra via le gate `aiAllowed`
  // (caméra floutée + saisie manuelle + abonnement) — plus de blocage au confirm,
  // la saisie manuelle reste TOUJOURS possible et gratuite.

  const lotMutation = useMutation({
    mutationFn: async (lotPhoto: string | string[]) => {
      setErrorMessage('');
      setOcrStage('mlkit');
      if (accessibilityMode) {
        // Non-priority + dedupe: fires on every capture, must not cut the guidance.
        speak(t('accessibility.voice.lotAnalyzing'), { dedupeMs: 9000 });
      }
      // Cap paid OCR (Vision/Claude) per scan session in accessibility continuous mode.
      const allowPaidFallback = paidOcrCountRef.current < MAX_PAID_OCR_PER_SESSION;
      // Mode « pas de numéro de lot » → l'OCR serveur bascule sur le prompt DATE
      // (strictement séparé du prompt lot : l'un ne renvoie jamais ce que l'autre cherche).
      const ocrMode: 'lot' | 'bestby' = bestByModeRef.current ? 'bestby' : 'lot';
      const { lot, result, candidates, intraFrameAgreement } = Array.isArray(lotPhoto)
        ? await performOcrMultiFrame(lotPhoto, brand, setOcrStage, { allowPaidFallback, mode: ocrMode })
        : await performOcr(lotPhoto, brand, setOcrStage, { allowPaidFallback, mode: ocrMode });
      if (allowPaidFallback && (result.source === 'vision-fallback' || result.source === 'claude-fallback')) {
        paidOcrCountRef.current += 1;
      }
      // Toujours afficher UN SEUL numéro de lot : le lot extrait, sinon le
      // meilleur candidat plausible. On n'affiche jamais une liste de tokens
      // séparés par des '/' (ce que renvoyait l'ancien repli sur les candidats).
      // lot extrait, sinon LE MEILLEUR candidat (le plus long/lot-like), pas le
      // premier — pour afficher "249334315" et non un fragment "2493".
      // Mode « Pas de numéro de lot » : on lit la DATE Best/Use-By au lieu du lot.
      let displayLot: string;
      if (bestByModeRef.current) {
        // `lot` porte ici la date telle qu'imprimée (renvoyée par le prompt DATE).
        const parsed = extractBestByDate(lot || result.text);
        setBestByIso(parsed?.iso ?? null);
        // Date reconnue → affichage normalisé ; sinon on montre quand même ce qui a
        // été lu, pour que l'utilisateur puisse corriger à la main au lieu d'un vide.
        displayLot = parsed?.display ?? (lot || '').trim();
      } else {
        setBestByIso(null);
        displayLot = lot || bestDisplayLot(candidates || []);
      }
      // Vibration de confirmation dès qu'un numéro de lot est détecté.
      if (displayLot) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setOcrText(result.text);
      setOcrSource(result.source || 'unknown');
      setLotNumber(displayLot);
      setLotCandidates(candidates || []);

      // Anti-truncation consensus (accessibility only): record this read's vote,
      // then decide if the lot is ACCEPTED = reliable AND stable (>=2 agreeing reads
      // or >=2 frames agree). A truncated fragment varies on rotation → never stable.
      lastLotRef.current = displayLot;
      lastIntraAgreementRef.current = intraFrameAgreement ?? 0;
      if (displayLot && isReliableLot(displayLot)) {
        const voteKey = normalizeLotValue(displayLot);
        const prev = lotSeenCountRef.current.get(voteKey);
        lotSeenCountRef.current.set(voteKey, { count: (prev?.count ?? 0) + 1, display: displayLot });
      }
      const seenCount = displayLot
        ? (lotSeenCountRef.current.get(normalizeLotValue(displayLot))?.count ?? 0)
        : 0;
      const agreement = Math.max(seenCount, intraFrameAgreement ?? 0);
      // Mode malvoyant = MÊME logique que le mode normal : on confirme dès la
      // PREMIÈRE lecture fiable (plus d'exigence de consensus 2 lectures, qui ne
      // convergeait jamais sur les codes lus différemment à chaque capture → le
      // lot n'était jamais détecté). On garde juste isReliableLot pour ne pas
      // annoncer une date/un parasite. La voix lit le lot + le statut de rappel.
      const accepted = accessibilityMode
        ? isAcceptableLotForConfirm(displayLot)
        : !!displayLot;

      // Ne pas exiger qu'un lot soit dÃ©tectÃ© - on affiche tout le texte OCR
      // if (!lot) {
      //   throw new Error(t('scan.errors.lotExtractFailed'));
      // }

      // performOcrMultiFrame nettoie ses frames en interne ; ici on ne supprime
      // que la frame unique (cas performOcr).
      if (typeof lotPhoto === 'string') {
        try {
          await FileSystem.deleteAsync(lotPhoto, { idempotent: true });
        } catch (error) {
          console.warn('Failed to delete lot photo', error);
        }
      }

      // Annonce du lot UNIQUEMENT s'il est confirmé (fiable + stable). Sinon, le
      // onSuccess s'occupe du guidage rotatif / de l'abandon (pas d'annonce prématurée).
      if (accessibilityMode && accepted) {
        speak(t('accessibility.voice.lotDetected', { lot: displayLot }));
      }

      // Vérifier les rappels en arrière-plan — seulement sur une lecture confirmée
      // (en mode malvoyant) ou toujours en mode voyant. Évite d'annoncer un statut
      // de rappel sur un lot encore incertain (tronqué).
      if ((!accessibilityMode || accepted) && displayLot) {
        setIsCheckingRecall(true);
        setHasRecall(null);

        const { checkAllCandidates } = await import('../services/candidateMatcherService');

        try {
          let matchResult: { hasRecall: boolean; matchedCandidate?: string; matchedRecall?: any };
          if (bestByModeRef.current) {
            // Mode « Pas de numéro de lot » : match par MARQUE + fenêtre de dates
            // Best/Use-By publiée dans le rappel (jamais par lot).
            const parsed = extractBestByDate(lot || result.text);
            const recallsForDate = parsed ? findBestByRecalls(await fetchRecallsByCountry(country), brand, parsed.iso) : [];
            matchResult = {
              hasRecall: recallsForDate.length > 0,
              matchedCandidate: displayLot,
              matchedRecall: recallsForDate[0]
            };
          } else {
            // Match recalls against ONLY the confirmed lot — never the noisy
            // candidate list (partial/misread tokens, dates) that caused false alerts.
            matchResult = await checkAllCandidates([displayLot], brand, country);
          }
          setHasRecall(matchResult.hasRecall);
          setVerifiedAt(Date.now());
          if (matchResult.matchedCandidate) {
            setMatchedLot(matchResult.matchedCandidate);
          }
          if (matchResult.hasRecall && matchResult.matchedRecall) {
            setMatchedRecall(matchResult.matchedRecall);
            // Afficher immÃ©diatement l'alerte de rappel
            setShowRecallAlert(true);
          }
          if (accessibilityMode) {
            // Non-prioritaire : s'enchaîne après "analyse"/"lot détecté" au lieu
            // de les couper (sinon la voix paraît tronquée pendant le scan).
            speak(
              matchResult.hasRecall
                ? t('accessibility.voice.recallDetected')
                : t('accessibility.voice.productSafe')
            );
          }
        } catch (error) {
          console.error('Error checking recalls:', error);
        } finally {
          setIsCheckingRecall(false);
        }
      }

      return result.text; // Retourner le texte OCR complet
    },
    onError: (error: Error) => {
      setOcrStage(null);
      setErrorMessage(error.message || t('scan.errors.lotExtractFailed'));
      if (accessibilityMode) {
        speak(t('accessibility.voice.scanError'), { priority: true });
      }
    },
    onSuccess: () => {
      setOcrStage(null);
      const lot = lastLotRef.current;
      const key = lot ? normalizeLotValue(lot) : '';
      const seen = key ? (lotSeenCountRef.current.get(key)?.count ?? 0) : 0;
      const intra = lastIntraAgreementRef.current;
      const agreement = Math.max(seen, intra);
      const hadReliableRead = !!lot && isReliableLot(lot);
      // Voir mutationFn : on confirme dès la 1re lecture acceptable (parité avec
      // le mode normal). Le retry ci-dessous ne sert plus qu'au cas SANS lecture
      // exploitable (OCR n'a RIEN sorti — texte vide). Un lot court (4085/104)
      // est désormais ACCEPTÉ → plus de boucle de re-scan sur ces lots.
      const detected = accessibilityMode
        ? isAcceptableLotForConfirm(lot)
        : !!lot;

      // Accessibility: not yet confirmed → keep scanning with rotating guidance.
      if (accessibilityMode && !detected && accessibilityRetryRef.current < MAX_ACCESSIBILITY_RETRIES) {
        accessibilityRetryRef.current += 1;
        const retry = accessibilityRetryRef.current;
        const sinceHint = Date.now() - lastCoachingAtRef.current;
        if (retry >= MAX_ACCESSIBILITY_RETRIES) {
          speak(t('accessibility.voice.lotGiveUpSoon'), { priority: true });
        } else if (sinceHint > COACHING_SUPPRESS_MS) {
          lastCoachingAtRef.current = Date.now();
          if (hadReliableRead && agreement === 1) {
            // Reliable code read ONCE but not stable → likely truncated. Actionable cue.
            speak(t('accessibility.voice.lotPartialSeen'), { priority: false, dedupeMs: 7000 });
          } else {
            speak(t(pickLotCoachKey(retry)), { priority: false, dedupeMs: 7000 });
          }
        }
        // Re-arm WITHOUT opening modal. Do NOT clear lotSeenCountRef (consensus accumulates).
        setOcrText('');
        setLotNumber('');
        lastLotRef.current = '';
        setLotCandidates([]);
        setConfirmModalVisible(false);
        lotInFrameAnnouncedRef.current = false;
        setScannerResetToken((tok) => tok + 1);
        return;
      }

      // Give-up without consensus → show best (most-seen) reliable guess, not empty.
      if (accessibilityMode && !detected && lotSeenCountRef.current.size > 0) {
        let best = { count: 0, display: '' };
        for (const v of lotSeenCountRef.current.values()) if (v.count > best.count) best = v;
        if (best.display) { setLotNumber(best.display); lastLotRef.current = best.display; }
      }

      accessibilityRetryRef.current = 0;
      setConfirmModalVisible(true);
      // lotDetected was already announced in mutationFn when accepted; here only
      // the give-up "not detected" needs announcing.
      if (accessibilityMode && !detected) {
        speak(t('accessibility.voice.lotNotDetected'), { priority: true });
      }
    }
  });

  const resetFlow = useCallback(() => {
    setOcrText('');
    setOcrSource('');
    setOcrStage(null);
    setLotNumber('');
    setLotCandidates([]);
    setErrorMessage('');
    setConfirmModalVisible(false);
    setIsEditingLot(false);
    setEditedLot('');
    setVerifiedAt(null);
    setBestByIso(null); // le mode Best-By reste actif, seule la date lue est purgée
    setScannerResetToken((token) => token + 1);
    lotInFrameAnnouncedRef.current = false;
    autoFlashAppliedRef.current = false;
    userOverrodeFlashRef.current = false;
    // Reset accessibility consensus/retry state for a fresh scan.
    accessibilityRetryRef.current = 0;
    paidOcrCountRef.current = 0;
    lotSeenCountRef.current.clear();
    lastIntraAgreementRef.current = 0;
    lastLotRef.current = '';
    lastCoachingAtRef.current = 0;
    if (autoCaptureTimerRef.current) {
      clearTimeout(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }
  }, []);

  const triggerCaptureFeedback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.45, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start();
  }, [flashAnim]);

  const handleCapture = useCallback(
    async (uri: string | string[]) => {
      // Le lot peut être scanné SANS marque : l'utilisateur a sauté l'étape
      // marque (bouton Passer) ou le code-barres n'a pas résolu de marque.
      // performOcr et le matching de rappel fonctionnent sans marque (param
      // optionnel) et la confirmation retombe sur "Unknown". On ne bloque donc
      // plus l'OCR ici — sinon la capture flashe mais l'analyse ne démarre jamais.
      // Bridage IA : hors quota (non-abonné), on ne lance PAS l'OCR IA — le gate
      // affiché sur la caméra propose la saisie manuelle (gratuite) ou l'abonnement.
      if (!aiAllowedRef.current) return;
      aiUsedThisScanRef.current = true; // cette lecture consomme un scan IA (décrément au confirm)
      lotMutation.mutate(uri);
    },
    [lotMutation]
  );

  const isProcessing = lotMutation.isPending || isFinalizing;
  // Libellé par étape : ML Kit (rapide) → Vision (renforcé) → Claude (approfondi).
  const processingLabel =
    ocrStage === 'vision'
      ? t('scan.stageVision')
      : ocrStage === 'claude'
        ? t('scan.stageClaude')
        : t('scan.lotAnalyzing');

  const handlePreviewOcrText = useCallback(
    (text: string) => {
      // Richesse du texte vu dans l'aperçu : un GROS plan d'étiquette remplit le
      // cadre de texte (date + lot + contexte) ; une scène large ou un texte au
      // loin en a peu. On ne nourrit la capture de secours QUE sur une vraie
      // étiquette, et on suit la STABILITÉ (lectures riches d'affilée) pour éviter
      // de capturer une image floue en plein mouvement. À FAIRE avant les returns.
      const alnumCount = (text.match(/[A-Z0-9]/gi) || []).length;
      if (alnumCount >= 8) {
        lastPreviewTextAtRef.current = Date.now();
        richTextStreakRef.current = Math.min(5, richTextStreakRef.current + 1);
      } else {
        richTextStreakRef.current = Math.max(0, richTextStreakRef.current - 1);
      }
      // isConfirmModalVisible : un résultat est déjà affiché → on ne re-déclenche
      // PLUS de capture (sinon boucle : le preview re-détecte le lot et recapture).
      if (lotInFrameAnnouncedRef.current || isProcessing || isConfirmModalVisible) return;
      if (!detectLotLike(text)) return;
      lotInFrameAnnouncedRef.current = true;
      if (accessibilityMode) {
        speak(t('accessibility.voice.lotInFrame'), { priority: true });
      }
      const delayMs = accessibilityMode ? AUTO_CAPTURE_DELAY_VOICE_MS : AUTO_CAPTURE_DELAY_SIGHTED_MS;
      if (autoCaptureTimerRef.current) clearTimeout(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = setTimeout(() => {
        autoCaptureTimerRef.current = null;
        if (!isProcessingRef.current) {
          triggerCaptureFeedback();
          scannerRef.current?.triggerCapture();
        }
      }, delayMs);
    },
    [accessibilityMode, isProcessing, isConfirmModalVisible, speak, t, triggerCaptureFeedback]
  );

  const handleLowLight = useCallback(
    (isLow: boolean) => {
      if (!isLow) return;
      // On NE déclenche PLUS le flash automatiquement : sur une boîte de conserve
      // (surface réfléchissante) le flash crée des reflets qui empêchent l'OCR de
      // lire le lot. Le flash reste disponible manuellement via le bouton.
      if (accessibilityMode) {
        speak(t('accessibility.voice.lowLight'), { priority: true, dedupeMs: 12000 });
      }
    },
    [accessibilityMode, speak, t]
  );

  const handleVoiceCommand = useCallback(
    (command: 'photo' | 'flash_on' | 'flash_off') => {
      if (command === 'photo') {
        if (!isProcessingRef.current) {
          if (accessibilityMode) {
            speak(t('accessibility.voice.photoCommand'), { priority: true });
          }
          triggerCaptureFeedback();
          scannerRef.current?.triggerCapture();
        }
        return;
      }
      if (command === 'flash_on') {
        scannerRef.current?.setFlash(true);
        userOverrodeFlashRef.current = false;
        if (accessibilityMode) {
          speak(t('accessibility.voice.flashOn'), { priority: true });
        }
        return;
      }
      if (command === 'flash_off') {
        scannerRef.current?.setFlash(false);
        userOverrodeFlashRef.current = true;
        if (accessibilityMode) {
          speak(t('accessibility.voice.flashOff'), { priority: true });
        }
      }
    },
    [accessibilityMode, speak, t, triggerCaptureFeedback]
  );

  isProcessingRef.current = isProcessing;

  useEffect(() => {
    return () => {
      if (autoCaptureTimerRef.current) {
        clearTimeout(autoCaptureTimerRef.current);
        autoCaptureTimerRef.current = null;
      }
    };
  }, []);

  // Micro COUPÉ : sur iOS, la reconnaissance vocale (micro) en continu se bat
  // avec la synthèse pour la session audio → le guidage vocal était tronqué.
  // On désactive donc les commandes vocales ici ; l'auto-capture mains-libres
  // (détection + secours 3s/5s) remplace la commande "photo". Le guidage vocal
  // reste, et il est désormais net.
  useVoiceCommands(false, {
    onCommand: handleVoiceCommand,
    onError: (code) => {
      if (code !== 'no-speech') {
        console.warn('[ScanLotScreen] voice command error:', code);
      }
    }
  });

  const handleConfirm = useCallback(async () => {
    // Mode « Pas de numéro de lot » : la valeur confirmée est une DATE Best/Use-By.
    // Repli manuel : si l'utilisateur a édité, on parse sa saisie comme une date.
    let confirmedBestByIso: string | null = null;
    let finalLot: string;
    if (bestByMode) {
      const manual = isEditingLot ? extractBestByDate(editedLot) : null;
      confirmedBestByIso = manual?.iso ?? bestByIso;
      finalLot = manual?.display ?? (isEditingLot ? '' : lotNumber);
      if (!confirmedBestByIso || !finalLot) {
        // On garde la modale ouverte et la saisie en place : fermer effacerait ce
        // que l'utilisateur vient de taper pour une simple faute de format.
        setErrorMessage(t('scanLot.bestByParseFailed'));
        if (!isEditingLot) {
          setEditedLot('');
          setIsEditingLot(true);
        }
        return;
      }
    } else {
      finalLot = isEditingLot ? editedLot.trim().toUpperCase() : lotNumber;
    }
    const normalizedOcrText = normalizeLotValue(ocrText || '');
    // Purge the garbage: once a lot is confirmed, match recalls against ONLY that
    // lot — not the noisy OCR candidate list — so a partial/misread token can
    // never coincidentally match a recall and raise a false "DO NOT CONSUME".
    const candidatesForMatch = [finalLot]
      .filter(Boolean)
      .map((candidate) => normalizeLotValue(candidate));

    if (!finalLot) {
      setErrorMessage(t('scan.errors.lotExtractFailed'));
      setConfirmModalVisible(false);
      return;
    }

    // Allow empty brand (user skipped brand step) - will be set to "Unknown"
    const finalBrand = brand && brand.trim() ? brand.trim() : t('common.unknown');

    // Chemin MANUEL (aucune lecture IA) → consomme un crédit de lot manuel.
    // Épuisé → écran d'abonnement. (Le chemin IA est bridé en amont par aiAllowed.)
    if (!aiUsedThisScanRef.current && !canManualLot) {
      setConfirmModalVisible(false);
      router.push('/subscription' as any);
      return;
    }

    setIsFinalizing(true);

    try {
      // Les 2 opérations lentes — fetch des rappels (réseau) et addProduct
      // (Firestore) — sont INDÉPENDANTES : on les lance en parallèle au lieu de
      // les enchaîner, ce qui réduit le temps perçu du "OK" (surtout sur Android,
      // réseau/Firestore plus lents). Le fetch tape généralement le cache chaud
      // préchargé à l'ouverture de l'écran.
      const [recallList, product] = await Promise.all([
        fetchRecallsByCountry(country),
        addProduct({
          brand: finalBrand,
          lotNumber: finalLot,
          ...(productName && { productName }),
          ...(productImage && { productImage })
        })
      ]);

      // Apprentissage des patterns de lot : la validation est synchrone (rapide),
      // mais l'ÉCRITURE d'un nouveau pattern (saveLotPattern) n'est pas nécessaire
      // avant de naviguer → fire-and-forget pour ne pas allonger le "OK".
      // (Sauf en mode Best-By : une date n'est pas un pattern de lot.)
      if (!confirmedBestByIso) {
        const validation = validateLotAgainstBrandPatterns(finalBrand, finalLot);
        if (validation.isValid) {
          console.log(`[ScanLotScreen] Lot ${finalLot} validated against existing patterns for ${finalBrand}`);
        } else {
          console.log(`[ScanLotScreen] New lot pattern detected for ${finalBrand}: ${finalLot}`);
          void Promise.resolve(saveLotPattern(finalBrand, finalLot)).catch((e) =>
            console.warn('[ScanLotScreen] saveLotPattern skipped', e)
          );
        }
      }

      const matchingRecalls = confirmedBestByIso
        ? // Mode « Pas de numéro de lot » : match par MARQUE + fenêtre de dates
          // Best/Use-By publiée dans le rappel (c'est l'identification officielle
          // FDA/USDA pour les produits sans lot).
          findBestByRecalls(recallList, finalBrand, confirmedBestByIso)
        : recallList.filter((recall) => {
        // Skip recalls without lot numbers — brand-only matching is too unreliable
        if (!recall.lotNumbers || recall.lotNumbers.length === 0) {
          return false;
        }

        // Check if brand matches (required for partial lot matching)
        const brandLower = finalBrand.toLowerCase();
        const recallBrandLower = (recall.brand || '').toLowerCase();
        const isBrandMatch = brandLower === recallBrandLower ||
          (brandLower.length >= 3 && recallBrandLower.includes(brandLower)) ||
          (recallBrandLower.length >= 3 && brandLower.includes(recallBrandLower));

        const lotMatch = recall.lotNumbers.some((lot) => {
          const normalizedRecallLot = normalizeLotValue(lot);
          if (!normalizedRecallLot || normalizedRecallLot.length < 3) {
            return false;
          }

          return candidatesForMatch.some((candidate) => {
            if (!candidate || candidate.length < 3) return false;

            // Exact match (always accepted)
            if (candidate === normalizedRecallLot) return true;

            // Partial match only if brand also matches AND shorter string is at least 6 chars
            if (isBrandMatch) {
              const shorter = candidate.length <= normalizedRecallLot.length ? candidate : normalizedRecallLot;
              const longer = candidate.length > normalizedRecallLot.length ? candidate : normalizedRecallLot;
              return shorter.length >= 6 && longer.includes(shorter);
            }

            return false;
          });
        });

        return lotMatch;
      });

      if (matchingRecalls.length === 0) {
        // Pas de match par LOT. Repli : COMMUNIQUÉ FDA récent sans lots publiés
        // (cas Taylor Farms — les lots/dates sont dans la page de l'avis) dont
        // la MARQUE correspond → statut 'warning' ("rappel possible, vérifiez
        // l'avis officiel"), avec les infos d'identification publiées (dates
        // "Best if Used By"…) affichées sur l'écran détail. Jamais 'recalled'
        // sans preuve par lot.
        const warningRecalls = recallList.filter((recall) =>
          recallWarnsProduct({ brand: finalBrand, productName }, recall)
        );
        if (warningRecalls.length > 0) {
          console.log(
            `[ScanLotScreen] Lot-less recall warning for ${finalBrand} (${productName ?? 'no product name'}): ${warningRecalls[0].id}`
          );
          await updateProduct(product.id, {
            recallStatus: 'warning',
            recallReference: warningRecalls[0].id,
            lastCheckedAt: Date.now()
          });
        } else {
          // No recalls found — mark product as safe immediately
          await updateProduct(product.id, {
            recallStatus: 'safe',
            lastCheckedAt: Date.now()
          });
        }
      } else {
        await updateRecall(product, matchingRecalls);
      }

      if (matchingRecalls.length > 0) {
        // Send immediate notification when recall is detected
        console.log(`[ScanLotScreen] Recall detected! Sending notification for ${finalBrand} - ${finalLot}`);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 ALERTE PRODUIT RAPPELÉ',
            body: `⚠️ ${finalBrand} - Lot ${finalLot}\n\n🚫 NE PAS CONSOMMER\nCe produit fait l'objet d'un rappel sanitaire.`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
            data: {
              productId: product.id,
              type: 'immediate-recall-alert',
              brand: finalBrand,
              lotNumber: finalLot
            }
          },
          trigger: null // Send immediately
        });
      }

      // Décompte sur le BON compteur : scan IA (Firestore) ou lot manuel (local).
      // Non bloquant.
      if (aiUsedThisScanRef.current) {
        void decrementScanCounter().catch((e) =>
          console.warn('[ScanLotScreen] decrementScanCounter skipped', e)
        );
      } else {
        incrementManualLot();
      }

      resetFlow();
      router.replace({ pathname: '/details/[id]', params: { id: product.id } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('scan.errors.scanFailed'));
    } finally {
      setConfirmModalVisible(false);
      setIsFinalizing(false);
      setIsEditingLot(false);
      setEditedLot('');
    }
  }, [
    addProduct,
    brand,
    country,
    lotNumber,
    bestByMode,
    bestByIso,
    isEditingLot,
    editedLot,
    ocrText,
    lotCandidates,
    productName,
    productImage,
    decrementScanCounter,
    canManualLot,
    incrementManualLot,
    resetFlow,
    router,
    t,
    updateRecall,
    updateProduct
  ]);

  const handleRestart = useCallback(() => {
    setLotNumber('');
    setOcrText('');
    setOcrSource('');
    setLotCandidates([]);
    setErrorMessage('');
    setConfirmModalVisible(false);
    setIsEditingLot(false);
    setEditedLot('');
    setVerifiedAt(null);
    setScannerResetToken((token) => token + 1);
    lotInFrameAnnouncedRef.current = false;
    autoFlashAppliedRef.current = false;
    userOverrodeFlashRef.current = false;
    accessibilityRetryRef.current = 0;
    paidOcrCountRef.current = 0;
    lotSeenCountRef.current.clear();
    lastIntraAgreementRef.current = 0;
    lastLotRef.current = '';
    lastCoachingAtRef.current = 0;
    if (autoCaptureTimerRef.current) {
      clearTimeout(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }
  }, []);

  const handleEditLot = useCallback(() => {
    setEditedLot(lotNumber || '');
    setIsEditingLot(true);
  }, [lotNumber]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingLot(false);
    setEditedLot('');
  }, []);

  // Bascule lot ⇄ date. Changer de mode change ce que l'OCR cherche : on repart
  // d'un scan propre pour ne pas confirmer une lecture faite dans l'autre mode.
  const selectBestByMode = useCallback(
    (next: boolean) => {
      if (next === bestByModeRef.current) return;
      setBestByMode(next);
      bestByModeRef.current = next;
      resetFlow();
    },
    [resetFlow]
  );

  // Relecture à la volée de ce que l'utilisateur tape : il voit tout de suite si
  // sa date est comprise, au lieu de découvrir l'échec après validation.
  const manualBestBy = useMemo(
    () => (bestByMode && isEditingLot && editedLot.trim() ? extractBestByDate(editedLot) : null),
    [bestByMode, isEditingLot, editedLot]
  );

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleManualEntry = useCallback(() => {
    // Aucun scan IA consommé, mais un crédit de LOT MANUEL. Crédits épuisés →
    // écran d'abonnement, sans ouvrir la saisie.
    if (!canManualLot) {
      router.push('/subscription' as any);
      return;
    }
    aiUsedThisScanRef.current = false;
    setEditedLot('');
    setIsEditingLot(true);
    setConfirmModalVisible(true);
  }, [canManualLot, router]);

  useFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;
      setScannerResetToken((token) => token + 1);
      // Fresh scan session → reset accessibility consensus/retry state.
      accessibilityRetryRef.current = 0;
      paidOcrCountRef.current = 0;
      lotSeenCountRef.current.clear();
      lastIntraAgreementRef.current = 0;
      lastLotRef.current = '';
      lastCoachingAtRef.current = 0;
      // Préchauffe le cache des rappels (réseau FDA+USDA, ~1000 enreg.) dès
      // l'ouverture de l'écran : le fetch chevauche le temps de scan/lecture de
      // l'utilisateur, donc le `fetchRecallsByCountry` de handleConfirm tape un
      // cache chaud → le "OK" est quasi instantané (surtout sur Android où la
      // connexion réseau/Firestore est plus lente). Cache TTL 5 min ≫ délai scan→OK.
      void fetchRecallsByCountry(country);
      if (accessibilityMode) {
        speak(t('accessibility.voice.scanLotReady'), { priority: true });
      }
      // En quittant l'écran : on coupe le focus ET on annule tout timer de
      // capture en attente → AUCUNE capture/boucle après être sorti de la page.
      return () => {
        isScreenFocusedRef.current = false;
        if (fallbackCaptureTimerRef.current) {
          clearTimeout(fallbackCaptureTimerRef.current);
          fallbackCaptureTimerRef.current = null;
        }
        if (autoCaptureTimerRef.current) {
          clearTimeout(autoCaptureTimerRef.current);
          autoCaptureTimerRef.current = null;
        }
      };
    }, [accessibilityMode, speak, t, country])
  );

  // Blind users: re-announce the lot-scan intro when the app returns to the
  // foreground (useFocusEffect doesn't fire on background→active), so the voice
  // guidance doesn't go silent after switching apps and coming back.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (
        prev.match(/inactive|background/) &&
        next === 'active' &&
        accessibilityMode &&
        isScreenFocusedRef.current &&
        !isProcessingRef.current &&
        !isConfirmModalVisible
      ) {
        speak(t('accessibility.voice.scanLotReady'), { priority: true });
      }
    });
    return () => sub.remove();
  }, [accessibilityMode, speak, t, isConfirmModalVisible]);

  // Auto-capture de secours (mains libres) : si la pré-détection par preview
  // n'a rien donné au bout de quelques secondes (étiquette peu contrastée,
  // faible lumière sans flash, impression point-matrice), on force une capture
  // pleine résolution qui déclenche l'OCR complet (ML Kit + Vision + Claude).
  // Indispensable pour l'accessibilité : un malvoyant ne peut pas viser un
  // bouton. Ré-armé à chaque (ré)init du scanner (focus, "Recommencer").
  useEffect(() => {
    // Résultat affiché → on NE ré-arme PAS le secours et on NE remet PAS le
    // garde-fou à false (sinon le preview re-déclenche une capture → boucle).
    if (isConfirmModalVisible) return;
    lotInFrameAnnouncedRef.current = false;
    const delayMs = accessibilityMode ? 5000 : 3000;
    // Au-delà de ce délai sans AUCUN texte vu dans l'aperçu, le téléphone n'est
    // pas cadré sur un emballage → on n'envoie PAS de capture à vide (sinon Claude
    // reçoit une scène large et renvoie "aucun texte"). On re-teste périodiquement
    // et on ne capture QUE lorsque du texte est apparu récemment.
    const FRESH_TEXT_MS = 2500;
    const armFallback = (delay: number) => {
      fallbackCaptureTimerRef.current = setTimeout(() => {
        if (lotInFrameAnnouncedRef.current || isProcessingRef.current) return;
        // Capture de secours UNIQUEMENT si une vraie étiquette est STABLE dans le
        // cadre (texte riche vu récemment ET sur ≥2 lectures). Sinon (scène large,
        // texte au loin, image en mouvement) on attend → plus de "aucun texte".
        const labelStableInFrame =
          Date.now() - lastPreviewTextAtRef.current < FRESH_TEXT_MS &&
          richTextStreakRef.current >= 2;
        if (!labelStableInFrame) {
          armFallback(800);
          return;
        }
        lotInFrameAnnouncedRef.current = true;
        triggerCaptureFeedback();
        scannerRef.current?.triggerCapture();
      }, delay);
    };
    if (fallbackCaptureTimerRef.current) clearTimeout(fallbackCaptureTimerRef.current);
    armFallback(delayMs);
    return () => {
      if (fallbackCaptureTimerRef.current) {
        clearTimeout(fallbackCaptureTimerRef.current);
        fallbackCaptureTimerRef.current = null;
      }
    };
  }, [scannerResetToken, accessibilityMode, triggerCaptureFeedback, isConfirmModalVisible]);

  // Bouton photo manuel de secours (mode voyant) : si aucune capture n'a eu lieu au
  // bout de 5 s (la capture auto ne part pas : lot trop pâle, cadrage difficile),
  // on affiche le bouton pour que l'utilisateur déclenche la photo lui-même.
  // Réinitialisé à chaque (ré)armement du scanner / capture / résultat affiché.
  useEffect(() => {
    if (accessibilityMode || isConfirmModalVisible || isProcessing) {
      setShowManualCapture(false);
      return;
    }
    setShowManualCapture(false);
    const id = setTimeout(() => setShowManualCapture(true), 5000);
    return () => clearTimeout(id);
  }, [scannerResetToken, accessibilityMode, isConfirmModalVisible, isProcessing]);

  return (
    <GradientBackground>
      <Scanner
        ref={scannerRef}
        onCapture={handleCapture}
        enableBarcodeScanning={false}
        isProcessing={isProcessing}
        mode="band"
        resetToken={scannerResetToken}
        flashPosition="top-right"
        multiFrameCount={accessibilityMode ? 4 : 3}
        multiFrameDelayMs={accessibilityMode ? 250 : 200}
        onBack={handleGoBack}
        onRestart={handleRestart}
        onManualEntry={handleManualEntry}
        previewOcrEnabled={aiAllowed && !isConfirmModalVisible}
        onPreviewOcrText={handlePreviewOcrText}
        lowLightDetectionEnabled
        onLowLight={handleLowLight}
        hideCaptureButton={!showManualCapture}
      />

      {/* Bridage IA : hors quota (non-abonné) → caméra floutée + saisie manuelle
          gratuite + proposition d'abonnement. */}
      {!aiAllowed && (
        <BlurView intensity={45} tint="dark" style={styles.gateOverlay}>
          <TouchableOpacity style={styles.gateBack} onPress={handleGoBack} accessibilityRole="button">
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.gateCard}>
            <Ionicons name="sparkles" size={44} color={colors.accent} />
            <Text style={styles.gateTitle}>{t('quota.gateTitle')}</Text>
            <Text style={styles.gateSubtitle}>{t('quota.gateSubtitle')}</Text>
            <TouchableOpacity
              style={[styles.gateBtnPrimary, { backgroundColor: colors.accent }]}
              onPress={handleManualEntry}
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={20} color={colors.onAccent} />
              <Text style={[styles.gateBtnPrimaryText, { color: colors.onAccent }]}>{t('quota.gateManual')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gateBtnSecondary}
              onPress={() => router.push('/subscription')}
              accessibilityRole="button"
            >
              <Ionicons name="star" size={18} color="#fff" />
              <Text style={styles.gateBtnSecondaryText}>{t('quota.gateSubscribe')}</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      )}

      <Animated.View
        pointerEvents="none"
        style={[styles.shutterFlash, { opacity: flashAnim }]}
      />

      <ScrollView style={styles.feedback} contentContainerStyle={styles.feedbackContent}>
        {/* Compteur de scans */}
        {subscription && (
          <View style={[styles.scanCounter, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
            <Text style={[styles.scanCounterLabel, { color: colors.textSecondary }]}>
              {t('subscription.scansRemaining')}
            </Text>
            <Text style={[styles.scanCounterValue, { color: colors.accent }]}>
              {subscription.scansRemaining} / {subscription.scansIncluded}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.instructions,
            {
              backgroundColor: 'rgba(255,200,87,0.18)',
              borderColor: colors.warning,
              shadowColor: colors.warning
            }
          ]}
        >
          <Text
            style={[
              styles.stepLabel,
              { color: colors.warning }
            ]}
          >
            {t('scan.lotStep')}
          </Text>
          <Text
            style={[
              styles.instructionText,
              { color: colors.textPrimary }
            ]}
          >
            {isProcessing
              ? processingLabel
              : bestByMode
                ? t('scanLot.bestByInstruction')
                : t('scan.lotInstruction')}
          </Text>
        </View>

        {/* Beaucoup de produits (frais, marques distributeur) n'ont PAS de lot :
            la FDA/USDA les identifie alors par la date "Best if Used By". Les
            deux modes sont donc présentés côte à côte, mode courant en évidence,
            plutôt qu'en bascule cachée derrière un seul bouton. */}
        <View style={[styles.modeSwitch, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          {([
            { on: false, icon: 'pricetag-outline' as const, label: t('scanLot.modeLot') },
            { on: true, icon: 'calendar-outline' as const, label: t('scanLot.modeBestBy') }
          ]).map((opt) => {
            const active = bestByMode === opt.on;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[styles.modeSegment, active && { backgroundColor: colors.accent }]}
                onPress={() => selectBestByMode(opt.on)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={active ? colors.onAccent : colors.textSecondary}
                />
                <Text
                  style={[styles.modeSegmentText, { color: active ? colors.onAccent : colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.modeHelp, { color: colors.textSecondary }]}>
          {bestByMode ? t('scanLot.modeBestByHelp') : t('scanLot.modeLotHelp')}
        </Text>

        {/* La saisie manuelle existait, mais seulement APRÈS un scan raté. Ici
            elle est offerte d'emblée : emballage abîmé, date gravée illisible… */}
        <TouchableOpacity
          style={[styles.manualCta, { borderColor: colors.accent }]}
          onPress={handleManualEntry}
          accessibilityRole="button"
        >
          <Ionicons name="create-outline" size={16} color={colors.accent} />
          <Text style={[styles.manualCtaText, { color: colors.accent }]}>
            {bestByMode ? t('scanLot.manualBestByCta') : t('scanLot.manualLotCta')}
          </Text>
        </TouchableOpacity>

        {(productImage || productName) && (
          <View style={[styles.productInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                style={styles.productImageSmall}
                resizeMode="contain"
              />
            ) : null}
            {productName ? (
              <Text style={[styles.productNameSmall, { color: colors.textPrimary }]}>
                {productName}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: brand ? colors.surface : colors.surfaceAlt,
                borderColor: brand ? colors.accent : colors.surfaceAlt
              }
            ]}
          >
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{t('scan.brandLabel')}</Text>
            <Text style={[styles.statusValue, { color: brand ? colors.success : colors.textSecondary }]}>
              {brand || t('scan.waiting')}
            </Text>
          </View>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: lotNumber ? colors.surface : colors.surfaceAlt,
                borderColor: lotNumber ? colors.accent : colors.surfaceAlt
              }
            ]}
          >
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              {bestByMode ? t('scanLot.bestByLabel') : t('scan.lotLabel')}
            </Text>
            <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
              {lotNumber || (lotMutation.isPending ? t('scan.analyzing') : t('scan.waiting'))}
            </Text>
          </View>
        </View>

        {lotNumber && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('scan.detectedLot')}</Text>
            <Text style={[styles.lotText, { color: colors.accent }]}>{lotNumber}</Text>
          </>
        )}

        {errorMessage ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
        ) : null}

        <View style={[styles.appDisclaimerBox, { backgroundColor: colors.surfaceAlt, borderColor: 'rgba(255,255,255,0.06)' }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.appDisclaimerText, { color: colors.textPrimary }]}>
            {t('common.appDisclaimer')}
          </Text>
        </View>
      </ScrollView>

      <ResultBottomNav />

      <Modal
        visible={isConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {bestByMode ? t('scanLot.confirmBestByTitle') : t('scan.confirmLotTitle')}
            </Text>

            {isEditingLot ? (
              <>
                <Text style={[styles.modalMessage, { color: colors.textSecondary, marginTop: 12 }]}>
                  {bestByMode ? t('scanLot.editBestByManually') : t('scanLot.editManually')}
                </Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.accent }]}
                  value={editedLot}
                  onChangeText={(value) => {
                    setEditedLot(value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder={bestByMode ? t('scanLot.enterBestBy') : t('scanLot.enterLot')}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  autoFocus
                  multiline={!bestByMode}
                  numberOfLines={bestByMode ? 1 : 3}
                  textAlignVertical="top"
                />
                {bestByMode && editedLot.trim().length > 0 ? (
                  <Text
                    style={[
                      styles.bestByPreview,
                      { color: manualBestBy ? colors.success : colors.textSecondary }
                    ]}
                  >
                    {manualBestBy
                      ? t('scanLot.bestByPreview', { date: manualBestBy.display })
                      : t('scanLot.bestByNotParsed')}
                  </Text>
                ) : null}
                {errorMessage ? (
                  <Text style={[styles.bestByPreview, { color: colors.danger }]}>{errorMessage}</Text>
                ) : null}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}
                    onPress={handleCancelEdit}
                    disabled={isFinalizing}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                      {t('common.cancel')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.accent }]}
                    onPress={handleConfirm}
                    disabled={isFinalizing}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.surface }]}>
                      {t('scan.validate')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                  {bestByMode ? t('scanLot.bestByDetected') : t('scanLot.ocrDetected')}
                </Text>
                <TouchableOpacity
                  style={[styles.ocrTextContainer, styles.ocrTextContainerEditable, { backgroundColor: colors.surfaceAlt, borderColor: colors.accent }]}
                  onPress={handleEditLot}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('scanLot.editHint')}
                >
                  <Text style={[styles.ocrText, { color: colors.textPrimary, flex: 1 }]}>
                    {lotNumber || t('scanLot.noText')}
                  </Text>
                  <Ionicons name="create-outline" size={22} color={colors.accent} />
                </TouchableOpacity>
                <Text style={[styles.editHintText, { color: colors.accent }]}>
                  {t('scanLot.editHint')}
                </Text>

                {ocrSource && (
                  <View style={[styles.ocrSourceContainer, { backgroundColor: ocrSource === 'vision-fallback' ? '#e8f5e9' : '#e3f2fd' }]}>
                    <Text style={[styles.ocrSourceText, { color: ocrSource === 'vision-fallback' ? '#2e7d32' : '#1565c0' }]}>
                      {ocrSource === 'vision-fallback' ? t('scanLot.ocrSourceVision') : ocrSource === 'mlkit' ? t('scanLot.ocrSourceMlKit') : t('scanLot.ocrSourceAdvanced')}
                    </Text>
                    {verifiedAt && (
                      <Text style={[styles.recallMeta, { color: colors.textSecondary }]}>
                        {t('productCard.scannedAt', {
                          date: new Date(verifiedAt).toLocaleDateString(locale || undefined),
                          time: new Date(verifiedAt).toLocaleTimeString(locale || undefined, {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        })}
                      </Text>
                    )}
                    <Text style={[styles.recallDisclaimer, { color: colors.textSecondary }]}>
                      {t('common.noRecallDisclaimer')}
                    </Text>
                  </View>
                )}

                {isCheckingRecall && (
                  <View style={styles.checkingContainer}>
                    <Text style={[styles.checkingText, { color: colors.textSecondary }]}>
                      ðŸ” {t('scanLot.checkingRecalls')}
                    </Text>
                  </View>
                )}

                {!isCheckingRecall && hasRecall !== null && (
                  <View style={[
                    styles.recallStatusContainer,
                    {
                      backgroundColor: hasRecall ? '#fee' : '#eef1f5',
                      borderColor: hasRecall ? '#f44' : '#8a94a6'
                    }
                  ]}>
                    <Text style={[styles.recallStatusText, { color: hasRecall ? '#f44' : '#4a5568' }]}>
                      {hasRecall
                        ? matchedLot ? t('scanLot.recallDetectedWithLot', { lot: matchedLot }) : t('scanLot.recallDetected')
                        : t('scanLot.productSafe')}
                    </Text>
                    {!hasRecall && (
                      <Text style={styles.recallStatusDetail}>{t('scanLot.productSafeDetail')}</Text>
                    )}
                  </View>
                )}


                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.accent }]}
                  onPress={handleEditLot}
                >
                  <Text style={[styles.editButtonText, { color: colors.accent }]}>
                    {t('scanLot.edit')}
                  </Text>
                </TouchableOpacity>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}
                    onPress={() => { setConfirmModalVisible(false); resetFlow(); }}
                    disabled={isFinalizing}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                      {t('scan.restart')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.accent }]}
                    onPress={handleConfirm}
                    disabled={isFinalizing}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.surface }]}>
                      {t('scan.validate')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <ImmediateRecallAlert
        visible={showRecallAlert}
        recall={matchedRecall}
        matchedLot={matchedLot}
        onClose={() => setShowRecallAlert(false)}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  feedback: {
    maxHeight: 380,
    paddingHorizontal: 24
  },
  feedbackContent: {
    paddingVertical: 16,
    paddingBottom: 48,
    gap: 16
  },
  instructions: {
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderWidth: 1,
    borderRadius: 14
  },
  modeSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10
  },
  modeSegmentText: { fontSize: 13, fontWeight: '700' },
  modeHelp: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: -8
  },
  manualCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: -6
  },
  manualCtaText: { fontSize: 13, fontWeight: '700' },
  bestByPreview: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center'
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600'
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12
  },
  statusPill: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  statusValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700'
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22
  },
  lotText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8
  },
  resetButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center'
  },
  resetText: {
    fontSize: 16,
    fontWeight: '700'
  },
  backButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)'
  },
  modalScroll: {
    flex: 1
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    gap: 20
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center'
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },
  editInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 8,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top'
  },
  candidatesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12
  },
  candidateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 4
  },
  candidateText: {
    fontSize: 14,
    fontWeight: '600'
  },
  editButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    marginVertical: 8
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700'
  },
  ocrTextContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    maxHeight: 120
  },
  ocrText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22
  },
  // Case du résultat rendue cliquable (bordure accent + icône crayon) pour
  // signaler clairement qu'on peut corriger un lot mal lu.
  ocrTextContainerEditable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    marginBottom: 2
  },
  editHintText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8
  },
  ocrSourceContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8
  },
  ocrSourceText: {
    fontSize: 12,
    fontWeight: '600'
  },
  checkingContainer: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  checkingText: {
    fontSize: 14,
    fontStyle: 'italic'
  },
  recallStatusContainer: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    alignItems: 'center'
  },
  recallStatusText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  },
  recallStatusDetail: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4a5568',
    textAlign: 'center',
    marginTop: 6
  },
  recallMeta: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center'
  },
  recallDisclaimer: {
    marginTop: 6,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center'
  },
  productInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginVertical: 8
  },
  productImageSmall: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5'
  },
  productNameSmall: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18
  },
  appDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1
  },
  appDisclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1
  },
  scanCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12
  },
  scanCounterLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  scanCounterValue: {
    fontSize: 18,
    fontWeight: '800'
  },
  shutterFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 20
  },
  gateOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    zIndex: 25
  },
  gateBack: { position: 'absolute', top: 52, left: 20, padding: 6 },
  gateCard: { alignItems: 'center', gap: 14, width: '100%', maxWidth: 360 },
  gateTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  gateSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 21, textAlign: 'center', marginBottom: 6 },
  gateBtnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, paddingHorizontal: 24, borderRadius: 14, width: '100%'
  },
  gateBtnPrimaryText: { fontSize: 16, fontWeight: '700' },
  gateBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, paddingHorizontal: 24, borderRadius: 14, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)', width: '100%'
  },
  gateBtnSecondaryText: { color: '#fff', fontSize: 15, fontWeight: '700' }
});
