import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { checkAllProductsForRecalls, RecallCheckResult } from './recallCheckService';
import { updateProduct as updateFirestoreProduct } from './firebaseProductsService';
import { t } from '../i18n/i18n';
import type { ScannedProduct, CountryCode } from '../types';

const BACKGROUND_RECALL_CHECK_TASK = 'background-recall-check';
const LAST_CHECK_KEY = 'last-recall-check';
const NEW_RECALLS_KEY = 'new-recalls-found';
// Avertissements déjà notifiés ("productId::recallId") : UNE seule notification
// par produit et par communiqué, à vie. Sans ça, le cycle horaire re-notifiait
// en boucle (incident du 20/07).
const NOTIFIED_WARNINGS_KEY = 'notified-warning-keys';
const NOTIFIED_WARNINGS_MAX = 300;
const isExpoGo = Constants.appOwnership === 'expo';

// Définir la tâche en arrière-plan
if (!isExpoGo) {
  try {
  TaskManager.defineTask(BACKGROUND_RECALL_CHECK_TASK, async () => {
  console.log('[BackgroundRecallCheck] Running background recall check...');

  try {
    // Récupérer les produits depuis AsyncStorage
    const productsJson = await AsyncStorage.getItem('scanned-products');
    const country: CountryCode = 'US'; // Always US market

    if (!productsJson) {
      console.log('[BackgroundRecallCheck] No products found');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const products: ScannedProduct[] = JSON.parse(productsJson);

    if (products.length === 0) {
      console.log('[BackgroundRecallCheck] No products to check');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Vérifier les rappels
    const results = await checkAllProductsForRecalls(products, country);

    if (results.length > 0) {
      console.log(`[BackgroundRecallCheck] Found ${results.length} products with new recalls`);

      // Sauvegarder les nouveaux rappels pour les afficher à l'ouverture de l'app
      await AsyncStorage.setItem(NEW_RECALLS_KEY, JSON.stringify(results));

      // Registre des avertissements déjà notifiés (1 notif par produit+rappel).
      let notified: string[] = [];
      try {
        notified = JSON.parse((await AsyncStorage.getItem(NOTIFIED_WARNINGS_KEY)) ?? '[]');
      } catch {
        notified = [];
      }
      const notifiedSet = new Set(notified);

      for (const result of results) {
        const productIndex = products.findIndex((p) => p.id === result.productId);
        if (productIndex < 0) continue;
        const product = products[productIndex];

        // COHÉRENCE notif ↔ historique : on persiste le statut dans Firestore
        // (source de vérité de l'historique) AVANT de notifier. Sans ça, une notif
        // de rappel détectée en fond n'apparaissait jamais dans l'historique (le
        // produit restait "safe"/"unknown" en base). Best-effort : si l'écriture
        // échoue (auth pas prête en background), on notifie quand même — la sécurité
        // prime, et la prochaine synchro au premier plan réconciliera.
        try {
          if (result.status === 'recalled') {
            await updateFirestoreProduct(product.id, {
              recallStatus: 'recalled',
              recallReference: result.newRecalls[0].id,
              lastCheckedAt: Date.now()
            });
          } else if (result.status === 'warning') {
            // Communiqué FDA sans lots publiés (marque correspondante) :
            // statut 'warning', PAS 'recalled' — aucun lot ne prouve le match.
            await updateFirestoreProduct(product.id, {
              recallStatus: 'warning',
              recallReference: result.newRecalls[0].id,
              lastCheckedAt: Date.now()
            });
          } else {
            // Le produit n'a plus de rappel correspondant (rappel retiré).
            await updateFirestoreProduct(product.id, {
              recallStatus: 'safe',
              lastCheckedAt: Date.now()
            });
          }
        } catch (e) {
          console.warn('[BackgroundRecallCheck] Firestore status update skipped', e);
        }

        // Mettre à jour AUSSI la copie locale : le cycle suivant relit
        // AsyncStorage — sans ça le "changement" était re-détecté et re-notifié
        // toutes les heures (cause du storm du 20/07).
        products[productIndex] = {
          ...product,
          recallStatus: result.status,
          ...(result.newRecalls[0] ? { recallReference: result.newRecalls[0].id } : {})
        };

        // Notifier les NOUVEAUX rappels (pas les "safe"). Rouge = match par lot.
        if (result.status === 'recalled') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: t('notifications.alert.title'),
              body: t('notifications.alert.body', { brand: product.brand, lot: product.lotNumber, reason: '' }),
              sound: true,
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: [0, 250, 250, 250],
              data: {
                productId: product.id,
                type: 'recall-alert'
              }
            },
            trigger: null
          });
        } else if (result.status === 'warning') {
          // Ambre = communiqué FDA, marque correspondante, pas de lot publié.
          // UNE SEULE notification par produit+communiqué, avec les infos
          // d'identification (dates "Best if Used By") quand elles existent.
          const recall = result.newRecalls[0];
          const key = `${product.id}::${recall.id}`;
          if (!notifiedSet.has(key)) {
            notifiedSet.add(key);
            let body = t('notifications.warningAlert.body', {
              brand: product.brand,
              product: product.productName ?? product.brand
            });
            if (recall.codeInfo) {
              body += `\n${recall.codeInfo.split('\n')[0].slice(0, 120)}`;
            }
            await Notifications.scheduleNotificationAsync({
              content: {
                title: t('notifications.warningAlert.title'),
                body,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.DEFAULT,
                data: {
                  productId: product.id,
                  type: 'recall-warning'
                }
              },
              trigger: null
            });
          }
        }
      }

      // Persister la copie locale synchronisée et le registre de notifs.
      try {
        await AsyncStorage.setItem('scanned-products', JSON.stringify(products));
        await AsyncStorage.setItem(
          NOTIFIED_WARNINGS_KEY,
          JSON.stringify([...notifiedSet].slice(-NOTIFIED_WARNINGS_MAX))
        );
      } catch (e) {
        console.warn('[BackgroundRecallCheck] local cache update skipped', e);
      }

      // Mettre à jour la date de dernière vérification
      await AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());

      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    console.log('[BackgroundRecallCheck] No new recalls found');
    await AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[BackgroundRecallCheck] Error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
  });
  } catch (e) {
    console.warn('[BackgroundRecallCheck] Failed to define task:', e);
  }
}

