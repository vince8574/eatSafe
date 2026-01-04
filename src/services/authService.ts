import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { ensureFirebase } from './firebaseService';

/**
 * Retourne l'utilisateur Firebase courant ou réalise un sign-in anonyme pour garantir un uid.
 * À remplacer plus tard par un vrai flux de connexion (email/Google) si nécessaire.
 */
export async function ensureAuthUser(): Promise<FirebaseAuthTypes.User> {
  ensureFirebase();
  const current = auth().currentUser;
  if (current) return current;

  // Fallback : connexion anonyme pour disposer d'un uid unique
  const credential = await auth().signInAnonymously();
  return credential.user;
}

export async function getCurrentUserId(): Promise<string> {
  const user = await ensureAuthUser();
  return user.uid;
}
