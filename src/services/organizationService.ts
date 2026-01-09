import { getFirestore } from './firebaseService';
import { getCurrentUserId } from './authService';
import firestore from '@react-native-firebase/firestore';

const ORGS_COLLECTION = 'organizations';
const MEMBERS_COLLECTION = 'organizationMembers';
const INVITES_COLLECTION = 'organizationInvites';

export type UserRole = 'owner' | 'admin' | 'member';

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  subscriptionId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface OrganizationMember {
  userId: string;
  role: UserRole;
  email: string;
  name?: string;
  addedAt: number;
  addedBy: string;
}

export interface Invite {
  id: string;
  orgId: string;
  orgName: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  invitedByName?: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'rejected';
}

/**
 * Créer une organisation
 */
export async function createOrganization(name: string): Promise<Organization> {
  const db = getFirestore();
  const userId = await getCurrentUserId();

  const org: Omit<Organization, 'id'> = {
    name,
    ownerId: userId,
    subscriptionId: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
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
      email: '', // Sera mis à jour avec le profil utilisateur
      addedAt: Date.now(),
      addedBy: userId
    });

  console.log(`[organizationService] Created organization ${docRef.id}: ${name}`);

  return { ...org, id: docRef.id };
}

/**
 * Récupérer l'organisation courante de l'utilisateur
 */
export async function getCurrentOrganization(): Promise<Organization | null> {
  try {
    const db = getFirestore();
    const userId = await getCurrentUserId();

    // Chercher dans toutes les organisations où l'utilisateur est membre
    const membershipQuery = await db
      .collectionGroup('members')
      .where(firestore.FieldPath.documentId(), '==', userId)
      .limit(1)
      .get();

    if (membershipQuery.empty) {
      console.log('[organizationService] User is not member of any organization');
      return null;
    }

    const orgId = membershipQuery.docs[0].ref.parent.parent?.id;
    if (!orgId) return null;

    const orgDoc = await db.collection(ORGS_COLLECTION).doc(orgId).get();

    if (!orgDoc.exists) return null;

    const data = orgDoc.data();
    return {
      id: orgDoc.id,
      ...data
    } as Organization;
  } catch (error) {
    // Ne pas supposer que "error" a une propriété code/message
    const hasCode = error && typeof error === 'object' && 'code' in (error as any);
    const hasMessage = error && typeof error === 'object' && 'message' in (error as any);
    const code = hasCode ? (error as any).code : 'UNKNOWN';
    const message = hasMessage ? (error as any).message : String(error);
    console.error(
      `[organizationService] Error getting current organization (${code}):`,
      message
    );
    return null;
  }
}

/**
 * Récupérer les membres d'une organisation
 */
export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
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

/**
 * Vérifier les permissions de l'utilisateur courant
 */
export async function getUserRole(orgId: string): Promise<UserRole | null> {
  const db = getFirestore();
  const userId = await getCurrentUserId();

  const memberDoc = await db
    .collection(MEMBERS_COLLECTION)
    .doc(orgId)
    .collection('members')
    .doc(userId)
    .get();

  if (!memberDoc.exists) return null;

  return memberDoc.data()?.role || null;
}

/**
 * Vérifier si l'utilisateur est admin ou owner
 */
export async function canManageMembers(orgId: string): Promise<boolean> {
  const role = await getUserRole(orgId);
  return role === 'owner' || role === 'admin';
}

/**
 * Inviter un membre par email
 */
export async function inviteMember(
  orgId: string,
  email: string,
  role: UserRole
): Promise<Invite> {
  const db = getFirestore();
  const currentUserId = await getCurrentUserId();

  // Vérifier les permissions
  const canManage = await canManageMembers(orgId);
  if (!canManage) {
    throw new Error('Permission denied: Only owners and admins can invite members');
  }

  // Récupérer le nom de l'organisation
  const orgDoc = await db.collection(ORGS_COLLECTION).doc(orgId).get();
  if (!orgDoc.exists) {
    throw new Error('Organization not found');
  }

  const orgName = orgDoc.data()?.name || 'Unknown Organization';

  // Créer l'invitation
  const invite: Omit<Invite, 'id'> = {
    orgId,
    orgName,
    email: email.toLowerCase().trim(),
    role,
    invitedBy: currentUserId,
    createdAt: Date.now(),
    status: 'pending'
  };

  const inviteRef = await db.collection(INVITES_COLLECTION).add(invite);

  console.log(`[organizationService] Created invite ${inviteRef.id} for ${email}`);

  // TODO: Envoyer un email d'invitation (Firebase Functions + SendGrid/Mailgun)

  return { ...invite, id: inviteRef.id };
}

/**
 * Récupérer les invitations en attente pour un email
 */
export async function getPendingInvites(email: string): Promise<Invite[]> {
  const db = getFirestore();

  const invitesSnapshot = await db
    .collection(INVITES_COLLECTION)
    .where('email', '==', email.toLowerCase().trim())
    .where('status', '==', 'pending')
    .get();

  return invitesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Invite[];
}

