import { useCallback, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { usePendingInvites } from '../hooks/useOrganization';
import { acceptInvite, rejectInvite } from '../services/organizationService';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';

export function PendingInvitesModal() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { invites, loading, refresh } = usePendingInvites(user?.email ?? null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = useCallback(
    async (inviteId: string) => {
      try {
        setProcessingId(inviteId);
        await acceptInvite(inviteId);
        await refresh();
      } catch (err) {
        Alert.alert(
          t('pendingInvite.acceptErrorTitle'),
          err instanceof Error ? err.message : t('pendingInvite.acceptError')
        );
      } finally {
        setProcessingId(null);
      }
    },
    [refresh, t]
  );

  const handleReject = useCallback(
    async (inviteId: string) => {
      try {
        setProcessingId(inviteId);
        await rejectInvite(inviteId);
        await refresh();
      } catch (err) {
        Alert.alert(
          t('pendingInvite.rejectErrorTitle'),
          err instanceof Error ? err.message : t('pendingInvite.rejectError')
        );
      } finally {
        setProcessingId(null);
      }
    },
    [refresh, t]
  );

  if (loading || invites.length === 0) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Ionicons name="mail-open-outline" size={28} color={colors.accent} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('pendingInvite.title')}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t('pendingInvite.description')}
            </Text>
          </View>

          {invites.map((invite) => {
            const isProcessing = processingId === invite.id;
            return (
              <View
                key={invite.id}
                style={[styles.inviteCard, { borderColor: colors.textSecondary + '33' }]}
              >
                <View style={styles.inviteInfo}>
                  <Text style={[styles.orgName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {invite.orgName}
                  </Text>
                  <Text style={[styles.roleLabel, { color: colors.textSecondary }]}>
                    {t('pendingInvite.roleAs', { role: t(`team.${invite.role}`) })}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => handleReject(invite.id)}
                    disabled={isProcessing}
                    style={[styles.button, styles.declineButton, { borderColor: colors.textSecondary }]}
                  >
                    <Text style={[styles.declineText, { color: colors.textSecondary }]}>
                      {t('pendingInvite.decline')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleAccept(invite.id)}
                    disabled={isProcessing}
                    style={[styles.button, styles.acceptButton, { backgroundColor: colors.accent }]}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color={colors.surface} size="small" />
                    ) : (
                      <Text style={[styles.acceptText, { color: colors.surface }]}>
                        {t('pendingInvite.accept')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    gap: 16
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center'
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20
  },
  inviteCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 14
  },
  inviteInfo: {
    gap: 4
  },
  orgName: {
    fontSize: 16,
    fontWeight: '700'
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '500'
  },
  actions: {
    flexDirection: 'row',
    gap: 10
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  declineButton: {
    borderWidth: 1
  },
  acceptButton: {
    borderWidth: 0
  },
  declineText: {
    fontSize: 14,
    fontWeight: '600'
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '700'
  }
});
