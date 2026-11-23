import { Platform, type TextStyle } from 'react-native';

export const colors = {
  primary: '#8B1538',
  primaryPressed: '#6F102C',
  primarySoft: '#F7E8EC',
  primaryOn: '#FFFFFF',

  background: '#F6F6F7',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F1F3',
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',

  text: '#18181B',
  textMuted: '#52525B',
  textSubtle: '#8A8A93',
  textInverse: '#FFFFFF',

  danger: '#C62828',
  dangerSoft: '#FDECEC',
  success: '#2E7D32',
  successSoft: '#E8F5E9',
  warning: '#B26A00',
  warningSoft: '#FFF4E0',

  overlay: 'rgba(0,0,0,0.55)',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

const fontFamily = Platform.select({ ios: 'System', default: undefined });

export const typography = {
  display: { fontFamily, fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.text },
  title: { fontFamily, fontSize: 22, lineHeight: 28, fontWeight: '700', color: colors.text },
  heading: { fontFamily, fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.text },
  body: { fontFamily, fontSize: 15, lineHeight: 21, fontWeight: '400', color: colors.text },
  bodyStrong: { fontFamily, fontSize: 15, lineHeight: 21, fontWeight: '600', color: colors.text },
  caption: { fontFamily, fontSize: 13, lineHeight: 18, fontWeight: '400', color: colors.textMuted },
  label: { fontFamily, fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.textMuted },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: 6,
    color: colors.text,
  },
} as const satisfies Record<string, TextStyle>;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 2 },
});

export const theme = { colors, spacing, radius, typography, shadow } as const;
