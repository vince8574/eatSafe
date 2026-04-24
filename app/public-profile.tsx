import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../src/components/GradientBackground';
import { useTheme } from '../src/theme/themeContext';
import { useI18n } from '../src/i18n/I18nContext';
import { getPublicProfile, savePublicProfile, PublicProfile } from '../src/services/publicProfileService';

export default function PublicProfileScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PublicProfile>({
    companyName: '',
    logoUrl: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    published: false
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await getPublicProfile();
        setProfile(data);
      } catch (err) {
        console.warn('Failed to load public profile', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = <K extends keyof PublicProfile>(key: K, value: PublicProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (profile.published && !profile.companyName.trim()) {
      Alert.alert(t('publicProfile.missingTitle'), t('publicProfile.missingCompany'));
      return;
    }
    setSaving(true);
    try {
      await savePublicProfile({
        ...profile,
        companyName: profile.companyName.trim(),
        logoUrl: profile.logoUrl.trim(),
        address: profile.address.trim(),
        phone: profile.phone.trim(),
        email: profile.email.trim(),
        website: profile.website.trim()
      });
      Alert.alert(t('publicProfile.savedTitle'), t('publicProfile.savedMessage'));
    } catch (err) {
      Alert.alert(t('publicProfile.errorTitle'), t('publicProfile.errorMessage'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('publicProfile.title')}
          </Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} keyboardShouldPersistTaps="handled">
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('publicProfile.subtitle')}
            </Text>

            {/* Publish toggle */}
            <TouchableOpacity
              style={[
                styles.toggleCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: profile.published ? colors.accent : colors.border
                }
              ]}
              onPress={() => update('published', !profile.published)}
              activeOpacity={0.8}
            >
              <View style={styles.toggleLeft}>
                <Ionicons name="globe-outline" size={24} color={colors.accent} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                    {t('publicProfile.publishToggle')}
                  </Text>
                  <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                    {t('publicProfile.publishDescription')}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.toggleSwitch,
                  {
                    backgroundColor: profile.published ? colors.accent : colors.surfaceAlt,
                    borderColor: profile.published ? colors.accent : colors.border
                  }
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    { transform: [{ translateX: profile.published ? 18 : 2 }] }
                  ]}
                />
              </View>
            </TouchableOpacity>

            {/* Logo preview */}
            {profile.logoUrl ? (
              <View style={[styles.logoPreview, { backgroundColor: colors.surface }]}>
                <Image
                  source={{ uri: profile.logoUrl }}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            ) : null}

            <Field
              label={t('publicProfile.companyName')}
              placeholder={t('publicProfile.companyNamePlaceholder')}
              value={profile.companyName}
              onChangeText={(v) => update('companyName', v)}
              colors={colors}
            />
            <Field
              label={t('publicProfile.logoUrl')}
              placeholder={t('publicProfile.logoUrlPlaceholder')}
              value={profile.logoUrl}
              onChangeText={(v) => update('logoUrl', v)}
              colors={colors}
              keyboardType="url"
              autoCapitalize="none"
            />
            <Field
              label={t('publicProfile.address')}
              placeholder={t('publicProfile.addressPlaceholder')}
              value={profile.address}
              onChangeText={(v) => update('address', v)}
              colors={colors}
              multiline
            />
            <Field
              label={t('publicProfile.phone')}
              placeholder={t('publicProfile.phonePlaceholder')}
              value={profile.phone}
              onChangeText={(v) => update('phone', v)}
              colors={colors}
              keyboardType="phone-pad"
            />
            <Field
              label={t('publicProfile.email')}
              placeholder={t('publicProfile.emailPlaceholder')}
              value={profile.email}
              onChangeText={(v) => update('email', v)}
              colors={colors}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label={t('publicProfile.website')}
              placeholder={t('publicProfile.websitePlaceholder')}
              value={profile.website}
              onChangeText={(v) => update('website', v)}
              colors={colors}
              keyboardType="url"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.accent, opacity: saving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>{t('publicProfile.save')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </GradientBackground>
  );
}

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  colors: any;
  multiline?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
};

function Field({ label, placeholder, value, onChangeText, colors, multiline, keyboardType, autoCapitalize }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 80 },
  subtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 24
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  toggleLabel: { fontSize: 16, fontWeight: '600' },
  toggleDescription: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  toggleSwitch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    marginLeft: 12
  },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF' },
  logoPreview: {
    height: 120,
    borderRadius: 16,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  logoImage: { width: '100%', height: '100%' },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
