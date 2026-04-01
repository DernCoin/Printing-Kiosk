import { createAnimations } from '@tamagui/animations-react-native';
import { createTamagui, createFont } from 'tamagui';
import { libraryColors } from './src/theme/colors';

const animations = createAnimations({
  fast: { type: 'timing', duration: 150 },
  medium: { type: 'timing', duration: 250 },
  slow: { type: 'timing', duration: 400 },
});

const googleSansFont = createFont({
  family: 'GoogleSansFlex_400Regular',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 22,
    7: 24,
    8: 28,
    9: 32,
    10: 36,
    11: 42,
    12: 48,
    true: 16,
  },
  lineHeight: {
    1: 18,
    2: 20,
    3: 22,
    4: 24,
    5: 28,
    6: 30,
    7: 32,
    8: 36,
    9: 40,
    10: 44,
    11: 50,
    12: 56,
    true: 22,
  },
  weight: {
    4: '400',
    7: '700',
    true: '400',
  },
  face: {
    400: { normal: 'GoogleSansFlex_400Regular' },
    700: { normal: 'GoogleSansFlex_700Bold' },
  },
});

export const config = createTamagui({
  animations,
  shouldAddPrefersColorThemes: false,
  themeClassNameOnRoot: false,
  defaultFont: 'body',
  fonts: {
    body: googleSansFont,
    heading: googleSansFont,
  },
  shorthands: { bg: 'backgroundColor' },
  tokens: {
    color: {
      primary: libraryColors.primary,
      primaryDark: libraryColors.primaryDark,
      primaryLight: libraryColors.primaryLight,
      background: libraryColors.background,
      backgroundSecondary: libraryColors.backgroundSecondary,
      textPrimary: libraryColors.textPrimary,
      textSecondary: libraryColors.textSecondary,
      error: libraryColors.error,
      white: libraryColors.white,
      transparent: 'transparent',
    },
    space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, true: 16 },
    size: { sm: 8, md: 16, lg: 24, xl: 48, true: 16, full: 9999 },
    radius: { none: 0, sm: 8, md: 12, lg: 16, xl: 24, true: 12, full: 9999 },
    zIndex: { sm: 0, md: 100, lg: 200, xl: 500 },
  },
  themes: {
    light: {
      background: libraryColors.background,
      backgroundSecondary: libraryColors.backgroundSecondary,
      color: libraryColors.textPrimary,
      colorSecondary: libraryColors.textSecondary,
      primary: libraryColors.primary,
      primaryDark: libraryColors.primaryDark,
      borderColor: libraryColors.border,
    },
  },
});

export default config;
export type AppConfig = typeof config;
declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
