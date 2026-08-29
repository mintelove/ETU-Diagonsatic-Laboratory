import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useRealtime } from './RealtimeContext.jsx';
import { getTranslation } from '../utils/translations.js';

const PreferencesContext = createContext(null);

const defaults = {
  theme: 'dark', // Dark Mode is default everywhere across the entire application
  language: 'en',
  timeFormat: '24',
  dateFormat: 'locale',
  notifications: true,
  sidebarCollapsed: false,
};

function getLuminance(hex) {
  if (!hex || typeof hex !== 'string') return 0.5;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return 0.5;
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function applyCustomColors(colors, currentThemeMode = document.documentElement.dataset.theme || 'dark') {
  if (!colors || typeof colors !== 'object') return;

  const isDark = currentThemeMode === 'dark';

  if (isDark) {
    // DARK MODE AUTOMATIC COMBINATION MAPPING
    const darkMainBg = colors.background && getLuminance(colors.background) < 0.25 ? colors.background : '#090e17';
    const darkSidebar = colors.sidebar && getLuminance(colors.sidebar) < 0.35 ? colors.sidebar : '#080d17';
    const darkHeader = colors.header && getLuminance(colors.header) < 0.35 ? colors.header : '#0e1726';
    const darkCard = colors.card && getLuminance(colors.card) < 0.35 ? colors.card : '#131e32';
    const darkHeading = colors.heading || '#38bdf8';
    const darkBottom = colors.bottom || '#131e32';
    const darkPrimary = colors.primary || '#0284c7';
    const darkSecondary = colors.secondary || '#2dd4bf';

    const darkVars = {
      '--color-surface': darkMainBg,
      '--color-surface-dim': darkMainBg,
      '--etu-sidebar': darkSidebar,
      '--etu-sidebar-color': '#f8fafc',
      '--etu-header': darkHeader,
      '--etu-header-color': '#f8fafc',
      '--card-bg': darkCard,
      '--modal-bg': '#111a2c',
      '--input-bg': '#0d1626',
      '--dropdown-bg': darkCard,
      '--text-primary': '#f8fafc',
      '--color-on-surface': '#f8fafc',
      '--input-color': '#ffffff',
      '--dropdown-color': '#ffffff',
      '--text-secondary': '#cbd5e1',
      '--color-on-surface-variant': '#cbd5e1',
      '--color-heading': darkHeading,
      '--color-bottom': darkBottom,
      '--color-primary': darkPrimary,
      '--button-primary-bg': darkPrimary,
      '--color-secondary': darkSecondary,
      '--card-border': '#24344d',
      '--input-border': '#2d3e5b',
      '--table-header-bg': '#0d1626',
      '--table-header-color': '#38bdf8',
      '--table-bg': darkCard,
      '--table-row-hover': '#1c2b44',
    };

    Object.entries(darkVars).forEach(([varName, value]) => {
      document.documentElement.style.setProperty(varName, value);
    });
    return;
  }

  // LIGHT MODE AUTOMATIC COMBINATION MAPPING
  let fg = colors.textAccent;
  if (fg && getLuminance(fg) > 0.6) {
    fg = '#0f172a';
  }

  let bg = colors.background;
  if (bg && getLuminance(bg) < 0.3) {
    bg = '#f4f7fa';
  }

  const lightVars = {
    '--color-surface': bg || '#f4f7fa',
    '--color-surface-dim': '#e9eef5',
    '--etu-sidebar': '#0a1b30',
    '--etu-sidebar-color': '#f8fafc',
    '--etu-header': '#ffffff',
    '--etu-header-color': '#0f172a',
    '--card-bg': '#ffffff',
    '--modal-bg': '#ffffff',
    '--input-bg': '#ffffff',
    '--dropdown-bg': '#ffffff',
    '--text-primary': fg || '#0f172a',
    '--color-on-surface': fg || '#0f172a',
    '--input-color': '#0f172a',
    '--dropdown-color': '#0f172a',
    '--text-secondary': '#334155',
    '--color-on-surface-variant': '#334155',
    '--color-heading': colors.heading || '#0a2540',
    '--color-bottom': colors.bottom || '#f4f7fa',
    '--color-primary': colors.primary || '#0284c7',
    '--button-primary-bg': colors.primary || '#0284c7',
    '--color-secondary': colors.secondary || '#0d9488',
    '--card-border': '#cbd5e1',
    '--input-border': '#cbd5e1',
    '--table-header-bg': '#f8fafc',
    '--table-header-color': '#0a2540',
    '--table-bg': '#ffffff',
    '--table-row-hover': '#f1f5f9',
  };

  Object.entries(lightVars).forEach(([varName, value]) => {
    document.documentElement.style.setProperty(varName, value);
  });
}

export function resetCustomColors() {
  const mapping = [
    '--color-primary',
    '--color-secondary',
    '--etu-sidebar',
    '--etu-sidebar-color',
    '--etu-header',
    '--etu-header-color',
    '--card-bg',
    '--modal-bg',
    '--input-bg',
    '--dropdown-bg',
    '--button-primary-bg',
    '--color-surface',
    '--color-surface-dim',
    '--text-primary',
    '--color-on-surface',
    '--input-color',
    '--dropdown-color',
    '--text-secondary',
    '--color-on-surface-variant',
    '--color-heading',
    '--color-bottom',
    '--card-border',
    '--input-border',
    '--table-header-bg',
    '--table-header-color',
    '--table-bg',
    '--table-row-hover',
  ];
  mapping.forEach((cssVar) => document.documentElement.style.removeProperty(cssVar));
}

export function PreferencesProvider({ children }) {
  const { user, token, loading } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();
  
  // Backend system setting: Allow Light Theme (Default: false / Mandatory Dark Mode)
  const [allowLightTheme, setAllowLightThemeState] = useState(false);

  const [preferences, setPreferences] = useState(() => ({
    ...defaults,
    ...JSON.parse(localStorage.getItem('etu_preferences') || '{}'),
  }));

  const fetchSystemThemeSettings = useCallback(async () => {
    if (!token || loading) return;
    try {
      const res = await api('/system/theme', { token });
      if (res?.allowLightTheme !== undefined) {
        setAllowLightThemeState(Boolean(res.allowLightTheme));
      }
      if (res?.theme) {
        applyCustomColors(res.theme, preferences.theme || 'dark');
      }
    } catch (_) {
      /* silent */
    }
  }, [token, loading, preferences.theme]);

  useEffect(() => {
    fetchSystemThemeSettings();
    const handleSystemChange = () => fetchSystemThemeSettings();
    subscribe('system:change', handleSystemChange);
    return () => {
      unsubscribe('system:change', handleSystemChange);
    };
  }, [fetchSystemThemeSettings, subscribe, unsubscribe]);

  useEffect(() => {
    if (user?.preferences) {
      setPreferences((current) => ({ ...current, ...user.preferences }));
    }
  }, [user]);

  // Determine whether light theme is accessible for this session
  const canToggleTheme = Boolean(user?.role === 'Admin' || allowLightTheme);

  // Effective active theme: If allowLightTheme is OFF and user is not Admin, force 'dark'
  const effectiveTheme = canToggleTheme ? (preferences.theme || 'dark') : 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
    document.documentElement.lang = preferences.language === 'am' ? 'am' : 'en';
    localStorage.setItem('etu_preferences', JSON.stringify({ ...preferences, theme: effectiveTheme }));

    if (preferences.customTheme) {
      applyCustomColors(preferences.customTheme, effectiveTheme);
    }
  }, [preferences, effectiveTheme]);

  const updatePreferences = useCallback(
    async (updates) => {
      // If attempting to set theme to light when not permitted, force dark
      if (updates.theme === 'light' && !canToggleTheme) {
        updates.theme = 'dark';
      }

      const previous = preferences;
      const next = { ...preferences, ...updates };
      setPreferences(next);
      if (token) {
        try {
          const result = await api('/preferences', {
            token,
            method: 'PATCH',
            body: JSON.stringify(updates),
            isWrite: false, // Theme/Language UI changes never show Green Checkmark
          });
          setPreferences((current) => ({ ...current, ...result.preferences }));
        } catch (error) {
          setPreferences(previous);
          throw error;
        }
      }
    },
    [preferences, token, canToggleTheme]
  );

  const updateAllowLightTheme = useCallback(
    async (enableLight) => {
      if (!token) return;
      const res = await api('/system/allow-light-theme', {
        token,
        method: 'PUT',
        body: JSON.stringify({ allowLightTheme: Boolean(enableLight) }),
      });
      setAllowLightThemeState(Boolean(res.allowLightTheme));
      return res;
    },
    [token]
  );

  const value = useMemo(
    () => ({
      preferences: { ...preferences, theme: effectiveTheme },
      allowLightTheme,
      canToggleTheme,
      updateAllowLightTheme,
      updatePreferences,
      applyCustomColors: (colors) => applyCustomColors(colors, effectiveTheme),
      resetCustomColors,
      t: (key, fallback) => getTranslation(key, preferences.language, fallback),
    }),
    [preferences, effectiveTheme, allowLightTheme, canToggleTheme, updateAllowLightTheme, updatePreferences]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('PreferencesProvider is missing.');
  return context;
};
