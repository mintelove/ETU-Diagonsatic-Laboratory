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

export function PreferencesProvider({ children }) {
  const { user, token } = useAuth();
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
  }, [preferences]);

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
