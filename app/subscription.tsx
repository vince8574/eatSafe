import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/themeContext';
import { useI18n } from '../src/i18n/I18nContext';
import { useSubscription } from '../src/hooks/useSubscription';
import { GradientBackground } from '../src/components/GradientBackground';
import type { BillingPeriod } from '../src/constants/subscriptionPlans';

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

  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');

  const handleChoosePlan = (planId: string) => {
    if (purchasing) return;
    const plan = plans.find((p) => p.id === planId || p.idYear === planId);
    const displayPrice = plan
      ? billingPeriod === 'yearly'
        ? plan.priceYear
        : plan.price
      : '';
    Alert.alert(
      t('subscription.confirmTitle'),
      plan ? `${t('subscription.confirmMessage')} ${t(plan.labelKey)} (${displayPrice})?` : t('subscription.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('subscription.choosePlan'),
          onPress: async () => {
            setPendingPlanId(planId);
            try {
              await choosePlan(planId);
            } finally {
              setPendingPlanId(null);
            }
          }
        }
      ]
    );
  };

  const handleBuyPack = async (packId: string, quantity: number) => {
    if (purchasing) return;
    setPendingPackId(packId);
    try {
      await buyPack(quantity);
    } finally {
      setPendingPackId(null);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      const restored = await restorePurchases();
      if (restored) {
        Alert.alert(t('subscription.restoreSuccess'), t('subscription.restoreSuccessMessage'));
      } else {
        Alert.alert(t('subscription.restoreError'), t('subscription.restoreNoPurchase'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('subscription.restoreErrorMessage');
      Alert.alert(t('subscription.restoreError'), message);
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

          <View style={[styles.billingToggle, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.billingToggleOption,
                billingPeriod === 'monthly' && { backgroundColor: colors.accent }
              ]}
              onPress={() => setBillingPeriod('monthly')}
            >
              <Text
                style={[
                  styles.billingToggleText,
                  { color: billingPeriod === 'monthly' ? colors.surface : colors.textSecondary }
                ]}
              >
                {t('subscription.billingPeriod.monthly')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.billingToggleOption,
                billingPeriod === 'yearly' && { backgroundColor: colors.accent }
              ]}
              onPress={() => setBillingPeriod('yearly')}
            >
              <Text
                style={[
                  styles.billingToggleText,
                  { color: billingPeriod === 'yearly' ? colors.surface : colors.textSecondary }
                ]}
              >
                {t('subscription.billingPeriod.yearly')}
              </Text>
              <View style={[styles.savingsBadge, { backgroundColor: billingPeriod === 'yearly' ? colors.surface : colors.accent }]}>
                <Text style={[styles.savingsBadgeText, { color: billingPeriod === 'yearly' ? colors.accent : colors.surface }]}>
                  {t('subscription.billingPeriod.savings')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {plans.map((plan) => {
            const productId = billingPeriod === 'yearly' ? plan.idYear : plan.id;
            const headlinePrice =
              billingPeriod === 'yearly'
                ? `$${(plan.pricePerYear / 12).toFixed(2)} / mo`
                : plan.price;
            const billedSubtitle =
              billingPeriod === 'yearly'
                ? t('subscription.billingPeriod.billed', { amount: plan.priceYear })
                : '';
            const isActive =
              (subscription?.planId === plan.id || subscription?.planId === plan.idYear) &&
              subscription?.status === 'active';
            const isPending = pendingPlanId === productId;
            const disabled = loading || purchasing || isActive;
            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    borderColor: isActive ? colors.accent : colors.border,
                    backgroundColor: isActive ? colors.surfaceAlt : colors.surface
                  }
                ]}
              >
                <View style={styles.planHeader}>
                  <Text style={[styles.planTitle, { color: colors.textPrimary }]}>{t(plan.labelKey)}</Text>
                  <View style={styles.planPriceWrap}>
                    <Text style={[styles.planPrice, { color: colors.accent }]}>{headlinePrice}</Text>
                    {billedSubtitle ? (
                      <Text style={[styles.planPriceBilled, { color: colors.textSecondary }]}>{billedSubtitle}</Text>
                    ) : null}
                  </View>
                </View>
                {plan.descriptionKeys.map((key) => (
                  <Text key={key} style={[styles.planDesc, { color: colors.textSecondary }]}>
                    • {t(key)}
                  </Text>
                ))}
                <TouchableOpacity
                  style={[
                    styles.planButton,
                    {
                      backgroundColor: isActive ? colors.surface : colors.accent,
                      borderColor: colors.accent,
                      opacity: disabled && !isPending ? 0.5 : 1
                    }
                  ]}
                  onPress={() => handleChoosePlan(productId)}
                  disabled={disabled}
                >
                  {isPending ? (
                    <ActivityIndicator color={isActive ? colors.accent : colors.surface} size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.planButtonText,
                        { color: isActive ? colors.accent : colors.surface }
                      ]}
                    >
                      {isActive ? t('subscription.planSelected') : t('subscription.choosePlan')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Subscription Terms — required by Apple App Store guideline 3.1.2 */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('subscription.terms.title')}
          </Text>
          <Text style={[styles.termsText, { color: colors.textSecondary }]}>
            {t('subscription.terms.disclosure')}
          </Text>
          <View style={styles.termsLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('https://numeline.vercel.app/terms-of-service.html')}>
              <Text style={[styles.termsLink, { color: colors.accent }]}>
                {t('subscription.terms.termsOfUse')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.termsSeparator, { color: colors.textSecondary }]}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://numeline.vercel.app/privacy-policy.html')}>
              <Text style={[styles.termsLink, { color: colors.accent }]}>
                {t('subscription.terms.privacyPolicy')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('subscription.scanPacksTitle')}</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            {t('subscription.scanPacksHelper')}
          </Text>
          <View style={styles.packs}>
            {packs.map((pack) => {
              const isPending = pendingPackId === pack.id;
              const disabled = loading || purchasing;
              return (
                <TouchableOpacity
                  key={pack.id}
                  style={[
                    styles.packButton,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.accent,
                      opacity: disabled && !isPending ? 0.5 : 1
                    }
                  ]}
                  onPress={() => handleBuyPack(pack.id, pack.quantity)}
                  disabled={disabled}
                >
                  {isPending ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <>
                      <Text style={[styles.packText, { color: colors.textPrimary }]}>{t(pack.labelKey)}</Text>
                      <Text style={[styles.packSub, { color: colors.textSecondary }]}>+{pack.quantity} scans</Text>
                      <Text style={[styles.packPrice, { color: colors.accent }]}>{pack.price}</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
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
          <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text>
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
    fontFamily: 'Lora_700Bold'
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
    fontFamily: 'Lora_700Bold'
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
  planPriceWrap: {
    alignItems: 'flex-end'
  },
  planPrice: {
    fontSize: 14,
    fontWeight: '800'
  },
  planPriceBilled: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2
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
  billingToggle: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    marginTop: 4,
    marginBottom: 4
  },
  billingToggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 6
  },
  billingToggleText: {
    fontSize: 13,
    fontWeight: '700'
  },
  savingsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999
  },
  savingsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1
  },
  errorText: {
    flex: 1,
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
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500'
  },
  termsLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    flexWrap: 'wrap'
  },
  termsLink: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  termsSeparator: {
    fontSize: 12
  }
});
