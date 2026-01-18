import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { getFirestore } from './firebaseService';
import { getCurrentUser } from './authService';

async function deleteSubcollectionDocs(path: FirebaseFirestoreTypes.CollectionReference): Promise<void> {
  const snapshot = await path.get();
  if (snapshot.empty) return;

  const batch = getFirestore().batch();
  snapshot.docs.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => batch.delete(doc.ref));
  await batch.commit();
}

async function deleteUserScopedProducts(userId: string): Promise<void> {
  const db = getFirestore();
  const productsRef = db.collection('scannedProducts').doc(userId).collection('products');
  await deleteSubcollectionDocs(productsRef);
  // Optionnel : supprimer le conteneur si vide (ignorer les erreurs NotFound)
  await db.collection('scannedProducts').doc(userId).delete().catch(() => undefined);
}

async function deleteUserSubscription(userId: string): Promise<void> {
  const db = getFirestore();
  await db.collection('subscriptions').doc(userId).delete().catch(() => undefined);
}

async function removeOrganizationMemberships(userId: string, userEmail?: string | null): Promise<void> {
  const db = getFirestore();

  // Supprimer les memberships
  const membershipSnap = await firestore()
    .collectionGroup('members')
    .where(firestore.FieldPath.documentId(), '==', userId)
    .get();

  if (!membershipSnap.empty) {
    const batch = db.batch();
    membershipSnap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  // Supprimer les invitations par email
  if (userEmail) {
    const invitesSnap = await db
      .collection('organizationInvites')
      .where('email', '==', userEmail.toLowerCase())
      .get();

    if (!invitesSnap.empty) {
      const batch = db.batch();
      invitesSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  }
}

export async function deleteCurrentUserAccount(): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('No authenticated user');
  }

  const userId = user.uid;
  const userEmail = user.email;

  // 1) Supprimer les donnÇ¸es applicatives (produits, abonnements, memberships)
  await deleteUserScopedProducts(userId);
  await deleteUserSubscription(userId);
  await removeOrganizationMemberships(userId, userEmail);

  // 2) Purger les caches locaux
  await AsyncStorage.clear().catch(() => undefined);

  // 3) Supprimer le compte auth (peut demander une rÇ¸auth Firebase si session ancienne)
  try {
    await auth().currentUser?.delete();
  } catch (error) {
    console.error('[AccountDeletion] Firebase user deletion failed:', error);
    throw error;
  }
}
