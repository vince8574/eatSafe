# Configuration Firebase Authentication

## ✅ État actuel

Firebase Authentication est **déjà configuré** dans le projet avec les fichiers suivants:
- `src/services/authService.ts` - Service d'authentification
- `src/services/firebaseService.ts` - Configuration Firebase
- `google-services.json` (Android) - Déjà présent

## 🔐 Méthodes d'authentification disponibles

### 1. Email/Password (déjà configuré)
Le code existe déjà dans `authService.ts`:

```typescript
// Inscription
export async function signUp(email: string, password: string): Promise<void>

// Connexion
export async function signIn(email: string, password: string): Promise<void>

// Déconnexion
export async function signOut(): Promise<void>

// Récupérer l'utilisateur courant
export async function getCurrentUserId(): Promise<string>
```

### 2. Google Sign-In
Pour activer Google Sign-In, suivre ces étapes:

#### Installation
```bash
npm install @react-native-google-signin/google-signin
npx expo install expo-auth-session expo-crypto
```

#### Configuration Firebase Console
1. Aller sur https://console.firebase.google.com
2. Sélectionner votre projet
3. Authentication > Sign-in method
4. Activer "Google"
5. Télécharger le nouveau `google-services.json` avec Google Auth activé

#### Code à ajouter dans authService.ts
```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';

// Initialiser Google Sign-In
GoogleSignin.configure({
  webClientId: 'VOTRE_WEB_CLIENT_ID.apps.googleusercontent.com',
});

// Connexion avec Google
export async function signInWithGoogle(): Promise<void> {
  try {
    // Récupérer l'ID token Google
    await GoogleSignin.hasPlayServices();
    const { idToken } = await GoogleSignin.signIn();

    // Créer credential Firebase
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);

    // Se connecter avec le credential
    await auth().signInWithCredential(googleCredential);
    console.log('✓ Signed in with Google!');
  } catch (error) {
    console.error('Google Sign-In error:', error);
    throw error;
  }
}
```

#### Écran de connexion
Créer `src/screens/AuthScreen.tsx`:
```typescript
import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { signIn, signUp, signInWithGoogle } from '../services/authService';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleEmailAuth = async () => {
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity onPress={handleEmailAuth}>
        <Text>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleGoogleSignIn}>
        <Text>Sign in with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text>{isSignUp ? 'Already have an account?' : 'Create account'}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 👥 Gestion Multi-Utilisateurs

### Architecture recommandée

#### 1. Structure Firestore

```
users/
  {userId}/
    profile: { email, name, role }

organizations/
  {orgId}/
    name: string
    ownerId: string
    subscriptionId: string
    createdAt: timestamp

organizationMembers/
  {orgId}/
    members/
      {userId}/
        role: 'owner' | 'admin' | 'member'
        addedAt: timestamp
        addedBy: userId

scannedProducts/
  {orgId}/
    products/
      {productId}/
        ...
```

#### 2. Service multi-utilisateurs

Créer `src/services/organizationService.ts`:

```typescript
import { getFirestore } from './firebaseService';
import { getCurrentUserId } from './authService';

const ORGS_COLLECTION = 'organizations';
const MEMBERS_COLLECTION = 'organizationMembers';

export type UserRole = 'owner' | 'admin' | 'member';

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  subscriptionId: string | null;
  createdAt: number;
}

export interface OrganizationMember {
  userId: string;
  role: UserRole;
  email: string;
  addedAt: number;
  addedBy: string;
}

// Créer une organisation
export async function createOrganization(name: string): Promise<Organization> {
  const db = getFirestore();
  const userId = await getCurrentUserId();

  const org: Omit<Organization, 'id'> = {
    name,
    ownerId: userId,
    subscriptionId: null,
    createdAt: Date.now()
  };

  const docRef = await db.collection(ORGS_COLLECTION).add(org);

  // Ajouter le créateur comme owner
  await db
    .collection(MEMBERS_COLLECTION)
    .doc(docRef.id)
    .collection('members')
    .doc(userId)
    .set({
      role: 'owner',
      addedAt: Date.now(),
      addedBy: userId
    });

  return { ...org, id: docRef.id };
}

// Inviter un membre
export async function inviteMember(
  orgId: string,
  email: string,
  role: UserRole
): Promise<void> {
  const db = getFirestore();
  const currentUserId = await getCurrentUserId();

  // Vérifier les permissions (seul owner et admin peuvent inviter)
  const currentMember = await db
    .collection(MEMBERS_COLLECTION)
    .doc(orgId)
    .collection('members')
    .doc(currentUserId)
    .get();

  if (!currentMember.exists ||
      !['owner', 'admin'].includes(currentMember.data()?.role)) {
    throw new Error('Permission denied');
  }

  // TODO: Créer l'invitation (système d'email ou code d'invitation)
  // Pour l'instant, si l'utilisateur existe, l'ajouter directement

  const usersQuery = await db
    .collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (usersQuery.empty) {
    throw new Error('User not found');
  }

  const invitedUserId = usersQuery.docs[0].id;

  await db
    .collection(MEMBERS_COLLECTION)
    .doc(orgId)
    .collection('members')
    .doc(invitedUserId)
    .set({
      role,
      email,
      addedAt: Date.now(),
      addedBy: currentUserId
    });
}

