import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { RecallStatus } from '../types';

type StatusTagProps = {
  status: RecallStatus;
  label: string;
};

const gradients: Record<RecallStatus, [string, string]> = {
  safe: ['#5CFFD2', '#0BAE86'],
  recalled: ['#FFA0B2', '#E14261'],
  warning: ['#FFD989', '#E5A200'],
  unknown: ['#B5C7C4', '#546866']
};

const shadows: Record<RecallStatus, ViewStyle> = {
  safe: {
    shadowColor: '#0BAE86',
    shadowOpacity: 0.32,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8
  },
  recalled: {
    shadowColor: '#C62842',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8
  },
  warning: {
    shadowColor: '#C88A16',
    shadowOpacity: 0.26,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 6
  },
  unknown: {
    shadowColor: '#243533',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5
  }
};

export function StatusTag({ status, label }: StatusTagProps) {
  const gradient = gradients[status] ?? gradients.unknown;
  const shadow = shadows[status] ?? shadows.unknown;

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.tag, shadow]}
    >
      <View style={styles.shine} pointerEvents="none" />
      <View style={styles.bottomGlow} pointerEvents="none" />
      <Text style={styles.text}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
    minWidth: 94,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0C1413',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(255,255,255,0.28)'
  },
  bottomGlow: {
    position: 'absolute',
    left: -20,
    right: -20,
    bottom: -10,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ skewX: '-12deg' }],
    opacity: 0.8
  }
});
