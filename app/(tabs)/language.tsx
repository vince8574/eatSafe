import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LanguageSelector } from '../../src/components/LanguageSelector';
import { useTheme } from '../../src/theme/themeContext';
import { useI18n } from '../../src/i18n/I18nContext';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../src/components/GradientBackground';
import { useAuth } from '../../src/contexts/AuthContext';

export default function LanguageScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      t('auth.signOutConfirm'),
      t('auth.signOutMessage'),
      [
        {
          text: t('auth.cancel'),
          style: 'cancel'
        },
        {
          text: t('auth.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert(t('auth.error'), t('auth.signOutFailed'));
            }
          }
        }
      ]
    );
  };

  return (
    <GradientBackground>
      <ScrollView style={styles.container}>
      <View style={styles.titleContainer}>
        <Image
          source={require('../../assets/logo_eatsok.png')}
          style={styles.logo}
          resizeMode="cover"
        />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('settings.title')}</Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('language.subtitle')}
      </Text>

      <View style={styles.selectorWrapper}>
        <LanguageSelector />
      </View>

      {/* Section Documents Légaux */}
      <View style={styles.legalSection}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('legal.sectionTitle')}
        </Text>

        <TouchableOpacity
          style={[styles.legalButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/legal/privacy-policy')}
        >
          <View style={styles.legalButtonContent}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.accent} />
            <Text style={[styles.legalButtonText, { color: colors.textPrimary }]}>
              {t('legal.privacyPolicy')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.legalButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/legal/terms')}
        >
          <View style={styles.legalButtonContent}>
            <Ionicons name="document-text-outline" size={24} color={colors.accent} />
            <Text style={[styles.legalButtonText, { color: colors.textPrimary }]}>
              {t('legal.terms')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.legalButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/legal/legal-notice')}
        >
          <View style={styles.legalButtonContent}>
            <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
            <Text style={[styles.legalButtonText, { color: colors.textPrimary }]}>
              {t('legal.legalNotice')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.legalButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/subscription')}
        >
          <View style={styles.legalButtonContent}>
            <Ionicons name="pricetag-outline" size={24} color={colors.accent} />
            <Text style={[styles.legalButtonText, { color: colors.textPrimary }]}>
              Abonnement & forfaits
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.legalButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/team')}
        >
          <View style={styles.legalButtonContent}>
            <Ionicons name="people-outline" size={24} color={colors.accent} />
            <Text style={[styles.legalButtonText, { color: colors.textPrimary }]}>
              {t('team.title') || 'Team Management'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Section Compte */}
      <View style={styles.legalSection}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('auth.account')}
        </Text>

        {/* User Email Display */}
        {user?.email && (
          <View style={[styles.userInfoBox, { backgroundColor: colors.surface }]}>
            <Ionicons name="person-circle-outline" size={40} color={colors.accent} />
            <View style={styles.userInfoText}>
              <Text style={[styles.userEmailLabel, { color: colors.textSecondary }]}>
                {t('auth.loggedInAs')}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textPrimary }]}>
                {user.email}
              </Text>
            </View>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.surface }]}
          onPress={handleSignOut}
        >
          <View style={styles.legalButtonContent}>
            <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
            <Text style={[styles.logoutButtonText, { color: '#FF6B6B' }]}>
              {t('auth.signOut')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.legalButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/legal/disclaimer')}
        >
          <View style={styles.legalButtonContent}>
            <Ionicons name="alert-circle-outline" size={24} color={colors.accent} />
            <Text style={[styles.legalButtonText, { color: colors.textPrimary }]}>
              {t('legal.disclaimer')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.legalButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/legal/data-sources')}
        >
          <View style={styles.legalButtonContent}>
            <Ionicons name="link-outline" size={24} color={colors.accent} />
            <Text style={[styles.legalButtonText, { color: colors.textPrimary }]}>
              {t('legal.dataSources')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.appDisclaimerBox, { backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.appDisclaimerText, { color: colors.textSecondary }]}>
          ⚠️ {t('common.appDisclaimer')}
        </Text>
      </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden'
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20
  },
  selectorWrapper: {
    marginTop: 12
  },
  legalSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16
  },
  legalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  legalButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  legalButtonText: {
    fontSize: 16,
    fontWeight: '600'
  },
  appDisclaimerBox: {
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    marginBottom: 16
  },
  appDisclaimerText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center'
  },
  userInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  userInfoText: {
    marginLeft: 12,
    flex: 1
  },
  userEmailLabel: {
    fontSize: 12,
    marginBottom: 2
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600'
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600'
  }
});
