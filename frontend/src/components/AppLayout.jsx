import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import AccountSettingsModal from './AccountSettingsModal.jsx';

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
  pathology: '🔬',
  radiology: '🩻',
  expenses: '💰',
  payroll: '💳',
};

const INITIAL_COLLAPSE_DELAY = 4000; // 4 seconds after login/load
const LEAVE_COLLAPSE_DELAY = 3500;   // 3.5 seconds after mouse leave

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { preferences, updatePreferences, canToggleTheme, t } = usePreferences();
  const location = useLocation();
  const HERO_ROUTES = ['/admin', '/', '/reception', '/collection', '/report-approvals', '/pathology', '/radiology'];
  const isDashboard = HERO_ROUTES.includes(location.pathname);
  const [now, setNow] = useState(new Date());
  
  // Sidebar starts fully expanded after login/load
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const collapseTimerRef = useRef(null);

  // Initial load: keep expanded for 4 seconds, then smoothly auto-collapse
  useEffect(() => {
    collapseTimerRef.current = setTimeout(() => {
      setIsCollapsed(true);
    }, INITIAL_COLLAPSE_DELAY);

    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onToggle = () => setMobileOpen(prev => !prev);
    const onOpenAccount = () => setAccountModalOpen(true);
    window.addEventListener('toggle-mobile-sidebar', onToggle);
    window.addEventListener('open-account-settings', onOpenAccount);
    return () => {
      window.removeEventListener('toggle-mobile-sidebar', onToggle);
      window.removeEventListener('open-account-settings', onOpenAccount);
    };
  }, []);

  // Mouse enters sidebar: immediately start smooth expansion with NO delay
  const handleMouseEnter = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setIsHovered(true);
  };

  // Mouse leaves sidebar: wait 3.5s before smoothly auto-collapsing
  const handleMouseLeave = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
    collapseTimerRef.current = setTimeout(() => {
      setIsHovered(false);
      setIsCollapsed(true);
    }, LEAVE_COLLAPSE_DELAY);
  };

  const isEffectiveCollapsed = isCollapsed && !isHovered;

  const handleToggle = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    if (isEffectiveCollapsed) {
      setIsCollapsed(false);
      setIsHovered(true);
    } else {
      setIsCollapsed(true);
      setIsHovered(false);
    }
  };

  const home =
    user.role === 'Reception'
      ? '/reception'
      : user.role === 'Sample Collector'
      ? '/collection'
      : user.role === 'Approver'
      ? '/report-approvals'
      : user.role === 'Pathologist'
      ? '/pathology'
      : user.role === 'Radiologist'
      ? '/radiology'
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

  const Item = ({ to, name, kind }) => (
    <NavLink to={to} title={name} onClick={() => setMobileOpen(false)}>
      <span aria-hidden="true">{icon[kind]}</span>
      <b>{name}</b>
    </NavLink>
  );

  return (
    <div className={`app-shell ${isEffectiveCollapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-sidebar-open' : ''} ${isDashboard ? 'is-dashboard-route' : ''}`}>
      {/* 
        Mobile header: completely omitted on dashboard so Mobile Hero is the sole, topmost header element.
        On other mobile pages, the standard mobile header is preserved.
      */}
      {!isDashboard && (
        <header className="mobile-header no-print">
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-sidebar"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#d5f1fb', letterSpacing: '0.5px' }}>ETU</span>
              <small style={{ fontSize: '0.68rem', opacity: 0.9, color: '#edf8fc' }}>Diagnostic Laboratory</small>
            </div>
          </div>
          <div className="mobile-tools">
            <NotificationBell />
          </div>
        </header>
      )}

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside
        id="mobile-sidebar"
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        <div className="brand" style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1.15rem' }}>
          <div className="brand-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#d5f1fb', letterSpacing: '0.5px' }}>ETU</span>
            <small style={{ fontSize: '0.72rem', opacity: 0.9, color: '#edf8fc', display: 'block' }}>Diagnostic Laboratory</small>
          </div>
        </div>
        <nav aria-label="Primary navigation">
          <button
            className="sidebar-collapse"
            title={isEffectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={handleToggle}
          >
            {isEffectiveCollapsed ? '›' : '‹'}
          </button>

          <Item to={home} name={t('dashboard')} kind="dashboard" />
          {user.role === 'Reception' && <Item to="/reception" name={t('reception')} kind="reception" />}
          {user.role === 'Sample Collector' && (
            <>
              <Item to="/investigation" name="Investigation (Self Aware)" kind="samples" />
              <Item to="/collection" name={t('collection')} kind="collection" />
              <Item to="/report-management" name={t('reports')} kind="reports" />
              <Item to="/counselling" name={t('counselling')} kind="counselling" />
            </>
          )}
          {user.role === 'Pathologist' && <Item to="/pathology" name="Pathology Queue" kind="pathology" />}
          {user.role === 'Radiologist' && <Item to="/radiology" name="Radiology Queue" kind="radiology" />}
          {['Admin', 'Reception'].includes(user.role) && <Item to="/counselling" name={t('counselling')} kind="counselling" />}
          {user.role === 'Reception' && <Item to="/expenses" name="Expenses" kind="expenses" />}
          {['Admin', 'Sub Admin'].includes(user.role) && <Item to="/extra-requests" name={t('extraRequests')} kind="approvals" />}
          {user.role === 'Approver' && <Item to="/report-approvals" name={t('approvals')} kind="approvals" />}
          {['Admin', 'Sub Admin', 'Reception'].includes(user.role) && <Item to="/stock" name={t('stock')} kind="stock" />}
          {['Admin', 'Sub Admin'].includes(user.role) && <Item to="/admin-reports" name={t('reports')} kind="reports" />}
          {['Admin', 'Sub Admin'].includes(user.role) && <Item to="/report-transaction-management" name={t('reportTransactionManagement')} kind="reports" />}
          {['Admin', 'Sub Admin'].includes(user.role) && <Item to="/admin-expenses" name="Expenses" kind="expenses" />}
          {['Admin', 'Sub Admin'].includes(user.role) && <Item to="/payroll" name={t('payroll') || 'Payroll Management'} kind="payroll" />}
          {['Admin', 'Sub Admin'].includes(user.role) && <Item to="/laboratory-tests" name={t('labTests')} kind="samples" />}
          {['Admin', 'Sub Admin'].includes(user.role) && (
            <>
              <Item to="/admin-pathology" name="Pathology" kind="pathology" />
              <Item to="/admin-radiology" name="Radiology" kind="radiology" />
            </>
          )}
          {user.role === 'Admin' && (
            <>
              <Item to="/patient-management" name={t('patients')} kind="patients" />
              <Item to="/categories" name={t('categories')} kind="categories" />
              <Item to="/users" name={t('users')} kind="users" />
              <Item to="/settings" name={t('settings')} kind="settings" />
            </>
          )}
          <Item to="/about" name={t('about')} kind="about" />
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-mobile-tools">
            <button
              className="mobile-tool-btn"
              title="Account Settings"
              onClick={() => setAccountModalOpen(true)}
            >
              ⚙️ <span>Account Settings</span>
            </button>
            <button
              className="mobile-tool-btn"
              title={t('language')}
              onClick={() => updatePreferences({ language: preferences.language === 'en' ? 'am' : 'en' })}
            >
              🌐 <span>{preferences.language === 'en' ? 'English' : 'አማርኛ'}</span>
            </button>
            {canToggleTheme && (
              <button
                className="mobile-tool-btn"
                title={t('theme')}
                onClick={() => updatePreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' })}
              >
                <span>{preferences.theme === 'light' ? t('dark') : t('light')}</span>
              </button>
            )}
            <button className="mobile-logout-btn" onClick={logout}>
              <span>{t('signOut')}</span>
            </button>
          </div>

          <div className="user-card">
            <div
              className="user-card-info"
              onClick={() => setAccountModalOpen(true)}
              style={{ cursor: 'pointer' }}
              title="Click to open Account Settings"
            >
              <strong>{user.fullName}</strong>
              <span>{t(user.role)} • 📍 {user.branchName || 'Main'}</span>
            </div>
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={() => setAccountModalOpen(true)}
              title="Account Settings"
              aria-label="Account Settings"
              style={{ marginRight: '4px' }}
            >
              <span aria-hidden="true">⚙️</span>
            </button>
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={logout}
              title={t('signOut')}
              aria-label={t('signOut')}
            >
              <span aria-hidden="true">⎋</span>
              <span>{t('signOut')}</span>
            </button>
          </div>
        </div>
      </aside>

      <main className={`main-layout ${isDashboard ? 'dashboard-main' : ''}`}>
        {!isDashboard && (
          <header className="top-navigation no-print">
            <div className="main-header-logo-container">
              <span className="main-header-logo-title">ETU Diagnostic Laboratory</span>
            </div>
            <span className="clock">
              {date} · {time}
            </span>
            <div className="top-tools">
              <NotificationBell />
              <button
                className="tool-button lang-toggle-btn"
                title={t('language')}
                onClick={() => updatePreferences({ language: preferences.language === 'en' ? 'am' : 'en' })}
              >
                {preferences.language === 'en' ? 'EN' : 'አማ'}
              </button>
              {canToggleTheme && (
                <button
                  className="tool-button theme-toggle-btn"
                  title={t('theme')}
                  onClick={() => updatePreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' })}
                >
                  {preferences.theme === 'light' ? '◐' : '☀'}
                </button>
              )}
              <button
                type="button"
                className="tool-button account-settings-btn"
                title="Account Settings (Change Username & Password)"
                onClick={() => setAccountModalOpen(true)}
                style={{ fontSize: '1rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ⚙️
              </button>
              <span
                className="profile-chip"
                onClick={() => setAccountModalOpen(true)}
                style={{ cursor: 'pointer' }}
                title={`${user.fullName} — ${t(user.role)} (${user.branchName || 'Main'} Branch) • Click to open Account Settings`}
              >
                ♙ <b>{user.fullName}</b> <span className="profile-role">({t(user.role)})</span> <small style={{ marginLeft: '4px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>📍 {user.branchName || 'Main'}</small>
              </span>
              <button className="logout-button" onClick={logout}>
                {t('signOut')}
              </button>
            </div>
          </header>
        )}
        <Outlet />
      </main>

      {/* Self-Service Account Settings Modal for All Roles */}
      <AccountSettingsModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
      />
    </div>
  );
}
