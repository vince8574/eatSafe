import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/theme/themeContext';
import { useI18n } from '../src/i18n/I18nContext';
import { GradientBackground } from '../src/components/GradientBackground';
import { useDietaryProfileStore } from '../src/stores/useDietaryProfileStore';

/**
 * Étape d'onboarding dédiée au régime alimentaire.
 *
 * Elle EXISTE parce que le profil de régime n'était atteignable que depuis les
 * Réglages : toute la détection d'allergènes et d'aliments interdits restait donc
 * éteinte, en silence, pour qui n'allait jamais y fouiller — précisément les
 * utilisateurs qui en ont le plus besoin.
 *
 * Elle ne collecte AUCUNE donnée de santé elle-même : elle renvoie vers l'écran
 * de profil, qui recueille déjà le consentement explicite exigé par l'art. 9 du
 * RGPD. Dupliquer ce recueil ici aurait créé un second chemin à maintenir, avec
 * le risque qu'il diverge du premier.
 */
export default function DietaryIntroRoute() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const people = useDietaryProfileStore((s) => s.people);
  const configured = people.length > 0;

  const goNext = () => router.replace('/welcome');

  const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
    { icon: 'alert-circle-outline', key: 'benefit1' },
    { icon: 'people-outline', key: 'benefit2' },
    { icon: 'lock-closed-outline', key: 'benefit3' }
  ];

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="nutrition-outline" size={38} color={colors.warning} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('dietaryIntro.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('dietaryIntro.subtitle')}
          </Text>

          {BENEFITS.map((b) => (
            <View key={b.key} style={styles.benefitRow}>
              <Ionicons name={b.icon} size={20} color={colors.warning} />
              <Text style={[styles.benefitText, { color: colors.textPrimary }]}>
                {t(`dietaryIntro.${b.key}`)}
              </Text>
            </View>
          ))}

          {configured ? (
            <View style={[styles.doneBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.doneText, { color: colors.textPrimary }]}>
                {t('dietaryIntro.configured', { count: people.length })}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (configured) goNext();
              else router.push('/dietary-profile' as any);
            }}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryBtnText, { color: colors.onAccent }]}>
              {configured ? t('dietaryIntro.continue') : t('dietaryIntro.configure')}
            </Text>
          </TouchableOpacity>

          {/* Toujours franchissable : imposer une saisie de données de santé pour
              entrer dans l'app serait à la fois hostile et contestable. */}
          <TouchableOpacity style={styles.skipBtn} onPress={goNext} accessibilityRole="button">
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              {configured ? t('dietaryIntro.addMore') : t('dietaryIntro.later')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  card: {
    borderRadius: 28,
    padding: 28,
    gap: 14
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 6
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  doneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 4
  },
  doneText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600'
  },
  primaryBtn: {
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center'
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  skipBtn: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600'
  }
});
