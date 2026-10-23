/**
 * Light / dark ("listening room") theme. The preference is "system" by default, which
 * follows the operating system setting live; "light" and "dark" override it.
 *
 * The resolved theme is written to <html data-theme="light|dark">, which index.css
 * uses to swap the color palette. Stored in localStorage; when storage is unavailable
 * the app simply follows the system.
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'vinyl-vault-theme';
const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];

export const getThemePreference = (): ThemePreference => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return (THEMES as (string | null)[]).includes(value) ? value as ThemePreference : 'system';
  } catch {
    return 'system';
  }
};

export const setThemePreference = (preference: ThemePreference): void => {
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage unavailable: the choice lasts until the page is reloaded.
  }
};

/** Order of the theme button: system → light → dark → system. */
export const nextThemePreference = (preference: ThemePreference): ThemePreference =>
  THEMES[(THEMES.indexOf(preference) + 1) % THEMES.length];

export const resolveTheme = (preference: ThemePreference, systemPrefersDark: boolean): Theme =>
  preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference;

const darkQuery = (): MediaQueryList | null =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export const applyTheme = (preference: ThemePreference = getThemePreference()): Theme => {
  const theme = resolveTheme(preference, darkQuery()?.matches ?? false);
  document.documentElement.dataset.theme = theme;
  return theme;
};

/** Apply the saved theme now and keep following the system setting while it is "system". */
export const initTheme = (): void => {
  applyTheme();
  darkQuery()?.addEventListener('change', () => {
    if (getThemePreference() === 'system') applyTheme('system');
  });
};
