# Guide d'intégration Multi-Utilisateurs

## 🎯 Vue d'ensemble

Le système multi-utilisateurs permet à plusieurs utilisateurs de collaborer au sein d'une **organisation**. Tous les membres d'une organisation partagent:
- Le même **abonnement**
- Le même **historique de scans**
- Les mêmes **données de rappels**

## 📁 Fichiers créés

### Services
1. **src/services/organizationService.ts** ✅
   - Gestion des organisations (création, modification)
   - Gestion des membres (invitation, suppression, rôles)
   - Gestion des invitations

2. **src/services/firebaseProductsService.ts** ✅
   - Stockage Firestore des produits scannés (partagés entre membres)
   - Alternative à SQLite local pour le mode organisation

3. **src/services/subscriptionService.ts** ✅ (modifié)
   - Support des abonnements au niveau organisation
   - Fallback sur abonnements utilisateur individuel

### Hooks
4. **src/hooks/useOrganization.ts** ✅
   - Hook React pour gérer l'organisation courante
   - Actions: créer, inviter, supprimer membres, etc.

### Screens
5. **src/screens/TeamScreen.tsx** ✅
   - Interface de gestion d'équipe
   - Liste des membres avec leurs rôles
   - Invitations en attente
   - Actions admin/owner

## 🏗️ Architecture Firestore

```
/organizations
  /{orgId}
    name: string
    ownerId: string
    subscriptionId: string | null
    createdAt: timestamp
    updatedAt: timestamp

/organizationMembers
  /{orgId}
    /members
      /{userId}
        role: 'owner' | 'admin' | 'member'
        email: string
        name?: string
        addedAt: timestamp
        addedBy: userId

/organizationInvites
  /{inviteId}
    orgId: string
    orgName: string
    email: string
    role: 'owner' | 'admin' | 'member'
    invitedBy: userId
    invitedByName?: string
    createdAt: timestamp
    status: 'pending' | 'accepted' | 'rejected'

/subscriptions
  /{scopeId}  // scopeId = orgId OU userId
    planId: string
    status: 'active' | 'expired' | 'none'
    scansRemaining: number
    exportEnabled: boolean
    ...

/scannedProducts
  /{scopeId}  // scopeId = orgId OU userId
    /products
      /{productId}
        brand: string
        lotNumber: string
        scannedAt: timestamp
        recallStatus: 'safe' | 'recalled' | 'unknown'
        scannedBy: userId  // Nouveau champ
        ...
```

## 🔐 Rôles et permissions

### Rôles disponibles
- **Owner** (Propriétaire):
  - 1 seul par organisation
  - Tous les droits
  - Peut changer les rôles et supprimer des membres
  - Ne peut pas se retirer lui-même

- **Admin** (Administrateur):
  - Peut inviter de nouveaux membres
  - Peut modifier le nom de l'organisation
  - Peut voir tous les membres et invitations
  - Ne peut pas supprimer de membres ni changer les rôles

- **Member** (Membre):
  - Peut scanner des produits
  - Peut voir l'historique partagé
  - Peut exporter selon le plan d'abonnement
  - Pas d'accès à la gestion de l'équipe

## ⚙️ Intégration dans l'application

### 1. Ajouter l'écran Team à la navigation

Dans votre fichier de navigation principal (ex: `app/_layout.tsx` ou `src/navigation/index.tsx`):

```tsx
import TeamScreen from '../screens/TeamScreen';

// Dans votre Stack Navigator
<Stack.Screen
  name="Team"
  component={TeamScreen}
  options={{
    title: 'Team Management',
    headerShown: true
  }}
/>
```

### 2. Ajouter un bouton d'accès dans Settings

Dans `src/screens/SettingsScreen.tsx` ou équivalent:

```tsx
import { useOrganization } from '../hooks/useOrganization';

export function SettingsScreen() {
  const { organization, canManageMembers } = useOrganization();
  const navigation = useNavigation();

  return (
    <ScrollView>
      {/* Autres paramètres... */}

      {/* Section Organisation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Organization</Text>

        {organization ? (
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Team')}
          >
            <Ionicons name="people" size={24} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Team Management</Text>
              <Text style={styles.settingValue}>
                {organization.name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleCreateOrganization}
          >
            <Ionicons name="add-circle" size={24} />
            <Text style={styles.settingLabel}>Create Organization</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
```

### 3. Migrer vers Firestore Products (optionnel)

Pour activer le partage de produits entre membres, remplacer SQLite par Firestore:

#### Option A: Migration complète

Dans `src/hooks/useScannedProducts.ts`:

