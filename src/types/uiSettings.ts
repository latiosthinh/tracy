export interface ColorScheme {
  id: string;
  name: string;
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  accent: string;
  accentHover: string;
  textPrimary: string;
  textMuted: string;
  border: string;
}

export type ThemeMode = 'dark' | 'light' | 'system';
export type YamlPosition = 'left' | 'right';
export type AppLanguage = 'en' | 'es' | 'fr' | 'de' | 'vi' | 'ja' | 'zh';
export type UiScale = 'normal' | 'large' | 'xlarge';

export interface UiSettings {
  theme: ThemeMode;
  yamlPosition: YamlPosition;
  colorScheme: ColorScheme;
  colorSchemeJson: string;
  language: AppLanguage;
  a11y: {
    highContrast: boolean;
    fontSize: UiScale;
    reducedMotion: boolean;
  };
}

export const PRESET_COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'tracy-amber',
    name: 'Tracy Amber & Stone (Default)',
    bgPrimary: '#0c0a09',
    bgSecondary: '#1c1917',
    bgCard: '#292524',
    accent: '#f59e0b',
    accentHover: '#d97706',
    textPrimary: '#f5f5f4',
    textMuted: '#a8a29e',
    border: '#44403c',
  },
  {
    id: 'midnight-cyan',
    name: 'Midnight Cyan',
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgCard: '#334155',
    accent: '#06b6d4',
    accentHover: '#0891b2',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
    border: '#475569',
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    bgPrimary: '#2e3440',
    bgSecondary: '#3b4252',
    bgCard: '#434c5e',
    accent: '#88c0d0',
    accentHover: '#81a1c1',
    textPrimary: '#eceff4',
    textMuted: '#d8dee9',
    border: '#4c566a',
  },
  {
    id: 'clean-paper-light',
    name: 'Clean Paper Light',
    bgPrimary: '#fafaf9',
    bgSecondary: '#f5f5f4',
    bgCard: '#e7e5e4',
    accent: '#d97706',
    accentHover: '#b45309',
    textPrimary: '#1c1917',
    textMuted: '#78716c',
    border: '#d6d3d1',
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    bgPrimary: '#fdf6e3',
    bgSecondary: '#eee8d5',
    bgCard: '#e0dacb',
    accent: '#b58900',
    accentHover: '#cb4b16',
    textPrimary: '#073642',
    textMuted: '#657b83',
    border: '#d3cbb7',
  },
];

export const DEFAULT_UI_SETTINGS: UiSettings = {
  theme: 'dark',
  yamlPosition: 'right',
  colorScheme: PRESET_COLOR_SCHEMES[0],
  colorSchemeJson: JSON.stringify(PRESET_COLOR_SCHEMES[0], null, 2),
  language: 'en',
  a11y: {
    highContrast: false,
    fontSize: 'normal',
    reducedMotion: false,
  },
};
