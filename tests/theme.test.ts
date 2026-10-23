import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, getThemePreference, nextThemePreference, resolveTheme, setThemePreference } from '../services/theme';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

const stubSystemDark = (dark: boolean) =>
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: dark, addEventListener: vi.fn() })));

describe('theme preference', () => {
  it('defaults to following the system', () => {
    expect(getThemePreference()).toBe('system');
  });

  it('remembers light/dark, and "system" clears the stored choice', () => {
    setThemePreference('dark');
    expect(getThemePreference()).toBe('dark');
    setThemePreference('system');
    expect(getThemePreference()).toBe('system');
    expect(localStorage.length).toBe(0);
  });

  it('ignores unknown stored values', () => {
    localStorage.setItem('vinyl-vault-theme', 'neon');
    expect(getThemePreference()).toBe('system');
  });

  it('cycles system → light → dark → system', () => {
    expect(nextThemePreference('system')).toBe('light');
    expect(nextThemePreference('light')).toBe('dark');
    expect(nextThemePreference('dark')).toBe('system');
  });
});

describe('resolveTheme / applyTheme', () => {
  it('follows the system only when the preference is "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('writes the resolved theme on <html>', () => {
    stubSystemDark(true);
    expect(applyTheme()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    setThemePreference('light');
    applyTheme();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('falls back to light when the browser cannot report the system setting', () => {
    expect(applyTheme('system')).toBe('light');
  });
});
