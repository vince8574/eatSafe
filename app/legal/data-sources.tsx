import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/themeContext';
import { useI18n } from '../../src/i18n/I18nContext';
import { GradientBackground } from '../../src/components/GradientBackground';

const FDA_URL = 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts';
const USDA_URL = 'https://www.fsis.usda.gov/recalls';

export default function DataSourcesScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('dataSources.title')}
          </Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('dataSources.description')}
          </Text>

          <TouchableOpacity
            style={[styles.sourceCard, { backgroundColor: colors.surface }]}
            onPress={() => Linking.openURL(FDA_URL)}
          >
            <View style={styles.sourceHeader}>
              <Text style={[styles.sourceTitle, { color: colors.textPrimary }]}>
                {t('dataSources.fda')}
              </Text>
              <Ionicons name="open-outline" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.sourceUrl, { color: colors.textSecondary }]}>{FDA_URL}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceCard, { backgroundColor: colors.surface }]}
            onPress={() => Linking.openURL(USDA_URL)}
          >
            <View style={styles.sourceHeader}>
              <Text style={[styles.sourceTitle, { color: colors.textPrimary }]}>
                {t('dataSources.usda')}
              </Text>
              <Ionicons name="open-outline" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.sourceUrl, { color: colors.textSecondary }]}>{USDA_URL}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
  },
  backButton: {
    padding: 8,
    marginRight: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 48,
    gap: 16
  },
  description: {
    fontSize: 14,
    lineHeight: 22
  },
  sourceCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1
  },
  sourceUrl: {
    marginTop: 8,
    fontSize: 13
  }
});
