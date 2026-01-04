import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/themeContext';
import { useI18n } from '../../src/i18n/I18nContext';
import { Ionicons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import { GradientBackground } from '../../src/components/GradientBackground';
import { getLegalDocumentHtml } from '../../src/constants/legalDocuments';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const source = { html: getLegalDocumentHtml('privacy', locale) };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('legal.privacyPolicy')}
          </Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <RenderHtml
            contentWidth={width - 32}
            source={source}
            baseStyle={{ color: colors.textPrimary, fontSize: 15, lineHeight: 22 }}
            tagsStyles={{
              h1: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: colors.textPrimary },
              h3: { fontSize: 17, fontWeight: '700', marginTop: 16, marginBottom: 6, color: colors.textPrimary },
              p: { marginBottom: 10 },
              ul: { paddingLeft: 18, marginBottom: 10 },
              li: { marginBottom: 4 }
            }}
          />
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
    paddingBottom: 48
  }
});
