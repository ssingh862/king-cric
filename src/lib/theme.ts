import type { ViewStyle } from 'react-native';

/** Professional light theme — high contrast for outdoor / bright lighting */
export const colors = {
  background: '#F8FAFC',
  backgroundSecondary: '#FFFFFF',
  surface: '#F1F5F9',
  surfaceHover: '#E2E8F0',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  borderStrong: '#CBD5E1',
  orange: '#EA580C',
  orangeDark: '#C2410C',
  orangeLight: '#FFF7ED',
  gold: '#B45309',
  purple: '#7C3AED',
  pink: '#DB2777',
  green: '#059669',
  blue: '#0284C7',
  text: '#0F172A',
  textMuted: '#64748B',
  textDim: '#94A3B8',
  live: '#DC2626',
  liveLight: '#FEF2F2',
  successLight: '#ECFDF5',
  warningLight: '#FFFBEB',
  overlay: 'rgba(15, 23, 42, 0.45)',
  inputBg: '#FFFFFF',
  gradient: ['#EA580C', '#DB2777', '#7C3AED'] as const,
  headerGradient: ['#FFFFFF', '#F8FAFC'] as const,
  accentGradient: ['#FFF7ED', '#FFFFFF'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  } satisfies ViewStyle,
  cardLg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  } satisfies ViewStyle,
  button: {
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  } satisfies ViewStyle,
};

/** Shared professional input field style */
export const inputStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: colors.inputBg,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.cardBorder,
  paddingHorizontal: 14,
  marginBottom: 12,
};
