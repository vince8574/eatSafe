import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { ensureFirebase } from './firebaseService';

/**
 * Retourne l'utilisateur Firebase courant.
 * Lance une erreur si l'utilisateur n'est pas authentifié.
 */
export async function ensureAuthUser(): Promise<FirebaseAuthTypes.User> {
  ensureFirebase();
  const current = auth().currentUser;

  if (!current) {
    throw new Error('User not authenticated');
  }

  // Ne pas autoriser les utilisateurs anonymes
  if (current.isAnonymous) {
    await auth().signOut();
    throw new Error('Anonymous users not allowed');
  }

  return current;
}

export async function getCurrentUserId(): Promise<string> {
  const user = await ensureAuthUser();
  return user.uid;
}

export function getCurrentUser(): FirebaseAuthTypes.User | null {
  ensureFirebase();
  return auth().currentUser;
}

export function isUserAuthenticated(): boolean {
  const user = getCurrentUser();
  return user !== null && !user.isAnonymous;
}
