import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export async function saveCompanyReferral(companyName: string, contactName: string) {
  const user = auth().currentUser;

  await firestore().collection('companyReferrals').add({
    companyName,
    contactName,
    email: user?.email || null,
    userId: user?.uid || null,
    wantsReferral: true,
    createdAt: firestore.FieldValue.serverTimestamp(),
    status: 'pending'
  });
}

export async function updateCompanyReferral(wantsReferral: boolean, companyName?: string) {
  const user = auth().currentUser;
  if (!user) return;

  const snapshot = await firestore()
    .collection('companyReferrals')
    .where('userId', '==', user.uid)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    await doc.ref.update({
      wantsReferral,
      ...(companyName !== undefined && { companyName }),
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
  } else if (wantsReferral && companyName) {
    await saveCompanyReferral(companyName, user.displayName || '');
  }
}
