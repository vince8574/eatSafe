import { useState, useEffect } from 'react';
import {
  Organization,
  OrganizationMember,
  Invite,
  UserRole,
  getCurrentOrganization,
  getOrganizationMembers,
  createOrganization,
  inviteMember,
  removeMember,
  updateMemberRole,
  updateOrganizationName,
  getUserRole,
  canManageMembers as checkCanManageMembers,
  getPendingInvites,
  acceptInvite,
  rejectInvite,
  getOrganizationInvites,
  cancelInvite
} from '../services/organizationService';

export interface UseOrganizationReturn {
  organization: Organization | null;
  members: OrganizationMember[];
  userRole: UserRole | null;
  canManageMembers: boolean;
  pendingInvites: Invite[];
  organizationInvites: Invite[];
  loading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  createNewOrganization: (name: string) => Promise<void>;
  inviteNewMember: (email: string, role: UserRole) => Promise<void>;
  removeMemberFromOrg: (userId: string) => Promise<void>;
  updateRole: (userId: string, newRole: UserRole) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  acceptPendingInvite: (inviteId: string) => Promise<void>;
  rejectPendingInvite: (inviteId: string) => Promise<void>;
  cancelOrgInvite: (inviteId: string) => Promise<void>;
}

/**
 * Hook pour gérer l'organisation courante et ses membres
 */
export function useOrganization(): UseOrganizationReturn {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [organizationInvites, setOrganizationInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrganization();
  }, []);

  async function loadOrganization() {
    try {
      setLoading(true);
      setError(null);

      const org = await getCurrentOrganization();
      setOrganization(org);

      if (org) {
        // Charger les membres
        const orgMembers = await getOrganizationMembers(org.id);
        setMembers(orgMembers);

        // Charger le rôle de l'utilisateur
        const role = await getUserRole(org.id);
        setUserRole(role);

        // Vérifier les permissions
        const canManageResult = await checkCanManageMembers(org.id);
        setCanManage(canManageResult);

        // Charger les invitations de l'organisation (si admin/owner)
        if (canManageResult) {
          try {
            const orgInvites = await getOrganizationInvites(org.id);
            setOrganizationInvites(orgInvites);
          } catch (err) {
            console.warn('[useOrganization] Could not load org invites:', err);
          }
        }
      }
    } catch (err) {
      console.error('[useOrganization] Error loading organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  }

  async function createNewOrganization(name: string) {
    try {
      setError(null);
      await createOrganization(name);
      await loadOrganization();
    } catch (err) {
      console.error('[useOrganization] Error creating organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to create organization');
      throw err;
    }
  }

  async function inviteNewMember(email: string, role: UserRole) {
    if (!organization) {
      throw new Error('No organization found');
    }

    try {
      setError(null);
      await inviteMember(organization.id, email, role);
      await loadOrganization(); // Rafraîchir pour obtenir les nouvelles invitations
    } catch (err) {
      console.error('[useOrganization] Error inviting member:', err);
      setError(err instanceof Error ? err.message : 'Failed to invite member');
      throw err;
    }
  }

  async function removeMemberFromOrg(userId: string) {
    if (!organization) {
      throw new Error('No organization found');
    }

    try {
      setError(null);
      await removeMember(organization.id, userId);
      await loadOrganization();
    } catch (err) {
      console.error('[useOrganization] Error removing member:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      throw err;
    }
  }

  async function updateRole(userId: string, newRole: UserRole) {
    if (!organization) {
      throw new Error('No organization found');
    }

    try {
      setError(null);
      await updateMemberRole(organization.id, userId, newRole);
      await loadOrganization();
    } catch (err) {
      console.error('[useOrganization] Error updating role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update role');
      throw err;
    }
  }

  async function updateName(name: string) {
    if (!organization) {
      throw new Error('No organization found');
    }

    try {
      setError(null);
      await updateOrganizationName(organization.id, name);
      await loadOrganization();
    } catch (err) {
      console.error('[useOrganization] Error updating name:', err);
      setError(err instanceof Error ? err.message : 'Failed to update name');
      throw err;
    }
  }

  async function acceptPendingInvite(inviteId: string) {
    try {
      setError(null);
      await acceptInvite(inviteId);
      await loadOrganization(); // Recharger l'organisation après acceptation
    } catch (err) {
      console.error('[useOrganization] Error accepting invite:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
      throw err;
    }
  }

  async function rejectPendingInvite(inviteId: string) {
    try {
      setError(null);
      await rejectInvite(inviteId);
      // Rafraîchir les invitations en attente
      await loadOrganization();
    } catch (err) {
      console.error('[useOrganization] Error rejecting invite:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject invite');
      throw err;
    }
  }

  async function cancelOrgInvite(inviteId: string) {
    try {
      setError(null);
      await cancelInvite(inviteId);
      await loadOrganization(); // Rafraîchir les invitations
    } catch (err) {
      console.error('[useOrganization] Error canceling invite:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel invite');
      throw err;
    }
  }

  return {
    organization,
    members,
    userRole,
    canManageMembers: canManage,
    pendingInvites,
    organizationInvites,
    loading,
    error,
    refresh: loadOrganization,
    createNewOrganization,
    inviteNewMember,
    removeMemberFromOrg,
    updateRole,
    updateName,
    acceptPendingInvite,
    rejectPendingInvite,
    cancelOrgInvite
  };
}

/**
 * Hook simplifié pour vérifier les invitations en attente pour l'email de l'utilisateur
 */
export function usePendingInvites(userEmail: string | null) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userEmail) {
      loadInvites();
    }
  }, [userEmail]);

  async function loadInvites() {
    if (!userEmail) return;

    try {
      setLoading(true);
      const pendingInvites = await getPendingInvites(userEmail);
      setInvites(pendingInvites);
    } catch (err) {
      console.error('[usePendingInvites] Error loading invites:', err);
    } finally {
      setLoading(false);
    }
  }

  return {
    invites,
    loading,
    refresh: loadInvites
  };
}
