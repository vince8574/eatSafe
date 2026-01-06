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
  // Check if Firebase is already initialized
  if (!firebaseApp.apps || firebaseApp.apps.length === 0) {
    console.warn('[Firebase] No Firebase app initialized. Make sure google-services.json exists.');
    console.warn('[Firebase] Firebase features (subscriptions, auth) will not work until properly configured.');
  }
}

export function getFirestore() {
  ensureFirebase();
  try {
    return firestore();
  } catch (error) {
    console.error('[Firebase] Failed to get Firestore instance:', error);
    throw new Error('Firebase is not properly configured. Please add google-services.json to android/app/ directory.');
  }
}
