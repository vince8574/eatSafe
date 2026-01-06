import firebaseApp from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';

/**
 * Firebase is automatically initialized from google-services.json (Android)
 * and GoogleService-Info.plist (iOS) via @react-native-firebase/app.
 *
 * No manual initialization is needed. This service just provides
 * a convenient interface to access Firebase services.
 */

export function ensureFirebase() {
  try {
    // Uses native config from google-services.json / GoogleService-Info.plist
    return firebaseApp.app();
  } catch (error) {
    console.warn('[Firebase] No Firebase app initialized. Make sure google-services.json / GoogleService-Info.plist exist and match the package/bundle id.');
    console.warn('[Firebase] Firebase features (subscriptions, auth) will not work until properly configured.');
    throw error;
  }
}

export function getFirestore() {
  const app = ensureFirebase();
  try {
    return firestore(app);
  } catch (error) {
    console.error('[Firebase] Failed to get Firestore instance:', error);
    throw new Error('Firebase is not properly configured. Please add google-services.json to android/app/ directory.');
  }
}
