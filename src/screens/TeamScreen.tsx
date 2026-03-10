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
import * as Haptics from 'expo-haptics';
import { useOrganization } from '../hooks/useOrganization';
import { UserRole, OrganizationMember } from '../services/organizationService';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/themeContext';
import { GradientBackground } from '../components/GradientBackground';

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
      t('team.removeMember'),
      `${t('team.confirmRemove')} ${member.email || member.name || ''}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('team.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingAction(true);
              await removeMemberFromOrg(member.userId);
              Alert.alert(t('success'), t('team.memberRemoved'));
            } catch (err) {
              Alert.alert(t('error'), err instanceof Error ? err.message : t('team.removeFailed'));
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
      Alert.alert(t('error'), t('team.cannotChangeOwner'));
      return;
    }

    const newRole = member.role === 'admin' ? 'member' : 'admin';

    Alert.alert(
      t('team.changeRole'),
      `${t('team.changeRoleTo')} ${member.email || member.name} → ${newRole}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('team.change'),
          onPress: async () => {
            try {
              setProcessingAction(true);
              await updateRole(member.userId, newRole);
              Alert.alert(t('success'), `${t('team.roleUpdated')} ${newRole}`);
            } catch (err) {
              Alert.alert(t('error'), err instanceof Error ? err.message : t('team.roleUpdateFailed'));
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
      Alert.alert(t('error'), t('team.enterOrgName'));
      return;
    }

    try {
      setProcessingAction(true);
      await updateName(newOrgName.trim());
      setShowEditNameModal(false);
      setNewOrgName('');
      Alert.alert(t('success'), t('team.nameUpdated'));
    } catch (err) {
      Alert.alert(t('error'), err instanceof Error ? err.message : t('team.nameUpdateFailed'));
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelInvite = (inviteId: string, email: string) => {
    Alert.alert(
      t('team.cancelInvitation'),
      `${t('team.confirmCancelInvite')} ${email}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('team.cancelInvite'),
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingAction(true);
              await cancelOrgInvite(inviteId);
              Alert.alert(t('success'), t('team.inviteCancelled'));
            } catch (err) {
              Alert.alert(t('error'), err instanceof Error ? err.message : t('team.cancelInviteFailed'));
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

  const getRoleIcon = (role: UserRole): any => {
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
      <GradientBackground>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
            {t('team.loading')}
          </Text>
        </View>
      </GradientBackground>
    );
  }

  if (!organization) {
    return (
      <>
        <GradientBackground>
          <View style={styles.centeredContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="people-outline" size={64} color={colors.accent} />
            </View>
            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
              {t('team.noOrganization')}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {t('team.createOrWait')}
            </Text>

            <TouchableOpacity
              style={[styles.createOrgButton, { backgroundColor: colors.accent }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowCreateOrgModal(true);
              }}
              disabled={processingAction}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.createOrgButtonText}>{t('team.createOrganization')}</Text>
            </TouchableOpacity>
          </View>
        </GradientBackground>

        <Modal
          visible={showCreateOrgModal}
          transparent
          animationType="fade"
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
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.accent }]}
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
    <GradientBackground>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Organization Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.headerContent}>
            <View style={[styles.orgIconContainer, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="business" size={28} color={colors.accent} />
            </View>
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
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowInviteModal(true);
            }}
            disabled={processingAction}
          >
            <Ionicons name="person-add" size={20} color="#FFF" />
            <Text style={styles.inviteButtonText}>{t('team.inviteMember')}</Text>
          </TouchableOpacity>
        )}

        {/* Pending Invitations */}
        {canManageMembers && organizationInvites.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('team.pendingInvitations')}
            </Text>
            {organizationInvites.map((invite) => (
              <View
                key={invite.id}
                style={[styles.inviteCard, { backgroundColor: colors.surface }]}
              >
                <View style={styles.inviteInfo}>
                  <View style={[styles.inviteIconContainer, { backgroundColor: colors.accent + '20' }]}>
                    <Ionicons name="mail-outline" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.inviteDetails}>
                    <Text style={[styles.inviteEmail, { color: colors.textPrimary }]}>
                      {invite.email}
                    </Text>
                    <Text style={[styles.inviteRole, { color: colors.textSecondary }]}>
                      {invite.role}
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
            {t('team.teamMembers')}
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
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('team.inviteNewMember')}
              </Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.accent }]}
              placeholder={t('team.emailPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('team.role')}</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  { backgroundColor: inviteRole === 'member' ? colors.accent : colors.surfaceAlt }
                ]}
                onPress={() => setInviteRole('member')}
              >
                <Text style={[styles.roleButtonText, { color: inviteRole === 'member' ? '#FFF' : colors.textPrimary }]}>
                  Member
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  { backgroundColor: inviteRole === 'admin' ? colors.accent : colors.surfaceAlt }
                ]}
                onPress={() => setInviteRole('admin')}
              >
                <Text style={[styles.roleButtonText, { color: inviteRole === 'admin' ? '#FFF' : colors.textPrimary }]}>
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
                <Text style={styles.submitButtonText}>{t('team.sendInvitation')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('team.editOrgName')}
              </Text>
              <TouchableOpacity onPress={() => setShowEditNameModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.accent }]}
              placeholder={t('team.organizationName')}
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
                <Text style={styles.submitButtonText}>{t('team.updateName')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  scrollContainer: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16
  },
  header: {
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  headerText: {
    flex: 1
  },
  orgIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  orgName: {
    fontSize: 20,
    fontFamily: 'Lora_700Bold'
  },
  memberCount: {
    fontSize: 14,
    marginTop: 4
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16
  },
  inviteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  },
  section: {
    gap: 10
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Lora_600SemiBold',
    marginBottom: 4,
    letterSpacing: 0.3
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  roleBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  memberDetails: {
    flex: 1
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700'
  },
  memberEmail: {
    fontSize: 13,
    marginTop: 2
  },
  memberRole: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
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
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  inviteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  inviteIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  inviteDetails: {
    flex: 1
  },
  inviteEmail: {
    fontSize: 14,
    fontWeight: '600'
  },
  inviteRole: {
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Lora_700Bold',
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20
  },
  createOrgButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16
  },
  createOrgButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    gap: 16
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Lora_700Bold'
  },
  input: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    fontSize: 16
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12
  },
  roleButton: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '700'
  },
  submitButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16
  }
});