```tsx
// Remplacer l'import
import {
  getAllProducts,
  addProduct as addFirebaseProduct,
  updateProduct as updateFirebaseProduct,
  removeProduct as removeFirebaseProduct
} from '../services/firebaseProductsService';

// Remplacer loadProducts
async function loadProducts() {
  return getAllProducts(); // Au lieu de db.getAll()
}

// Remplacer les mutations
const addMutation = useMutation({
  mutationFn: async (payload: Omit<ScannedProduct, 'id' | 'scannedAt' | 'recallStatus'>) => {
    return addFirebaseProduct(payload);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }
});
```

#### Option B: Mode hybride (recommandé pour transition)

Créer un nouveau hook `useFirebaseProducts.ts` et choisir selon le contexte:

```tsx
import { useOrganization } from './useOrganization';
import { useScannedProducts } from './useScannedProducts';
import { useFirebaseProducts } from './useFirebaseProducts';

export function useProducts() {
  const { organization } = useOrganization();

  // Si organisation: Firestore partagé
  // Sinon: SQLite local
  return organization
    ? useFirebaseProducts()
    : useScannedProducts();
}
```

### 4. Afficher l'indicateur d'organisation

Dans vos écrans de scan (`ScanScreen.tsx`, `ScanLotScreen.tsx`):

```tsx
import { useOrganization } from '../hooks/useOrganization';

export function ScanLotScreen() {
  const { organization } = useOrganization();

  return (
    <View>
      {/* En-tête */}
      {organization && (
        <View style={styles.orgBadge}>
          <Ionicons name="business" size={16} color="#FFF" />
          <Text style={styles.orgName}>{organization.name}</Text>
        </View>
      )}

      {/* Reste du contenu... */}
    </View>
  );
}
```

### 5. Gérer les invitations au login

Dans votre écran de connexion (`AuthScreen.tsx`):

```tsx
import { usePendingInvites } from '../hooks/useOrganization';
import { getCurrentUserEmail } from '../services/authService';

export function AuthScreen() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { invites, loading } = usePendingInvites(userEmail);

  useEffect(() => {
    // Après connexion réussie
    async function checkInvites() {
      const email = await getCurrentUserEmail();
      setUserEmail(email);
    }
    checkInvites();
  }, []);

  // Afficher modal si invitations en attente
  if (invites.length > 0) {
    return <InvitationsModal invites={invites} />;
  }

  // Reste de l'écran de connexion...
}
```

## 🧪 Tests à effectuer

### Test 1: Créer une organisation
1. Se connecter avec un utilisateur
2. Aller dans Settings > Create Organization
3. Entrer un nom d'organisation
4. Vérifier que l'organisation est créée
5. Vérifier que l'utilisateur est owner

### Test 2: Inviter un membre
1. En tant qu'owner/admin, aller dans Team
2. Cliquer "Invite Member"
3. Entrer email d'un autre utilisateur
4. Choisir le rôle (admin ou member)
5. Envoyer l'invitation
6. Vérifier que l'invitation apparaît dans "Pending Invitations"

### Test 3: Accepter une invitation
1. Se connecter avec l'utilisateur invité
2. Vérifier que l'invitation s'affiche
3. Accepter l'invitation
4. Vérifier qu'on fait maintenant partie de l'organisation
5. Vérifier qu'on voit le même abonnement que l'organisation

### Test 4: Partage de scans (si Firestore activé)
1. Utilisateur A scanne un produit
2. Utilisateur B (même organisation) actualise l'historique
3. Vérifier que B voit le scan de A
4. B supprime le produit
5. Vérifier que le produit disparaît aussi pour A

### Test 5: Gestion des rôles
1. Owner change le rôle d'un member en admin
2. Vérifier que le nouveau admin peut inviter des membres
3. Vérifier qu'il ne peut pas supprimer de membres
4. Owner supprime un membre
5. Vérifier que le membre supprimé n'a plus accès

### Test 6: Abonnement partagé
1. Owner souscrit à un plan
2. Vérifier que tous les membres voient le même plan
3. Member A fait 5 scans
4. Vérifier que le compteur diminue pour tous
5. Member B achète un pack de scans
6. Vérifier que le compteur augmente pour tous

## 🔒 Règles de sécurité Firestore

