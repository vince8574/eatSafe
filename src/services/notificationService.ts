import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { ScannedProduct, RecallRecord } from '../types';

const channelId = 'recall-alerts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true
  })
});

export async function requestNotificationPermissions() {
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
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ Rappel détecté`,
      body: `${product.brand} - lot ${product.lotNumber} est concerné.`,
      data: { productId: product.id, recallId: recall.id },
      sound: 'default'
    },
    trigger: null
  });
}

export async function scheduleDailyCheck() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Vérification EatSafe',
      body: 'Mise à jour quotidienne des rappels en cours.',
      data: { type: 'daily-check' }
    },
    trigger: {
      hour: 9,
      minute: 0,
      repeats: true
    }
  });
}
