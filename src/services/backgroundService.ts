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

      return TaskManager.TaskExecutionResult.NewData;
    } catch (error) {
      console.warn('Background sync failed', error);
      return TaskManager.TaskExecutionResult.Failed;
    }
  });
}

export async function registerBackgroundTask() {
  if (isExpoGo) {
    console.warn('Background fetch is unavailable in Expo Go; skipping background task registration.');
    return;
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      console.log('Background task already registered');
      return;
    }

    // Note: Background task registration using expo-task-manager requires
    // additional setup in app config and native modules. For now, we're just
    // defining the task. Full implementation would require expo-background-fetch
    // replacement or using platform-specific background task APIs.
    console.log('Background task defined and ready for registration');
  } catch (error) {
    console.warn('Failed to check background task registration', error);
  }
}