Ajouter ces règles dans Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: vérifier si l'utilisateur est membre d'une organisation
    function isOrgMember(orgId) {
      return request.auth != null &&
        exists(/databases/$(database)/documents/organizationMembers/$(orgId)/members/$(request.auth.uid));
    }

    // Helper: vérifier si l'utilisateur est admin ou owner
    function isOrgAdmin(orgId) {
      return request.auth != null &&
        get(/databases/$(database)/documents/organizationMembers/$(orgId)/members/$(request.auth.uid)).data.role in ['owner', 'admin'];
    }

    // Helper: vérifier si l'utilisateur est owner
    function isOrgOwner(orgId) {
      return request.auth != null &&
        get(/databases/$(database)/documents/organizationMembers/$(orgId)/members/$(request.auth.uid)).data.role == 'owner';
    }

    // Organisations
    match /organizations/{orgId} {
      allow read: if isOrgMember(orgId);
      allow create: if request.auth != null;
      allow update, delete: if isOrgOwner(orgId);
    }

    // Membres d'organisation
    match /organizationMembers/{orgId}/members/{userId} {
      allow read: if isOrgMember(orgId);
      allow create, update: if isOrgAdmin(orgId);
      allow delete: if isOrgOwner(orgId);
    }

    // Invitations
    match /organizationInvites/{inviteId} {
      allow read: if request.auth != null &&
                     (resource.data.email == request.auth.token.email ||
                      isOrgAdmin(resource.data.orgId));
      allow create: if request.auth != null && isOrgAdmin(request.resource.data.orgId);
      allow update: if request.auth != null && resource.data.email == request.auth.token.email;
      allow delete: if request.auth != null && isOrgAdmin(resource.data.orgId);
    }

    // Abonnements
    match /subscriptions/{scopeId} {
      allow read: if request.auth != null &&
                     (request.auth.uid == scopeId || isOrgMember(scopeId));
      allow write: if request.auth != null &&
                      (request.auth.uid == scopeId || isOrgOwner(scopeId));
    }

    // Produits scannés
    match /scannedProducts/{scopeId}/products/{productId} {
      allow read, write: if request.auth != null &&
                            (request.auth.uid == scopeId || isOrgMember(scopeId));
    }
  }
}
```

## 📱 UI/UX Recommandations

### Indicateurs visuels
- Badge "Team" sur les écrans quand en mode organisation
- Avatar/initiales des membres dans l'historique (qui a scanné quoi)
- Notification quand un autre membre scanne un produit

### Onboarding
- Proposer de créer une organisation après le premier scan
- Expliquer les avantages du mode équipe
- Tutorial pour inviter le premier membre

### Gestion des conflits
- Si un utilisateur a des données SQLite locales et rejoint une organisation:
  - Option 1: Proposer de migrer les données vers l'organisation
  - Option 2: Garder les deux séparés (switch entre "Mes scans" et "Scans d'équipe")

## ⚡ Performance

### Optimisations
1. **Cache Firestore**: Utiliser `.get({ source: 'cache' })` quand possible
2. **Pagination**: Limiter les requêtes à 50-100 produits à la fois
3. **Indexes**: Créer des indexes Firestore sur `scannedAt` et `recallStatus`
4. **Real-time sélectif**: N'activer les listeners que sur l'écran actif

### Indexes Firestore requis
```
Collection: scannedProducts/{scopeId}/products
- scannedAt (desc)
- recallStatus (asc), scannedAt (desc)
```

## 🚀 Migration progressive

### Étape 1: Backend (déjà fait ✅)
- ✅ organizationService.ts
- ✅ firebaseProductsService.ts
- ✅ subscriptionService.ts avec support org
- ✅ useOrganization hook
- ✅ TeamScreen

### Étape 2: Navigation et Settings
- [ ] Ajouter TeamScreen à la navigation
- [ ] Ajouter bouton dans Settings
- [ ] Créer écran "Create Organization"

### Étape 3: Migration des données
- [ ] Choisir stratégie (hybride ou complète)
- [ ] Implémenter useProducts qui switch selon contexte
- [ ] Ajouter indicateurs UI (badge organisation)

### Étape 4: Invitations
- [ ] Modal d'invitations au login
- [ ] Notifications push pour nouvelles invitations
- [ ] Email d'invitation (Firebase Functions)

### Étape 5: Tests et déploiement
- [ ] Tests complets multi-utilisateurs
- [ ] Règles de sécurité Firestore
- [ ] Documentation utilisateur

## 📚 Ressources

- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [React Query](https://tanstack.com/query/latest/docs/framework/react/overview)

## 🆘 Troubleshooting

### Les membres ne voient pas les scans de l'équipe
- Vérifier que Firestore Products est activé
- Vérifier les règles de sécurité Firestore
- Vérifier que `getCurrentOrganization()` retourne bien l'org

### Les scans restent locaux (SQLite)
- Vérifier que vous utilisez `firebaseProductsService` au lieu de `dbService`
- Vérifier que l'utilisateur fait bien partie d'une organisation

### Permission denied sur Firestore
- Vérifier les règles de sécurité
- Vérifier que l'utilisateur est bien authentifié
- Vérifier que l'utilisateur est membre de l'organisation

### L'abonnement n'est pas partagé
- Vérifier que `getSubscriptionScopeId()` retourne l'orgId
- Vérifier que l'organisation a un subscriptionId
- Redémarrer l'app pour forcer le refresh