/**
 * Accepter une invitation
 */
export async function acceptInvite(inviteId: string): Promise<void> {
  const db = getFirestore();
  const userId = await getCurrentUserId();

  // Récupérer l'invitation
  const inviteDoc = await db.collection(INVITES_COLLECTION).doc(inviteId).get();
  if (!inviteDoc.exists) {
    throw new Error('Invitation not found');
  }

  const invite = inviteDoc.data() as Invite;

  // Vérifier que l'utilisateur n'est pas déjà membre
  const existingMember = await db
    .collection(MEMBERS_COLLECTION)
    .doc(invite.orgId)
    .collection('members')
    .doc(userId)
    .get();

  if (existingMember.exists) {
    throw new Error('You are already a member of this organization');
  }

  // Ajouter comme membre
  await db
    .collection(MEMBERS_COLLECTION)
    .doc(invite.orgId)
    .collection('members')
    .doc(userId)
    .set({
      role: invite.role,
      email: invite.email,
      addedAt: Date.now(),
      addedBy: invite.invitedBy
    });

  // Marquer l'invitation comme acceptée
  await db.collection(INVITES_COLLECTION).doc(inviteId).update({
    status: 'accepted'
  });

  console.log(`[organizationService] User ${userId} accepted invite ${inviteId}`);
}

/**
 * Rejeter une invitation
 */
export async function rejectInvite(inviteId: string): Promise<void> {
  const db = getFirestore();

  await db.collection(INVITES_COLLECTION).doc(inviteId).update({
    status: 'rejected'
  });

  console.log(`[organizationService] Invite ${inviteId} rejected`);
}

/**
 * Supprimer un membre
 */
export async function removeMember(orgId: string, userId: string): Promise<void> {
  const db = getFirestore();
  const currentUserId = await getCurrentUserId();

  // Vérifier que l'utilisateur courant est owner
  const currentRole = await getUserRole(orgId);
  if (currentRole !== 'owner') {
    throw new Error('Permission denied: Only the owner can remove members');
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

  console.log(`[organizationService] Removed member ${userId} from org ${orgId}`);
}

/**
 * Mettre à jour le rôle d'un membre
 */
export async function updateMemberRole(
  orgId: string,
  userId: string,
  newRole: UserRole
): Promise<void> {
  const db = getFirestore();
  const currentUserId = await getCurrentUserId();

  // Vérifier que l'utilisateur courant est owner
  const currentRole = await getUserRole(orgId);
  if (currentRole !== 'owner') {
    throw new Error('Permission denied: Only the owner can change member roles');
  }

  // Ne pas permettre de changer le rôle du owner
  const targetMember = await db
    .collection(MEMBERS_COLLECTION)
    .doc(orgId)
    .collection('members')
    .doc(userId)
    .get();

  if (targetMember.data()?.role === 'owner') {
    throw new Error('Cannot change the role of the organization owner');
  }

  await db
    .collection(MEMBERS_COLLECTION)
    .doc(orgId)
    .collection('members')
    .doc(userId)
    .update({ role: newRole });

  console.log(`[organizationService] Updated member ${userId} role to ${newRole}`);
}

/**
 * Mettre à jour le nom de l'organisation
 */
export async function updateOrganizationName(orgId: string, name: string): Promise<void> {
  const db = getFirestore();

  // Vérifier que l'utilisateur courant est owner ou admin
  const canManage = await canManageMembers(orgId);
  if (!canManage) {
    throw new Error('Permission denied');
  }

  await db.collection(ORGS_COLLECTION).doc(orgId).update({
    name,
    updatedAt: Date.now()
  });

  console.log(`[organizationService] Updated organization ${orgId} name to ${name}`);
}

/**
 * Récupérer les invitations en attente pour une organisation
 */
export async function getOrganizationInvites(orgId: string): Promise<Invite[]> {
  const db = getFirestore();

  // Vérifier les permissions
  const canManage = await canManageMembers(orgId);
  if (!canManage) {
    throw new Error('Permission denied');
  }

  const invitesSnapshot = await db
    .collection(INVITES_COLLECTION)
    .where('orgId', '==', orgId)
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .get();

  return invitesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Invite[];
}

/**
 * Annuler une invitation
 */
export async function cancelInvite(inviteId: string): Promise<void> {
  const db = getFirestore();

  const inviteDoc = await db.collection(INVITES_COLLECTION).doc(inviteId).get();
  if (!inviteDoc.exists) {
    throw new Error('Invitation not found');
  }

  const invite = inviteDoc.data() as Invite;

  // Vérifier les permissions
  const canManage = await canManageMembers(invite.orgId);
  if (!canManage) {
    throw new Error('Permission denied');
  }

  await db.collection(INVITES_COLLECTION).doc(inviteId).delete();

  console.log(`[organizationService] Cancelled invite ${inviteId}`);
}
