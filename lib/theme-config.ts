/**
 * Configuration des thèmes de couleur
 * Définit tous les thèmes disponibles dans l'application
 */

export type ThemeColor = 
  | 'slate'   // Noir/Blanc actuel (défaut)
  | 'red'     // Rouge CANAL+
  | 'blue'    // Bleu corporate
  | 'green'   // Vert écologique
  | 'orange'  // Orange énergique
  | 'purple'; // Violet créatif

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  color: ThemeColor;
  mode: ThemeMode;
}

export const THEME_COLORS = [
  {
    id: 'slate' as ThemeColor,
    label: 'Ardoise',
    labelEn: 'Slate',
    icon: '⚫',
    description: 'Noir & blanc classique',
    preview: {
      primary: '#0f172a',
      light: '#f1f5f9',
      bg: '#ffffff',
    },
  },
  {
    id: 'red' as ThemeColor,
    label: 'Rouge ',
    labelEn: 'red',
    icon: '🔴',
    description: 'Rouge signature ',
    preview: {
      primary: '#E40613',
      light: '#fef2f2',
      bg: '#fff5f5',
    },
  },
  {
    id: 'blue' as ThemeColor,
    label: 'Bleu Corporate',
    labelEn: 'Corporate Blue',
    icon: '🔵',
    description: 'Bleu professionnel',
    preview: {
      primary: '#1e40af',
      light: '#eff6ff',
      bg: '#f0f7ff',
    },
  },
  {
    id: 'green' as ThemeColor,
    label: 'Vert Écologique',
    labelEn: 'Eco Green',
    icon: '🟢',
    description: 'Vert responsable',
    preview: {
      primary: '#166534',
      light: '#f0fdf4',
      bg: '#f7fef9',
    },
  },
  {
    id: 'orange' as ThemeColor,
    label: 'Orange Énergique',
    labelEn: 'Energetic Orange',
    icon: '🟠',
    description: 'Orange dynamique',
    preview: {
      primary: 'rgba(241, 103, 48, 1)ff',
      light: '#fff7ed',
      bg: '#fffaf5',
    },
  },
  {
    id: 'purple' as ThemeColor,
    label: 'Violet Créatif',
    labelEn: 'Creative Purple',
    icon: '🟣',
    description: 'Violet innovation',
    preview: {
      primary: '#6b21a8',
      light: '#faf5ff',
      bg: '#fcf9ff',
    },
  },
] as const;

export const THEME_MODES = [
  {
    value: 'light' as ThemeMode,
    label: 'Clair',
    labelEn: 'Light',
    icon: '☀️',
  },
  {
    value: 'dark' as ThemeMode,
    label: 'Sombre',
    labelEn: 'Dark',
    icon: '🌙',
  },
  {
    value: 'system' as ThemeMode,
    label: 'Système',
    labelEn: 'System',
    icon: '💻',
  },
] as const;

/**
 * Récupère la configuration d'un thème de couleur
 */
export function getThemeConfig(color: ThemeColor) {
  return THEME_COLORS.find(t => t.id === color) ?? THEME_COLORS[0];
}

/**
 * Récupère la configuration d'un mode de thème
 */
export function getThemeModeConfig(mode: ThemeMode) {
  return THEME_MODES.find(m => m.value === mode) ?? THEME_MODES[0];
}