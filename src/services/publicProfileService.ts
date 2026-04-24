import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export type PublicProfile = {
  companyName: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  published: boolean;
};

const EMPTY_PROFILE: PublicProfile = {
  companyName: '',
  logoUrl: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  published: false
};

export async function getPublicProfile(): Promise<PublicProfile> {
  const user = auth().currentUser;
  if (!user) return EMPTY_PROFILE;
  const doc = await firestore().collection('publicProfiles').doc(user.uid).get();
  if (!doc.exists) return EMPTY_PROFILE;
  const data = doc.data() as Partial<PublicProfile> | undefined;
  return {
    companyName: data?.companyName ?? '',
    logoUrl: data?.logoUrl ?? '',
    address: data?.address ?? '',
    phone: data?.phone ?? '',
    email: data?.email ?? '',
    website: data?.website ?? '',
    published: !!data?.published
  };
}

export async function savePublicProfile(profile: PublicProfile): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('Not signed in');
  const ref = firestore().collection('publicProfiles').doc(user.uid);
  const existing = await ref.get();
  const payload: any = {
    ...profile,
    userId: user.uid,
    updatedAt: firestore.FieldValue.serverTimestamp()
  };
  if (!existing.exists) {
    payload.createdAt = firestore.FieldValue.serverTimestamp();
  }
  await ref.set(payload, { merge: true });
}
