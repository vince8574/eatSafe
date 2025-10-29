import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ScannedProduct, RecallRecord } from '../types';

type NotificationsModule = typeof import('expo-notifications');

const channelId = 'recall-alerts';
const isExpoGo = Constants.appOwnership === 'expo';

let notificationsModule: NotificationsModule | null | undefined;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (isExpoGo) {
    return null;
  }

  if (!notificationsModule) {
    const mod = await import('expo-notifications');
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true
      })
    });
    notificationsModule = mod;
  }

  return notificationsModule;
}

export async function requestNotificationPermissions() {
  const Notifications = await loadNotifications();
  if (!Notifications) {
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
      name: 'Alertes Rappels',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250]
    });
  }

  return true;
}

export async function scheduleRecallNotification(product: ScannedProduct, recall: RecallRecord) {
  const Notifications = await loadNotifications();
  if (!Notifications) {
    console.warn('Cannot schedule recall notification in Expo Go; this requires a development build.', {
      productId: product.id,
      recallId: recall.id
    });
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rappel détecté',
      body: `${product.brand} - lot ${product.lotNumber} est concerné.`,
      data: { productId: product.id, recallId: recall.id },
      sound: 'default'
    },
    trigger: null
  });
}

export async function scheduleDailyCheck() {
  const Notifications = await loadNotifications();
  if (!Notifications) {
    console.warn('Skipping daily notification scheduling in Expo Go; requires a development build.');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Vérification EatSafe',
      body: 'Mise à jour quotidienne des rappels en cours.',
      data: { type: 'daily-check' }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0
    }
  });
}