/**
 * Enregistrer la tâche de vérification en arrière-plan (toutes les heures)
 */
export async function registerBackgroundRecallCheck() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_RECALL_CHECK_TASK);

    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_RECALL_CHECK_TASK, {
        minimumInterval: 60 * 60, // 1 heure en secondes
        stopOnTerminate: false, // Continue après redémarrage
        startOnBoot: true // Démarre au boot
      });
      console.log('[BackgroundRecallCheck] Task registered successfully');
    } else {
      console.log('[BackgroundRecallCheck] Task already registered');
    }
  } catch (error) {
    console.error('[BackgroundRecallCheck] Failed to register task:', error);
  }
}

/**
 * Désactiver la tâche de vérification en arrière-plan
 */
export async function unregisterBackgroundRecallCheck() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_RECALL_CHECK_TASK);
    console.log('[BackgroundRecallCheck] Task unregistered');
  } catch (error) {
    console.error('[BackgroundRecallCheck] Failed to unregister task:', error);
  }
}

/**
 * Vérifier s'il y a de nouveaux rappels détectés en arrière-plan
 * Retourne les résultats et les efface du stockage
 */
export async function getAndClearNewRecalls(): Promise<RecallCheckResult[]> {
  try {
    const newRecallsJson = await AsyncStorage.getItem(NEW_RECALLS_KEY);
    if (newRecallsJson) {
      const results: RecallCheckResult[] = JSON.parse(newRecallsJson);
      await AsyncStorage.removeItem(NEW_RECALLS_KEY);
      return results;
    }
    return [];
  } catch (error) {
    console.error('[BackgroundRecallCheck] Failed to get new recalls:', error);
    return [];
  }
}

/**
 * Obtenir la date de la dernière vérification
 */
export async function getLastCheckTime(): Promise<Date | null> {
  try {
    const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
    return lastCheck ? new Date(lastCheck) : null;
  } catch (error) {
    console.error('[BackgroundRecallCheck] Failed to get last check time:', error);
    return null;
  }
}
