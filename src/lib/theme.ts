import type { Theme } from '@glideapps/glide-data-grid';

import { SITE } from '@/lib/site-config';

export type ColorMode = 'light' | 'dark';

export function readStoredColorMode(): ColorMode {
  try {
    const stored = localStorage.getItem(SITE.colorModeStorageKey);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage may be unavailable in private mode
  }
  return 'light';
}

export function writeStoredColorMode(mode: ColorMode): void {
  try {
    localStorage.setItem(SITE.colorModeStorageKey, mode);
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export function applyColorModeToDocument(mode: ColorMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export const PREVIEW_GRID_LIGHT_THEME: Partial<Theme> = {
  accentColor: '#10B981',
  accentLight: '#10B98133',
  textDark: '#18181b',
  textMedium: '#71717a',
  textLight: '#a1a1aa',
  bgCell: '#ffffff',
  bgCellMedium: '#fafafa',
  bgHeader: '#f4f4f5',
  bgHeaderHasFocus: '#e4e4e7',
  bgHeaderHovered: '#e4e4e7',
  borderColor: '#e4e4e7',
};

export const PREVIEW_GRID_DARK_THEME: Partial<Theme> = {
  accentColor: '#10B981',
  accentLight: '#10B98133',
  textDark: '#fafafa',
  textMedium: '#a1a1aa',
  textLight: '#71717a',
  bgCell: '#27272a',
  bgCellMedium: '#3f3f46',
  bgHeader: '#3f3f46',
  bgHeaderHasFocus: '#52525b',
  bgHeaderHovered: '#52525b',
  borderColor: 'rgba(255, 255, 255, 0.1)',
};
