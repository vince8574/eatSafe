import { useEffect } from 'react';
import { AppState } from 'react-native';
import { registerBackgroundTask } from '../services/backgroundService';
import { requestNotificationPermissions } from '../services/notificationService';
import { useDatabaseWarmup } from '../services/dbService';
import { purgeExpiredScans } from '../utils/dataCleanup';

export function AppInitializer() {
  useDatabaseWarmup();

  useEffect(() => {
    void registerBackgroundTask();
    void requestNotificationPermissions();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void purgeExpiredScans();
      }
    });

    void purgeExpiredScans();

    return () => subscription.remove();
  }, []);

  return null;
}
