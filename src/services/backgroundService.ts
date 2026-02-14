import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { fetchAllRecalls } from './apiService';
import { db } from './dbService';
import { getRecallStatus } from '../utils/lotMatcher';

const TASK_NAME = 'recall-background-sync';
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    TaskManager.defineTask(TASK_NAME, async () => {
      try {
        console.log('[BackgroundSync] Starting recall check...');
        const startTime = Date.now();

        const scans = await db.getAll();
        console.log(`[BackgroundSync] Found ${scans.length} scanned products`);

        const recalls = await fetchAllRecalls();
        console.log(`[BackgroundSync] Fetched ${recalls.length} recalls from API`);

        let notificationsSent = 0;

        for (const scan of scans) {
          const result = getRecallStatus(scan, recalls);

          if (result.status === 'recalled' && result.recallReference !== scan.recallReference) {
            console.log(`[BackgroundSync] New recall detected for ${scan.brand} - ${scan.lotNumber}`);

            await db.update(scan.id, {
              recallStatus: result.status,
              recallReference: result.recallReference,
              lastCheckedAt: Date.now()
            });

            const recall = recalls.find((item) => item.id === result.recallReference);
            if (recall) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: '⚠️ Rappel produit détecté',
                  body: `${recall.title || scan.brand} fait l'objet d'un rappel sanitaire.`,
                  data: {
                    type: 'recall',
                    productId: scan.id,
                    recallId: recall.id,
                    brand: scan.brand,
                    lotNumber: scan.lotNumber
                  },
                  sound: 'default',
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                  badge: 1
                },
                trigger: null
              });
              notificationsSent++;
              console.log(`[BackgroundSync] Notification sent for ${scan.brand}`);
            }
          } else if (result.status !== scan.recallStatus) {
            await db.update(scan.id, {
              recallStatus: result.status,
              recallReference: result.recallReference,
              lastCheckedAt: Date.now()
            });
          }
        }

        const duration = Date.now() - startTime;
        console.log(`[BackgroundSync] Complete in ${duration}ms - ${notificationsSent} notifications sent`);

        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('[BackgroundSync] Failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  } catch (e) {
    console.warn('[BackgroundSync] Failed to define task:', e);
  }
}

export async function registerBackgroundTask() {
  if (isExpoGo) {
    console.warn('[BackgroundSync] Background fetch unavailable in Expo Go');
    return;
  }

  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      console.log('[BackgroundSync] Task already registered');
      return;
    }

    // Register background fetch task
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 60, // 1 hour in seconds
      stopOnTerminate: false, // Continue after app is closed
      startOnBoot: true // Start on device boot
    });

    console.log('[BackgroundSync] Task registered successfully - will run every hour');
  } catch (error) {
    console.error('[BackgroundSync] Registration failed:', error);
  }
}

export async function unregisterBackgroundTask() {
  try {
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
    console.log('[BackgroundSync] Task unregistered');
  } catch (error) {
    console.error('[BackgroundSync] Unregister failed:', error);
  }
}
