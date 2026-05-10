import appCheck from '@react-native-firebase/app-check';

let initialized = false;
let initializationFailed = false;

/**
 * Initialises Firebase App Check. Called once at app startup from
 * AppInitializer. Failures are logged but never thrown — App Check is a
 * defence-in-depth layer, not a hard dependency. If init fails, callers of
 * getAppCheckToken() just receive null and requests go out unauthenticated.
 *
 * Provider selection:
 *   - dev   → debug provider (token must be allow-listed in Firebase Console
 *             once during local development, see CLAUDE_OCR_DEPLOYMENT.md)
 *   - prod  → Play Integrity (Android) / AppAttest with DeviceCheck fallback (iOS)
 */
export async function initializeAppCheck(): Promise<void> {
  if (initialized || initializationFailed) return;

  try {
    const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity'
      },
      apple: {
        provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback'
      }
    });

    await appCheck().initializeAppCheck({
      provider,
      isTokenAutoRefreshEnabled: true
    });

    initialized = true;
    console.log('[AppCheck] initialized', __DEV__ ? '(debug provider)' : '(prod provider)');
  } catch (error) {
    initializationFailed = true;
    const message = error instanceof Error ? error.message : 'unknown';
    console.warn('[AppCheck] init failed, requests will be unauthenticated:', message);
  }
}

/**
 * Returns a fresh App Check token, or null when the SDK is not initialised or
 * the token fetch fails. Callers should attach the returned token to outgoing
 * requests via the `X-Firebase-AppCheck` header when present.
 */
export async function getAppCheckToken(): Promise<string | null> {
  if (!initialized) return null;
  try {
    const result = await appCheck().getToken();
    return result?.token ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.warn('[AppCheck] getToken failed:', message);
    return null;
  }
}
