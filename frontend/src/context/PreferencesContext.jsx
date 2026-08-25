import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { getTranslation } from '../utils/translations.js';

const PreferencesContext = createContext(null);

const defaults = {
  theme: 'light',
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

export function applyCustomColors(colors, currentThemeMode = document.documentElement.dataset.theme || 'light') {
  if (!colors || typeof colors !== 'object') return;

  const isDark = currentThemeMode === 'dark';

  if (isDark) {
    // DARK MODE AUTOMATIC COMBINATION MAPPING
    const darkMainBg = colors.background && getLuminance(colors.background) < 0.25 ? colors.background : '#090e15';
    const darkSidebar = colors.sidebar && getLuminance(colors.sidebar) < 0.35 ? colors.sidebar : '#0f172a';
    const darkHeader = colors.header && getLuminance(colors.header) < 0.35 ? colors.header : '#1e293b';
    const darkCard = colors.card && getLuminance(colors.card) < 0.35 ? colors.card : '#1e293b';
    const darkHeading = colors.heading || '#38bdf8';
    const darkBottom = colors.bottom || '#1e293b';
    const darkPrimary = colors.primary || '#38bdf8';
    const darkSecondary = colors.secondary || '#2dd4bf';

    const darkVars = {
      '--color-surface': darkMainBg,
      '--color-surface-dim': darkMainBg,
      '--etu-sidebar': darkSidebar,
      '--etu-sidebar-color': '#f8fafc',
      '--etu-header': darkHeader,
      '--etu-header-color': '#f8fafc',
      '--card-bg': darkCard,
      '--modal-bg': darkCard,
      '--input-bg': '#16202c',
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
      '--card-border': '#334155',
      '--input-border': '#475569',
      '--table-header-bg': '#1e293b',
      '--table-header-color': '#38bdf8',
      '--table-bg': darkCard,
      '--table-row-hover': '#243346',
    };

    Object.entries(darkVars).forEach(([varName, value]) => {
      document.documentElement.style.setProperty(varName, value);
    });
    return;
  }

  // Light mode remains 100% unchanged
  let fg = colors.textAccent;
  if (fg && getLuminance(fg) > 0.6) {
    fg = '#0f172a';
  }

  let bg = colors.background;
  if (bg && getLuminance(bg) < 0.3) {
    bg = '#f4f8fb';
  }

  const propertyMapping = {
    primary: ['--color-primary', '--button-primary-bg'],
    secondary: ['--color-secondary'],
    sidebar: ['--etu-sidebar'],
    header: ['--etu-header'],
    card: ['--card-bg', '--modal-bg', '--input-bg', '--dropdown-bg'],
    button: ['--button-primary-bg'],
    background: ['--color-surface', '--color-surface-dim'],
    textAccent: ['--text-primary', '--color-on-surface', '--input-color', '--dropdown-color'],
    heading: ['--color-heading'],
    bottom: ['--color-bottom'],
  };

  const resolved = {
    ...colors,
    ...(fg ? { textAccent: fg } : {}),
    ...(bg ? { background: bg } : {}),
  };

  Object.entries(propertyMapping).forEach(([key, cssVars]) => {
    if (resolved[key]) {
      cssVars.forEach((varName) => {
        document.documentElement.style.setProperty(varName, resolved[key]);
      });
    }
  });
}

export function resetCustomColors() {
  const mapping = [
    '--color-primary',
    '--color-secondary',
    '--etu-sidebar',
    '--etu-header',
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
    '--color-heading',
    '--color-bottom',
  ];
  mapping.forEach((cssVar) => document.documentElement.style.removeProperty(cssVar));
}

export function PreferencesProvider({ children }) {
  const { user, token, loading } = useAuth();
  const [preferences, setPreferences] = useState(() => ({
    ...defaults,
    ...JSON.parse(localStorage.getItem('etu_preferences') || '{}'),
  }));

  useEffect(() => {
    if (user?.preferences) {
      setPreferences((current) => ({ ...current, ...user.preferences }));
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.lang = preferences.language === 'am' ? 'am' : 'en';
    localStorage.setItem('etu_preferences', JSON.stringify(preferences));

    if (preferences.customTheme) {
      applyCustomColors(preferences.customTheme, preferences.theme);
    } else if (token && !loading) {
      api('/system/theme', { token })
        .then((res) => {
          if (res?.theme) applyCustomColors(res.theme, preferences.theme);
        })
        .catch(() => {});
    }
  }, [preferences, token, loading]);

  const updatePreferences = useCallback(
    async (updates) => {
      const previous = preferences;
      const next = { ...preferences, ...updates };
      setPreferences(next);
      if (token) {
        try {
          const result = await api('/preferences', {
            token,
            method: 'PATCH',
            body: JSON.stringify(updates),
            isWrite: false, // Option 2: Theme/Language UI changes never show Green Checkmark
          });
          setPreferences((current) => ({ ...current, ...result.preferences }));
        } catch (error) {
          setPreferences(previous);
          throw error;
        }
      }
    },
    [preferences, token]
  );

  const value = useMemo(
    () => ({
      preferences,
      updatePreferences,
      applyCustomColors: (colors) => applyCustomColors(colors, preferences.theme),
      resetCustomColors,
      t: (key, fallback) => getTranslation(key, preferences.language, fallback),
    }),
    [preferences, updatePreferences]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('PreferencesProvider is missing.');
  return context;
};
