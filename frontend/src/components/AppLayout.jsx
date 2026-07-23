import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import Logo from '../assets/Logo.jsx';
import labLogo from '../assets/logo.jpg';

const icon = {
  dashboard: '⌂',
  reception: '⌁',
  collection: '⚗',
  reports: '▤',
  counselling: '☏',
  approvals: '✓',
  stock: '▣',
  patients: '♙',
  samples: '⚗',
  categories: '▦',
  users: '♚',
  settings: '⚙',
  about: 'ℹ',
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { preferences, updatePreferences, t } = usePreferences();
  const [now, setNow] = useState(new Date());
  const [collapsed, setCollapsed] = useState(Boolean(preferences.sidebarCollapsed));
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setCollapsed(Boolean(preferences.sidebarCollapsed)), [preferences.sidebarCollapsed]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const home =
    user.role === 'Reception'
      ? '/reception'
      : user.role === 'Sample Collector'
      ? '/collection'
      : user.role === 'Approver'
      ? '/report-approvals'
      : '/admin';

  const locale = preferences.language === 'am' ? 'am-ET' : 'en-GB';
  const date =
    preferences.dateFormat === 'iso'
      ? now.toISOString().slice(0, 10)
      : now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: preferences.timeFormat === '12',
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    updatePreferences({ sidebarCollapsed: next }).catch(() => setCollapsed(!next));
  };

  const Item = ({ to, name, kind }) => (
    <NavLink to={to} title={name} onClick={() => setMobileOpen(false)}>
      <span aria-hidden="true">{icon[kind]}</span>
      <b>{name}</b>
    </NavLink>
  );

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-sidebar-open' : ''}`}>
      <header className="mobile-header no-print">
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={t('filter')}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Logo size={32} style={{ borderRadius: '6px', background: '#fff', padding: '2px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#d5f1fb' }}>ETU</span>
            <small style={{ fontSize: '0.65rem', opacity: 0.85, color: '#edf8fc' }}>Diagnostic Laboratory</small>
          </div>
        </div>
        <div className="mobile-tools">
          <NotificationBell />
        </div>
      </header>

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size={40} style={{ borderRadius: '8px', background: '#fff', padding: '2px', flexShrink: 0 }} />
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#d5f1fb', letterSpacing: '0.5px' }}>ETU</span>
              <small style={{ fontSize: '0.7rem', opacity: 0.85, color: '#edf8fc' }}>Diagnostic Laboratory</small>
            </div>
          )}
        </div>
        <nav aria-label="Primary navigation">
          <button className="sidebar-collapse" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggle}>
            {collapsed ? '›' : '‹'}
          </button>

          <Item to={home} name={t('dashboard')} kind="dashboard" />
          {user.role === 'Reception' && <Item to="/reception" name={t('reception')} kind="reception" />}
          {user.role === 'Sample Collector' && (
            <>
              <Item to="/collection" name={t('collection')} kind="collection" />
              <Item to="/report-management" name={t('reports')} kind="reports" />
              <Item to="/counselling" name={t('counselling')} kind="counselling" />
            </>
          )}
          {['Admin', 'Reception'].includes(user.role) && <Item to="/counselling" name={t('counselling')} kind="counselling" />}
          {user.role === 'Admin' && <Item to="/extra-requests" name={t('extraRequests')} kind="approvals" />}
          {user.role === 'Approver' && <Item to="/report-approvals" name={t('approvals')} kind="approvals" />}
          {['Admin', 'Reception'].includes(user.role) && <Item to="/stock" name={t('stock')} kind="stock" />}
          {user.role === 'Admin' && (
            <>
              <Item to="/admin-reports" name={t('reports')} kind="reports" />
              <Item to="/patient-management" name={t('patients')} kind="patients" />
              <Item to="/laboratory-tests" name={t('labTests')} kind="samples" />
              <Item to="/categories" name={t('categories')} kind="categories" />
              <Item to="/users" name={t('users')} kind="users" />
              <Item to="/settings" name={t('settings')} kind="settings" />
            </>
          )}
          <Item to="/about" name={t('about')} kind="about" />
        </nav>

        <div className="sidebar-mobile-tools">
          <button
            className="mobile-tool-btn"
            title={t('language')}
            onClick={() => updatePreferences({ language: preferences.language === 'en' ? 'am' : 'en' })}
          >
            🌐 <span>{preferences.language === 'en' ? 'English' : 'አማርኛ'}</span>
          </button>
          <button
            className="mobile-tool-btn"
            title={t('theme')}
            onClick={() => updatePreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' })}
          >
            <span>{preferences.theme === 'light' ? t('dark') : t('light')}</span>
          </button>
          <button className="mobile-logout-btn" onClick={logout}>
            <span>{t('signOut')}</span>
          </button>
        </div>

        <div className="user-card">
          <strong>{user.fullName}</strong>
          <span>{t(user.role)}</span>
        </div>
      </aside>

      <main>
        <header className="top-navigation no-print">
          <div className="main-header-logo-container">
            <div className="main-header-logo-wrapper" title="ETU Diagnostic Laboratory">
              <span className="main-header-logo-glow"></span>
              <span className="main-header-logo-ripple"></span>
              <img src={labLogo} alt="ETU Diagnostic Laboratory Logo" className="main-header-logo-img" />
            </div>
            <span className="main-header-logo-title">ETU Diagnostic Laboratory</span>
          </div>
          <span className="clock">
            {date} · {time}
          </span>
          <div className="top-tools">
            <NotificationBell />
            <button
              className="tool-button"
              title={t('language')}
              onClick={() => updatePreferences({ language: preferences.language === 'en' ? 'am' : 'en' })}
            >
              {preferences.language === 'en' ? 'EN' : 'አማ'}
            </button>
            <button
              className="tool-button"
              title={t('theme')}
              onClick={() => updatePreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' })}
            >
              {preferences.theme === 'light' ? '◐' : '☀'}
            </button>
            <span className="profile-chip" title={`${user.fullName} — ${t(user.role)}`}>
              ♙ <b>{user.fullName}</b> ({t(user.role)})
            </span>
            <button className="logout-button" onClick={logout}>
              {t('signOut')}
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
