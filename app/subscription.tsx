import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/themeContext';
import { useSubscription } from '../src/hooks/useSubscription';
import { GradientBackground } from '../src/components/GradientBackground';

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { subscription, plans, packs, loading, error, choosePlan, buyPack, refresh } = useSubscription();

  const statusLabel = useMemo(() => {
    if (!subscription || subscription.status === 'none') return 'Aucun forfait actif';
    if (subscription.status === 'expired') return 'Forfait expiré';
    return 'Forfait actif (simulation)';
  }, [subscription]);

  const expiresLabel = useMemo(() => {
    if (!subscription || !subscription.expiresAt) return '—';
    return new Date(subscription.expiresAt).toLocaleDateString();
  }, [subscription]);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Abonnement & forfaits</Text>
          <TouchableOpacity onPress={refresh} style={styles.refreshButton} disabled={loading}>
            <Ionicons name="refresh" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Mon abonnement</Text>
          <Text style={[styles.status, { color: colors.accent }]}>{statusLabel}</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Plan</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {subscription?.planName || 'Aucun'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Expiration (simulée)</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{expiresLabel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Scans restants</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {subscription?.scansRemaining ?? 0} / {subscription?.scansIncluded ?? 0}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Historique</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {subscription?.historyRetentionDays === 'unlimited'
                ? 'Illimité'
                : `${subscription?.historyRetentionDays ?? 0} jours`}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Exports</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {subscription?.exportEnabled ? 'Activés' : 'Non inclus'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Multi-employés</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {subscription?.employeesLimit ? `Jusqu’à ${subscription.employeesLimit}` : '1'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Sites</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {subscription?.sitesLimit ? `Jusqu’à ${subscription.sitesLimit}` : '1'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Forfaits</Text>
            {loading && <ActivityIndicator color={colors.accent} />}
          </View>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            Les achats sont simulés (Firestore). La facturation réelle (App Store / Google Play) sera branchée plus tard.
          </Text>
          {plans.map((plan) => {
            const selected = subscription?.planId === plan.id;
            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    borderColor: selected ? colors.accent : colors.border,
                    backgroundColor: selected ? colors.surfaceAlt : colors.surface
                  }
                ]}
              >
                <View style={styles.planHeader}>
                  <Text style={[styles.planTitle, { color: colors.textPrimary }]}>{plan.label}</Text>
                  <Text style={[styles.planPrice, { color: colors.accent }]}>{plan.price}</Text>
                </View>
                {plan.description.map((line) => (
                  <Text key={line} style={[styles.planDesc, { color: colors.textSecondary }]}>
                    • {line}
                  </Text>
                ))}
                <TouchableOpacity
                  style={[
                    styles.planButton,
                    { backgroundColor: selected ? colors.surface : colors.accent, borderColor: colors.accent }
                  ]}
                  onPress={() => choosePlan(plan.id)}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.planButtonText,
                      { color: selected ? colors.accent : colors.surface }
                    ]}
                  >
                    {selected ? 'Plan sélectionné' : 'Choisir ce plan'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Packs de scans</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            Ajoute des scans si ton quota mensuel est atteint. Simulation Firestore en attendant la facturation in‑app.
          </Text>
          <View style={styles.packs}>
            {packs.map((pack) => (
              <TouchableOpacity
                key={pack.id}
                style={[styles.packButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.accent }]}
                onPress={() => buyPack(pack.quantity)}
                disabled={loading}
              >
                <Text style={[styles.packText, { color: colors.textPrimary }]}>{pack.label}</Text>
                <Text style={[styles.packSub, { color: colors.textSecondary }]}>+{pack.quantity} scans</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: '#FEE' }]}>
            <Text style={[styles.errorText, { color: '#C00' }]}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4
  },
  backButton: {
    padding: 8,
    marginRight: 8
  },
  refreshButton: {
    padding: 8,
    marginLeft: 'auto'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700'
  },
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  status: {
    fontSize: 14,
    fontWeight: '700'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  label: {
    fontSize: 13,
    fontWeight: '600'
  },
  value: {
    fontSize: 14,
    fontWeight: '700'
  },
  helper: {
    fontSize: 13,
    lineHeight: 18
  },
  planCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    gap: 6
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8
  },
  planPrice: {
    fontSize: 14,
    fontWeight: '800'
  },
  planDesc: {
    fontSize: 13,
    lineHeight: 18
  },
  planButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center'
  },
  planButtonText: {
    fontSize: 14,
    fontWeight: '800'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  packs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  packButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: '30%'
  },
  packText: {
    fontSize: 14,
    fontWeight: '700'
  },
  packSub: {
    fontSize: 12,
    marginTop: 4
  },
  errorBox: {
    borderRadius: 12,
    padding: 12
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700'
  }
});
