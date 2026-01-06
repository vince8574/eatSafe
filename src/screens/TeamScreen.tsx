import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOrganization } from '../hooks/useOrganization';
import { UserRole, OrganizationMember } from '../services/organizationService';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/themeContext';

export default function TeamScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const {
    organization,
    members,
    userRole,
    canManageMembers,
    organizationInvites,
    loading,
    error,
    inviteNewMember,
    removeMemberFromOrg,
    updateRole,
    updateName,
    cancelOrgInvite,
    createNewOrganization,
    refresh
  } = useOrganization();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert(t('error'), t('team.enterEmail'));
      return;
    }

    try {
      setProcessingAction(true);
      await inviteNewMember(inviteEmail.toLowerCase().trim(), inviteRole);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      Alert.alert(t('success'), `${t('team.invitationSent')} ${inviteEmail}`);
    } catch (err) {
      Alert.alert(t('error'), err instanceof Error ? err.message : t('team.invitationFailed'));
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRemoveMember = (member: OrganizationMember) => {
    Alert.alert(
      'Remove member',
      `Are you sure you want to remove ${member.email || member.name || 'this member'}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingAction(true);
              await removeMemberFromOrg(member.userId);
              Alert.alert(t('success'), 'Member removed');
            } catch (err) {
              Alert.alert(t('error'), err instanceof Error ? err.message : 'Failed to remove member');
            } finally {
              setProcessingAction(false);
            }
          }
        }
      ]
    );
  };

  const handleChangeRole = (member: OrganizationMember) => {
    if (member.role === 'owner') {
      Alert.alert(t('error'), 'Cannot change owner role');
      return;
    }

    const roles: UserRole[] = ['member', 'admin'];
    const newRole = member.role === 'admin' ? 'member' : 'admin';

    Alert.alert(
      'Change role',
      `Change ${member.email || member.name} to ${newRole}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              setProcessingAction(true);
              await updateRole(member.userId, newRole);
              Alert.alert(t('success'), `Role updated to ${newRole}`);
            } catch (err) {
              Alert.alert(t('error'), err instanceof Error ? err.message : 'Failed to update role');
            } finally {
              setProcessingAction(false);
            }
          }
        }
      ]
    );
  };

  const handleUpdateName = async () => {
    if (!newOrgName.trim()) {
      Alert.alert(t('error'), 'Please enter a name');
      return;
    }

    try {
      setProcessingAction(true);
      await updateName(newOrgName.trim());
      setShowEditNameModal(false);
      setNewOrgName('');
      Alert.alert(t('success'), 'Organization name updated');
    } catch (err) {
      Alert.alert(t('error'), err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelInvite = (inviteId: string, email: string) => {
    Alert.alert(
      'Cancel invitation',
      `Cancel invitation for ${email}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Cancel invitation',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingAction(true);
              await cancelOrgInvite(inviteId);
              Alert.alert(t('success'), 'Invitation cancelled');
            } catch (err) {
              Alert.alert(t('error'), err instanceof Error ? err.message : 'Failed to cancel invitation');
            } finally {
              setProcessingAction(false);
            }
          }
        }
      ]
    );
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      Alert.alert(t('error'), t('team.enterOrgName'));
      return;
    }

    try {
      setProcessingAction(true);
      await createNewOrganization(newOrgName.trim());
      setShowCreateOrgModal(false);
      setNewOrgName('');
      Alert.alert(t('success'), t('team.orgCreated'));
    } catch (err) {
      Alert.alert(t('error'), err instanceof Error ? err.message : t('team.orgCreationFailed'));
    } finally {
      setProcessingAction(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return '#FF6B6B';
      case 'admin':
        return '#4ECDC4';
      case 'member':
        return '#95A5A6';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'star';
      case 'admin':
        return 'shield-checkmark';
      case 'member':
        return 'person';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
          {t('team.loading')}
        </Text>
      </View>
    );
  }

  if (!organization) {
    return (
      <>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
            {t('team.noOrganization')}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {t('team.createOrWait')}
          </Text>

          <TouchableOpacity
            style={[styles.createOrgButton, { backgroundColor: colors.accent }]}
            onPress={() => setShowCreateOrgModal(true)}
            disabled={processingAction}
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.createOrgButtonText}>{t('team.createOrganization')}</Text>
          </TouchableOpacity>
        </View>

        {/* Create Organization Modal */}
        <Modal
          visible={showCreateOrgModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCreateOrgModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {t('team.createOrganization')}
                </Text>
                <TouchableOpacity onPress={() => setShowCreateOrgModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary }]}
                placeholder={t('team.organizationName')}
                placeholderTextColor={colors.textSecondary}
                value={newOrgName}
                onChangeText={setNewOrgName}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.accent }]}
                onPress={handleCreateOrganization}
                disabled={processingAction}
              >
                {processingAction ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>{t('team.create')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Organization Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerContent}>
          <Ionicons name="business" size={32} color={colors.accent} />
          <View style={styles.headerText}>
            <Text style={[styles.orgName, { color: colors.textPrimary }]}>
              {organization.name}
            </Text>
            <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </Text>
          </View>
          {canManageMembers && (
            <TouchableOpacity
              onPress={() => {
                setNewOrgName(organization.name);
                setShowEditNameModal(true);
              }}
            >
              <Ionicons name="create-outline" size={24} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Invite Button */}
      {canManageMembers && (
        <TouchableOpacity
          style={[styles.inviteButton, { backgroundColor: colors.accent }]}
          onPress={() => setShowInviteModal(true)}
          disabled={processingAction}
        >
          <Ionicons name="person-add" size={20} color="#FFF" />
          <Text style={styles.inviteButtonText}>Invite Member</Text>
        </TouchableOpacity>
      )}

      {/* Pending Invitations */}
      {canManageMembers && organizationInvites.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Pending Invitations
          </Text>
          {organizationInvites.map((invite) => (
            <View
              key={invite.id}
              style={[styles.inviteCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.inviteInfo}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                <View style={styles.inviteDetails}>
                  <Text style={[styles.inviteEmail, { color: colors.textPrimary }]}>
                    {invite.email}
                  </Text>
                  <Text style={[styles.inviteRole, { color: colors.textSecondary }]}>
                    Role: {invite.role}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleCancelInvite(invite.id, invite.email)}
                disabled={processingAction}
              >
                <Ionicons name="close-circle" size={24} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Members List */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Team Members
        </Text>
        {members.map((member) => (
          <View
            key={member.userId}
            style={[styles.memberCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.memberInfo}>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: getRoleBadgeColor(member.role) }
                ]}
              >
                <Ionicons
                  name={getRoleIcon(member.role)}
                  size={16}
                  color="#FFF"
                />
              </View>
              <View style={styles.memberDetails}>
                <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                  {member.name || member.email || 'Unknown'}
                </Text>
                <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>
                  {member.email}
                </Text>
                <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Text>
              </View>
            </View>

            {/* Actions (only for owner) */}
            {userRole === 'owner' && member.role !== 'owner' && (
              <View style={styles.memberActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleChangeRole(member)}
                  disabled={processingAction}
                >
                  <Ionicons name="swap-horizontal" size={20} color={colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleRemoveMember(member)}
                  disabled={processingAction}
                >
                  <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Invite New Member
              </Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary }]}
              placeholder="Email address"
              placeholderTextColor={colors.textSecondary}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.label, { color: colors.textPrimary }]}>Role</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  { backgroundColor: inviteRole === 'member' ? colors.accent : colors.background }
                ]}
                onPress={() => setInviteRole('member')}
              >
                <Text style={[styles.roleButtonText, { color: inviteRole === 'member' ? '#FFF' : colors.text }]}>
                  Member
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  { backgroundColor: inviteRole === 'admin' ? colors.accent : colors.background }
                ]}
                onPress={() => setInviteRole('admin')}
              >
                <Text style={[styles.roleButtonText, { color: inviteRole === 'admin' ? '#FFF' : colors.text }]}>
                  Admin
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.accent }]}
              onPress={handleInvite}
              disabled={processingAction}
            >
              {processingAction ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Send Invitation</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Edit Organization Name
              </Text>
              <TouchableOpacity onPress={() => setShowEditNameModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary }]}
              placeholder="Organization name"
              placeholderTextColor={colors.textSecondary}
              value={newOrgName}
              onChangeText={setNewOrgName}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.accent }]}
              onPress={handleUpdateName}
              disabled={processingAction}
            >
              {processingAction ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Update Name</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerText: {
    flex: 1
  },
  orgName: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  memberCount: {
    fontSize: 14,
    marginTop: 4
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    padding: 14,
    borderRadius: 8
  },
  inviteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  section: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  roleBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  memberDetails: {
    flex: 1
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600'
  },
  memberEmail: {
    fontSize: 14,
    marginTop: 2
  },
  memberRole: {
    fontSize: 12,
    marginTop: 4
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    padding: 8
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8
  },
  inviteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  inviteDetails: {
    flex: 1
  },
  inviteEmail: {
    fontSize: 14,
    fontWeight: '500'
  },
  inviteRole: {
    fontSize: 12,
    marginTop: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  input: {
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600'
  },
  submitButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32
  },
  createOrgButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginHorizontal: 32,
    padding: 14,
    borderRadius: 8
  },
  createOrgButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
