import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { fetchAllRecalls } from './apiService';
import { db } from './dbService';
import { getRecallStatus } from '../utils/lotMatcher';
import { scheduleRecallNotification } from './notificationService';

const TASK_NAME = 'recall-background-sync';
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      const scans = await db.getAll();
      const recalls = await fetchAllRecalls();

      for (const scan of scans) {
        const result = getRecallStatus(scan, recalls);

        if (result.status === 'recalled' && result.recallReference !== scan.recallReference) {
          await db.update(scan.id, {
            recallStatus: result.status,
            recallReference: result.recallReference,
            lastCheckedAt: Date.now()
          });

          const recall = recalls.find((item) => item.id === result.recallReference);
          if (recall) {
            await scheduleRecallNotification(scan, recall);
          }
        } else {
          await db.update(scan.id, {
            recallStatus: result.status,
            recallReference: result.recallReference,
            lastCheckedAt: Date.now()
          });
        }
      }

      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.warn('Background sync failed', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function registerBackgroundTask() {
  if (isExpoGo) {
    console.warn('Background fetch is unavailable in Expo Go; skipping background task registration.');
    return;
  }

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      console.warn('Background fetch unavailable');
      return;
    }

    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 60, // 1 hour
      stopOnTerminate: false,
      startOnBoot: true
    });
  } catch (error) {
    console.warn('Failed to register background task', error);
  }
}
