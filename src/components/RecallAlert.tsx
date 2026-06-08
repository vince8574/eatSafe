import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';
import { useI18n } from '../i18n/I18nContext';
import { RecallRecord } from '../types';

interface RecallAlertProps {
  recall: RecallRecord;
  reason?: string;
}

export function RecallAlert({ recall, reason }: RecallAlertProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const openEmergencyCall = () => {
    // US app: 911 is the single emergency number, localized in every language.
    Linking.openURL('tel:911');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.danger }]}>
      <View style={styles.header}>
        <Ionicons name="warning" size={48} color="#FFF" />
        <Text style={styles.title}>{t('recallAlert.title')}</Text>
      </View>

      <View style={[styles.warningBox, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
        <View style={styles.warningHeader}>
          <Ionicons name="close-circle" size={24} color="#FFF" />
          <Text style={styles.warningTitle}>{t('recallAlert.doNotConsume')}</Text>
        </View>
        <Text style={styles.warningText}>
          {t('recallAlert.warning')}
        </Text>
      </View>

      {reason && (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>{t('recallAlert.reasonLabel')}</Text>
          <Text style={styles.reasonText}>{reason}</Text>
        </View>
      )}

      <View style={styles.recallDetails}>
        <Text style={styles.recallTitle}>{recall.title}</Text>
        {recall.description && (
          <Text style={styles.recallDescription}>{recall.description}</Text>
        )}
        <Text style={styles.reportedBy}>{t('recallAlert.reportedBy')}</Text>
      </View>

      <View style={[styles.emergencyBox, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
        <View style={styles.emergencyHeader}>
          <Ionicons name="medkit" size={22} color="#FFF" />
          <Text style={styles.emergencyTitle}>{t('recallAlert.emergencyTitle')}</Text>
        </View>
        <Text style={styles.emergencyText}>
          {t('recallAlert.emergencyText')}
        </Text>
        <View style={styles.emergencyNumbers}>
          <TouchableOpacity
            style={[styles.emergencyButton, { backgroundColor: '#FFF' }]}
            onPress={openEmergencyCall}
          >
            <Ionicons name="call" size={18} color={colors.danger} />
            <Text style={[styles.emergencyButtonText, { color: colors.danger }]}>
              {t('recallAlert.callSamu')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {recall.link && (
        <TouchableOpacity
          style={[styles.linkButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
          onPress={() => Linking.openURL(recall.link!)}
        >
          <Ionicons name="document-text" size={18} color={colors.danger} />
          <Text style={[styles.linkText, { color: colors.danger }]}>
            {t('recallAlert.viewOfficialNotice')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('recallAlert.returnForRefund')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 24,
    gap: 16
  },
  header: {
    alignItems: 'center',
    gap: 10
  },
  title: {
    fontSize: 24,
    fontFamily: 'Lora_700Bold',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 1
  },
  warningBox: {
    padding: 16,
    borderRadius: 16,
    gap: 8
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center'
  },
  warningText: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600'
  },
  reasonBox: {
    gap: 8
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  reasonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF'
  },
  recallDetails: {
    gap: 8
  },
  recallTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF'
  },
  recallDescription: {
    fontSize: 15,
    color: '#FFF',
    lineHeight: 22,
    opacity: 0.95
  },
  reportedBy: {
    fontSize: 13,
    color: '#FFF',
    opacity: 0.85
  },
  emergencyBox: {
    padding: 16,
    borderRadius: 16,
    gap: 12
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center'
  },
  emergencyText: {
    fontSize: 15,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500'
  },
  emergencyNumbers: {
    marginTop: 8
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12
  },
  emergencyButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12
  },
  linkText: {
    fontSize: 16,
    fontWeight: '700'
  },
  footer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)'
  },
  footerText: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.9
  }
});
