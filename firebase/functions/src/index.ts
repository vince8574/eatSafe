import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();

const firestore = admin.firestore();

export const purgeOldScans = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .timeZone('Europe/Paris')
  .onRun(async () => {
    const snapshot = await firestore.collection('scans').get();

    const batch = firestore.batch();
    let deleted = 0;

    snapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      const scannedAt = data.scannedAt ? new Date(data.scannedAt) : null;

      if (scannedAt && monthsBetween(scannedAt, new Date()) >= 6) {
        batch.delete(doc.ref);
        deleted += 1;
      }
    });

    if (deleted > 0) {
      await batch.commit();
    }

    return { deleted };
  });

function monthsBetween(start: Date, end: Date) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

export const notifyRecallMatch = functions
  .region('europe-west1')
  .https.onCall(async ({ productId, recall }: { productId: string; recall: { id: string; title: string } }) => {
    const productRef = firestore.collection('scans').doc(productId);
    const productSnap = await productRef.get();

    if (!productSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Produit introuvable');
    }

    await productRef.update({
      recallStatus: 'recalled',
      recallReference: recall.id,
      lastCheckedAt: Date.now()
    });

    const messaging = admin.messaging();
    await messaging.sendToTopic(`recall-${recall.id}`, {
      notification: {
        title: 'Rappel produit détecté',
        body: `${recall.title} fait l'objet d'un rappel.`
      },
      data: {
        productId,
        recallId: recall.id
      }
    });

    return { success: true };
  });
