import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/themeContext';
import { useI18n } from '../src/i18n/I18nContext';
import { useSubscription } from '../src/hooks/useSubscription';
import { GradientBackground } from '../src/components/GradientBackground';

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const {
    subscription,
    plans,
    packs,
    loading,
    purchasing,
    error,
    storeAvailable,
    choosePlan,
    buyPack,
    restorePurchases,
    refresh
  } = useSubscription();

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases();
      Alert.alert(t('subscription.restoreSuccess'), t('subscription.restoreSuccessMessage'));
    } catch (err) {
      Alert.alert(t('subscription.restoreError'), t('subscription.restoreErrorMessage'));
    }
  };

  const statusLabel = useMemo(() => {
    if (!subscription || subscription.status === 'none') return t('subscription.status.none');
    if (subscription.status === 'expired') return t('subscription.status.expired');
    return t('subscription.status.active');
  }, [subscription, t]);

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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('subscription.header')}</Text>
          <TouchableOpacity onPress={refresh} style={styles.refreshButton} disabled={loading}>
            <Ionicons name="refresh" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('subscription.mySubscription')}</Text>
          <Text style={[styles.status, { color: colors.accent }]}>{statusLabel}</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('subscription.plan')}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {subscription?.planName ? t(subscription.planName) : t('subscription.none')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('subscription.expiration')}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{expiresLabel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('subscription.scansRemaining')}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {subscription?.scansRemaining ?? 0} / {subscription?.scansIncluded ?? 0}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('subscription.history')}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {subscription?.historyRetentionDays === 'unlimited'
                ? t('subscription.unlimited')
                : `${subscription?.historyRetentionDays ?? 0} ${t('subscription.days')}`}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('subscription.exports')}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {subscription?.exportEnabled ? t('subscription.enabled') : t('subscription.notIncluded')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('subscription.multiEmployees')}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {subscription?.employeesLimit ? `${t('subscription.upTo')} ${subscription.employeesLimit}` : '1'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('subscription.sites')}</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {subscription?.sitesLimit ? `${t('subscription.upTo')} ${subscription.sitesLimit}` : '1'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('subscription.plansTitle')}</Text>
            {loading && <ActivityIndicator color={colors.accent} />}
          </View>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            {t('subscription.plansHelper')}
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
                  <Text style={[styles.planTitle, { color: colors.textPrimary }]}>{t(plan.labelKey)}</Text>
                  <Text style={[styles.planPrice, { color: colors.accent }]}>{plan.price}</Text>
                </View>
                {plan.descriptionKeys.map((key) => (
                  <Text key={key} style={[styles.planDesc, { color: colors.textSecondary }]}>
                    • {t(key)}
                  </Text>
                ))}
                <TouchableOpacity
                  style={[
                    styles.planButton,
                    { backgroundColor: selected ? colors.surface : colors.accent, borderColor: colors.accent }
                  ]}
                  onPress={() => choosePlan(plan.id)}
                  disabled={loading || purchasing}
                >
                  {purchasing ? (
                    <ActivityIndicator color={selected ? colors.accent : colors.surface} size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.planButtonText,
                        { color: selected ? colors.accent : colors.surface }
                      ]}
                    >
                      {selected ? t('subscription.planSelected') : t('subscription.choosePlan')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('subscription.scanPacksTitle')}</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            {t('subscription.scanPacksHelper')}
          </Text>
          <View style={styles.packs}>
            {packs.map((pack) => (
              <TouchableOpacity
                key={pack.id}
                style={[styles.packButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.accent }]}
                onPress={() => buyPack(pack.quantity)}
                disabled={loading || purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator color={colors.accent} size="small" />
                ) : (
                  <>
                    <Text style={[styles.packText, { color: colors.textPrimary }]}>{t(pack.labelKey)}</Text>
                    <Text style={[styles.packSub, { color: colors.textSecondary }]}>+{pack.quantity} scans</Text>
                    <Text style={[styles.packPrice, { color: colors.accent }]}>{pack.price}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {Platform.OS === 'android' && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('subscription.restoreTitle')}</Text>
            <Text style={[styles.helper, { color: colors.textSecondary }]}>
              {t('subscription.restoreHelper')}
            </Text>
            <TouchableOpacity
              style={[styles.restoreButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.accent }]}
              onPress={handleRestorePurchases}
              disabled={loading || purchasing}
            >
              <Ionicons name="refresh-circle-outline" size={20} color={colors.accent} />
              <Text style={[styles.restoreButtonText, { color: colors.accent }]}>
                {t('subscription.restoreButton')}
              </Text>
            </TouchableOpacity>
            {!storeAvailable && (
              <Text style={[styles.devModeText, { color: colors.textSecondary }]}>
                {t('subscription.devMode')}
              </Text>
            )}
          </View>
        )}

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
  packPrice: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4
  },
  errorBox: {
    borderRadius: 12,
    padding: 12
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700'
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '700'
  },
  devModeText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8
  }
});
