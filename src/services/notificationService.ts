import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ScannedProduct, RecallRecord } from '../types';
import { extractRecallReason } from '../utils/recallUtils';
import { t } from '../i18n/i18n';

const channelId = 'recall-alerts';
const isExpoGo = Constants.appOwnership === 'expo';

export function setupNotificationHandler() {
  if (isExpoGo) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true
      })
    });
  } catch (e) {
    console.warn('[Notifications] Failed to set notification handler:', e);
  }
}

export async function requestNotificationPermissions() {
  if (isExpoGo) {
    console.warn('Push notifications are not supported in Expo Go; skipping permission request.');
    return false;
  }

  if (!Device.isDevice) {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Recall Alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250]
    });
  }

  return true;
}

export async function scheduleRecallNotification(product: ScannedProduct, recall: RecallRecord) {
  if (isExpoGo) {
    console.warn('Cannot schedule recall notification in Expo Go; this requires a development build.', {
      productId: product.id,
      recallId: recall.id
    });
    return;
  }

  const reason = extractRecallReason(recall);
  const reasonText = reason || recall.title;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notifications.alert.title'),
      body: t('notifications.alert.body', { brand: product.brand, lot: product.lotNumber, reason: reasonText }),
      data: {
        productId: product.id,
        recallId: recall.id,
        reason,
        isUrgent: true
      },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: 'recall-urgent'
    },
    trigger: null
  });
}

export async function scheduleDailyCheck() {
  if (isExpoGo) {
    console.warn('Skipping daily notification scheduling in Expo Go; requires a development build.');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notifications.dailyCheck.title'),
      body: t('notifications.dailyCheck.body'),
      data: { type: 'daily-check' }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0
    }
  });
}
