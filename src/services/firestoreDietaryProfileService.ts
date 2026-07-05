import { getFirestore } from './firebaseService';
import type { DietaryProfile } from './dietaryProfile';

// Dietary profile stored under users/{uid}.dietaryProfile (same doc as the
// subscription and history): synced across devices and available server-side for
// future recall matching / targeted notifications. Per-user, market-agnostic.

function userDoc(uid: string) {
  return getFirestore().collection('users').doc(uid);
}

export async function fetchDietaryProfileFromFirestore(
  uid: string
): Promise<DietaryProfile | null> {
  try {
    const snap = await userDoc(uid).get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (!data?.dietaryProfile) return null;
    return data.dietaryProfile as DietaryProfile;
  } catch (error) {
    console.warn('[Firestore] fetchDietaryProfile failed:', error);
    return null;
  }
}

export async function saveDietaryProfileToFirestore(
  uid: string,
  profile: Omit<DietaryProfile, 'updatedAt'>
): Promise<void> {
  try {
    await userDoc(uid).set(
      { dietaryProfile: { ...profile, updatedAt: Date.now() } },
      { merge: true }
    );
  } catch (error) {
    console.warn('[Firestore] saveDietaryProfile failed:', error);
  }
}

export function listenToDietaryProfile(
  uid: string,
  onChange: (profile: DietaryProfile | null) => void
): () => void {
  return userDoc(uid).onSnapshot(
    (snap) => {
      const data = snap?.data();
      onChange((data?.dietaryProfile as DietaryProfile) ?? null);
    },
    (error) => {
      console.warn('[Firestore] dietaryProfile listener error:', error);
    }
  );
}
