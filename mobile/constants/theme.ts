/**
 * Circle Spring School Theme Colors
 * Extracted from school website design for consistent branding
 */

import { Platform } from 'react-native';

// School brand colors from website
const primaryBurgundy = '#A63446';
const secondaryNavy = '#001F5C';
const accentCyan = '#2BB8E8';
const darkRed = '#8B2332';

const tintColorLight = primaryBurgundy;
const tintColorDark = accentCyan;

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    tint: tintColorLight,
    primary: primaryBurgundy,
    secondary: secondaryNavy,
    accent: accentCyan,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    card: '#F8FAFC',
    border: '#E2E8F0',
    success: '#10B981',
    warning: '#F39C12',
    error: '#DC2626',
    muted: '#64748B',
    heading: darkRed,
  },
  dark: {
    text: '#ECEDEE',
    background: '#0F172A',
    tint: tintColorDark,
    primary: '#C84458',
    secondary: secondaryNavy,
    accent: accentCyan,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    card: '#1E293B',
    border: '#334155',
    success: '#10B981',
    warning: '#F39C12',
    error: '#EF4444',
    muted: '#94A3B8',
    heading: '#C84458',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