// Récupérer les membres d'une organisation
export async function getOrganizationMembers(
  orgId: string
): Promise<OrganizationMember[]> {
  const db = getFirestore();

  const membersSnapshot = await db
    .collection(MEMBERS_COLLECTION)
    .doc(orgId)
    .collection('members')
    .get();

  return membersSnapshot.docs.map(doc => ({
    userId: doc.id,
    ...doc.data()
  })) as OrganizationMember[];
}

// Supprimer un membre
export async function removeMember(
  orgId: string,
  userId: string
): Promise<void> {
  const db = getFirestore();
  const currentUserId = await getCurrentUserId();

  // Vérifier les permissions
  const currentMember = await db
    .collection(MEMBERS_COLLECTION)
    .doc(orgId)
    .collection('members')
    .doc(currentUserId)
    .get();

  if (!currentMember.exists ||
      currentMember.data()?.role !== 'owner') {
    throw new Error('Only organization owner can remove members');
  }

  // Ne pas permettre au owner de se retirer
  if (userId === currentUserId) {
    throw new Error('Owner cannot remove themselves');
  }

  await db
    .collection(MEMBERS_COLLECTION)
    .doc(orgId)
    .collection('members')
    .doc(userId)
    .delete();
}

// Récupérer l'organisation courante de l'utilisateur
export async function getCurrentOrganization(): Promise<Organization | null> {
  const db = getFirestore();
  const userId = await getCurrentUserId();

  // Chercher l'organisation où l'utilisateur est membre
  const membershipQuery = await db
    .collectionGroup('members')
    .where(firestore.FieldPath.documentId(), '==', userId)
    .limit(1)
    .get();

  if (membershipQuery.empty) {
    return null;
  }

  const orgId = membershipQuery.docs[0].ref.parent.parent?.id;
  if (!orgId) return null;

  const orgDoc = await db.collection(ORGS_COLLECTION).doc(orgId).get();

  if (!orgDoc.exists) return null;

  return {
    id: orgDoc.id,
    ...orgDoc.data()
  } as Organization;
}
```

#### 3. Hook React pour multi-utilisateurs

Créer `src/hooks/useOrganization.ts`:

```typescript
import { useState, useEffect } from 'react';
import {
  Organization,
  OrganizationMember,
  getCurrentOrganization,
  getOrganizationMembers
} from '../services/organizationService';

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganization();
  }, []);

  async function loadOrganization() {
    try {
      const org = await getCurrentOrganization();
      setOrganization(org);

      if (org) {
        const orgMembers = await getOrganizationMembers(org.id);
        setMembers(orgMembers);
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  }

  return {
    organization,
    members,
    loading,
    refresh: loadOrganization
  };
}
```

---

## 🔒 Règles de sécurité Firestore

Mettre à jour les règles dans Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Règles pour les utilisateurs
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Règles pour les organisations
    match /organizations/{orgId} {
      allow read: if isOrgMember(orgId);
      allow create: if request.auth != null;
      allow update, delete: if isOrgOwner(orgId);
    }

    // Règles pour les membres
    match /organizationMembers/{orgId}/members/{userId} {
      allow read: if isOrgMember(orgId);
      allow create, update: if isOrgAdmin(orgId);
      allow delete: if isOrgOwner(orgId);
    }

    // Règles pour les produits scannés
    match /scannedProducts/{orgId}/products/{productId} {
      allow read, write: if isOrgMember(orgId);
    }

    // Règles pour les abonnements
    match /subscriptions/{userId} {
      allow read, write: if request.auth != null &&
                           (request.auth.uid == userId || isOrgOwner(getOrgBySubscription(userId)));
    }

    // Fonctions helper
    function isOrgMember(orgId) {
      return request.auth != null &&
             exists(/databases/$(database)/documents/organizationMembers/$(orgId)/members/$(request.auth.uid));
    }

    function isOrgAdmin(orgId) {
      return request.auth != null &&
             get(/databases/$(database)/documents/organizationMembers/$(orgId)/members/$(request.auth.uid)).data.role in ['owner', 'admin'];
    }

    function isOrgOwner(orgId) {
      return request.auth != null &&
             get(/databases/$(database)/documents/organizationMembers/$(orgId)/members/$(request.auth.uid)).data.role == 'owner';
    }
  }
}
```

---

## ✅ Checklist d'implémentation

### Firebase Auth
- [x] Email/Password configuré dans authService
- [ ] Écran de connexion/inscription créé
- [ ] Google Sign-In SDK installé
- [ ] Google Sign-In configuré dans Firebase Console
- [ ] Fonction signInWithGoogle implémentée
- [ ] Tests de connexion effectués

### Multi-utilisateurs
- [ ] Structure Firestore définie
- [ ] organizationService créé
- [ ] useOrganization hook créé
- [ ] Écran de gestion d'équipe créé
- [ ] Système d'invitation implémenté
- [ ] Règles de sécurité Firestore configurées
- [ ] Tests multi-utilisateurs effectués

---

## 🧪 Tests à effectuer

1. **Authentification**:
   - Inscription avec email/password
   - Connexion avec email/password
   - Connexion avec Google
   - Déconnexion
   - Gestion des erreurs (mauvais mot de passe, etc.)

2. **Multi-utilisateurs**:
   - Créer une organisation
   - Inviter un membre
   - Accepter une invitation
   - Vérifier les permissions (lecture/écriture)
   - Supprimer un membre
   - Tester avec plusieurs utilisateurs simultanément

---

## 📚 Ressources

- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [React Native Firebase Auth](https://rnfirebase.io/auth/usage)
- [Google Sign-In](https://github.com/react-native-google-signin/google-signin)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
