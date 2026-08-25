import { useEffect, useState } from 'react';
import { usePreferences } from '../context/PreferencesContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api, isSilentNetworkError } from '../api/client.js';
import '../styles/pages/settings.css';

const defaults={textAccent:'#19313b',background:'#f4f8fb',heading:'#075c91',bottom:'#e4eef5',primary:'#0873a2',secondary:'#126e98',sidebar:'#093f5d',card:'#ffffff',header:'#ffffff',button:'#0873a2',scope:'all'};
const autoCombination={textAccent:'#0f172a',background:'#f8fafc',heading:'#0369a1',bottom:'#e2e8f0',primary:'#0284c7',secondary:'#0f766e',sidebar:'#0f172a',card:'#ffffff',header:'#ffffff',button:'#0284c7',scope:'all'};
const options=[['stock','Reset Stock Quantities Only'],['patients','Delete Patient History'],['counselling','Delete Counseling History'],['reports','Delete Laboratory Report History'],['drafts','Delete Sample Collector Draft Reports'],['extraRequests','Delete Extra Stock Requests'],['approvalRequests','Delete Report Approval Requests'],['transactions','Delete Financial Transactions'],['notifications','Delete Notification History']];

const labels = {
  textAccent: 'Foreground Color',
  background: 'Background Color',
  heading: 'Heading Color',
  bottom: 'Bottom Color',
  primary: 'Primary Color',
  secondary: 'Secondary Color',
  sidebar: 'Sidebar Color',
  header: 'Header Background',
  card: 'Card & Modal Surface',
  button: 'Button Accent',
};

export default function SettingsPage() {
  const { preferences, updatePreferences, applyCustomColors, resetCustomColors, t } = usePreferences();
  const { token } = useAuth();
  const [theme, setTheme] = useState(defaults);
  const [selected, setSelected] = useState([]);
  const [password, setPassword] = useState('');
  const [secondPassword, setSecondPassword] = useState('');
  const [phrase, setPhrase] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [publicSharing, setPublicSharing] = useState({
    enabled: true,
    autoGenerateOnApproval: true,
    defaultExpiryDays: 30,
    allowPdfDownload: true
  });

  useEffect(() => {
    if (preferences.customTheme) {
      setTheme(prev => ({ ...prev, ...preferences.customTheme }));
    } else if (token) {
      api('/system/theme', { token })
        .then((res) => {
          if (res?.theme) setTheme(prev => ({ ...prev, ...res.theme }));
        })
        .catch(() => {});
    }

    if (token) {
      api('/system/public-sharing', { token })
        .then(res => {
          if (res?.publicReportSharing) setPublicSharing(res.publicReportSharing);
        })
        .catch(() => {});
    }
  }, [preferences, token]);

  const savePublicSharing = async () => {
    try {
      const res = await api('/system/public-sharing', {
        token,
        method: 'PUT',
        body: JSON.stringify(publicSharing)
      });
      if (res?.publicReportSharing) setPublicSharing(res.publicReportSharing);
      setNotice('Public report sharing settings updated successfully.');
    } catch (e) {
      if (!isSilentNetworkError(e)) setNotice(e.message || 'Failed to update public sharing settings.');
    }
  };

  const toggle = key => setSelected(v => v.includes(key) ? v.filter(x => x !== key) : [...v, key]);

  const handleColorChange = (key, val) => {
    const next = { ...theme, [key]: val };
    setTheme(next);
    applyCustomColors(next);
  };

  const resetTheme = async () => {
    try {
      resetCustomColors();
      setTheme(defaults);
      if (token) {
        await api('/system/theme', {
          token,
          method: 'PUT',
          body: JSON.stringify({ ...defaults, scope: theme.scope || 'all' })
        });
      }
      await updatePreferences({ customTheme: null });
      setNotice('Theme colors successfully reset to original default combinations.');
    } catch (e) {
      if (!isSilentNetworkError(e)) setNotice(e.message || 'Error resetting theme colors.');
    }
  };

  const applyAutoCombination = async () => {
    try {
      const next = { ...theme, ...autoCombination, scope: theme.scope || 'all' };
      setTheme(next);
      applyCustomColors(next);
      if (token) {
        await api('/system/theme', {
          token,
          method: 'PUT',
          body: JSON.stringify(next)
        });
      }
      if (theme.scope === 'me') {
        await updatePreferences({ customTheme: next });
      }
      setNotice('Automatic Combination applied successfully with optimal medical laboratory color palette.');
    } catch (e) {
      if (!isSilentNetworkError(e)) setNotice(e.message || 'Error applying automatic combination.');
    }
  };

  const previewReset = async () => {
    setBusy(true);
    try {
      setPreview(await api('/system/reset/preview', { token, method: 'POST', body: JSON.stringify({ password, selected }) }));
      setNotice('Password verified. Review the records below.');
    } catch (e) {
      if (!isSilentNetworkError(e)) setNotice(e.message);
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    setBusy(true);
    try {
      setResult(await api('/system/reset/execute', { token, method: 'POST', body: JSON.stringify({ password, secondPassword, phrase, selected }) }));
      setPreview(null);
    } catch (e) {
      if (!isSilentNetworkError(e)) setNotice(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveTheme = async () => {
    try {
      const r = await api('/system/theme', { token, method: 'PUT', body: JSON.stringify(theme) });
      applyCustomColors(r.theme);
      if (theme.scope === 'me') await updatePreferences({ customTheme: r.theme });
      setNotice(theme.scope === 'all' ? 'System theme saved for all users.' : 'Your personal theme has been saved.');
    } catch (e) {
      if (!isSilentNetworkError(e)) setNotice(e.message);
    }
  };

  return (
    <div className="page settings-page">
      <p className="eyebrow">{t('preferences')}</p>
      <h1>Settings</h1>
      <p className="intro">Manage laboratory interface preferences and protected operational reset tools.</p>
      {notice && <div className="alert success">{notice}</div>}
      
      <section className="settings-card">
        <h2>Personal display</h2>
        <div className="setting-options">
          <button className={preferences.theme === 'light' ? 'selected' : ''} onClick={() => updatePreferences({ theme: 'light' })}>
            ☀ <b>Light mode</b>
          </button>
          <button className={preferences.theme === 'dark' ? 'selected' : ''} onClick={() => updatePreferences({ theme: 'dark' })}>
            ◐ <b>Dark mode</b>
          </button>
        </div>
        <div className="settings-fields">
          <label>Time format
            <select value={preferences.timeFormat} onChange={e => updatePreferences({ timeFormat: e.target.value })}>
              <option value="24">24-hour clock</option>
              <option value="12">12-hour clock</option>
            </select>
          </label>
          <label>Date format
            <select value={preferences.dateFormat} onChange={e => updatePreferences({ dateFormat: e.target.value })}>
              <option value="locale">Local format</option>
              <option value="iso">YYYY-MM-DD</option>
            </select>
          </label>
        </div>
      </section>

      <section className="settings-card">
        <h2>System Color Customization</h2>
        <p className="intro" style={{ marginBottom: '1rem' }}>Customize foreground, background, heading, bottom, accent, sidebar, and header colors with real-time live preview.</p>
        <div className="theme-colors" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {['textAccent', 'background', 'heading', 'bottom', 'primary', 'secondary', 'sidebar', 'header', 'card', 'button'].map((key) => theme[key] !== undefined ? (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>{labels[key] || key}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="color" value={theme[key]} onChange={e => handleColorChange(key, e.target.value)} style={{ width: '40px', height: '36px', padding: 0, cursor: 'pointer', border: 'none', borderRadius: '4px' }} />
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{theme[key]}</span>
              </div>
            </label>
          ) : null)}
        </div>
        <div className="settings-fields" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: '200px' }}>Apply to
            <select value={theme.scope} onChange={e => setTheme({ ...theme, scope: e.target.value })}>
              <option value="me">Only my account</option>
              <option value="all">All users</option>
            </select>
          </label>
          <div className="form-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="primary" onClick={saveTheme}>Apply Settings</button>
            <button className="secondary" onClick={applyAutoCombination} style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', borderColor: 'var(--color-primary)' }}>
              ⚡ Automatic Combination
            </button>
            <button className="secondary" onClick={resetTheme}>Reset to Default</button>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <h2>🌐 Public Report Sharing System</h2>
        <p className="intro" style={{ marginBottom: '1rem' }}>Configure automated token generation, expiry policy, and patient PDF download capabilities for approved laboratory reports.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer', background: 'var(--color-surface-container, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-outline-variant, #e2e8f0)' }}>
            <input
              type="checkbox"
              checked={publicSharing.enabled}
              onChange={e => setPublicSharing(p => ({ ...p, enabled: e.target.checked }))}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span><strong>Enable Public Sharing</strong><br/><small style={{ color: 'var(--text-secondary)' }}>Allow unauthenticated public link access to approved reports.</small></span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer', background: 'var(--color-surface-container, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-outline-variant, #e2e8f0)' }}>
            <input
              type="checkbox"
              checked={publicSharing.autoGenerateOnApproval}
              onChange={e => setPublicSharing(p => ({ ...p, autoGenerateOnApproval: e.target.checked }))}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span><strong>Auto-Generate on Approval</strong><br/><small style={{ color: 'var(--text-secondary)' }}>Automatically issue secure token when report is approved.</small></span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer', background: 'var(--color-surface-container, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-outline-variant, #e2e8f0)' }}>
            <input
              type="checkbox"
              checked={publicSharing.allowPdfDownload}
              onChange={e => setPublicSharing(p => ({ ...p, allowPdfDownload: e.target.checked }))}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span><strong>Allow PDF Download</strong><br/><small style={{ color: 'var(--text-secondary)' }}>Enable public viewers to download PDF copies.</small></span>
          </label>
        </div>

        <div className="settings-fields" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: '220px' }}>Default Expiry Duration (Days)
            <input
              type="number"
              min="0"
              max="365"
              value={publicSharing.defaultExpiryDays}
              onChange={e => setPublicSharing(p => ({ ...p, defaultExpiryDays: parseInt(e.target.value) || 0 }))}
              style={{ width: '100%', marginTop: '4px' }}
            />
            <small style={{ color: 'var(--text-secondary)' }}>0 = No expiration</small>
          </label>

          <div className="form-actions">
            <button className="primary" onClick={savePublicSharing}>Save Sharing Settings</button>
          </div>
        </div>
      </section>

      <section className="settings-card danger-zone">
        <h2>⚠ Database Reset Center</h2>
        <p>Danger zone — master data, users, roles, stock items, categories, sample types, hospitals, equipment, and system settings are never reset.</p>
        {result ? (
          <div className="reset-complete">
            <strong>✓ {result.message}</strong>
            <p>{result.total.toLocaleString()} selected records processed. An audit entry was recorded.</p>
          </div>
        ) : (
          <>
            <div className="reset-steps">
              <span className={!preview ? 'current' : 'done'}>1 Select</span>
              <span className={preview ? 'current' : ''}>2 Preview</span>
              <span className={preview ? 'current' : ''}>3 Confirm</span>
              <span>4 Reset</span>
            </div>
            <div className="reset-options">
              {options.map(([key, label]) => (
                <label key={key} className={selected.includes(key) ? 'checked' : ''}>
                  <input type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} />
                  <span><b>{label}</b></span>
                </label>
              ))}
            </div>
            {!preview ? (
              <div className="reset-gate">
                <label>Admin password
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
                </label>
                <button className="secondary" disabled={!selected.length || !password || busy} onClick={previewReset}>
                  {busy ? 'Verifying…' : 'Verify password and preview'}
                </button>
              </div>
            ) : (
              <div className="reset-preview">
                <h3>Warning — review before continuing</h3>
                {preview.selected.map(item => (
                  <div className="preview-row" key={item.key}>
                    <span>{item.label}</span>
                    <strong>{item.count.toLocaleString()} records</strong>
                  </div>
                ))}
                <label>Type exactly <code>UNDERSTOOD AND CONTINUE RESETTING</code>
                  <input value={phrase} onPaste={e => e.preventDefault()} onChange={e => setPhrase(e.target.value)} />
                </label>
                <label>Final admin password confirmation
                  <input type="password" value={secondPassword} onChange={e => setSecondPassword(e.target.value)} autoComplete="current-password" />
                </label>
                <div className="reset-actions">
                  <button className="secondary" onClick={() => setPreview(null)}>Back</button>
                  <button className="danger-button" disabled={busy || phrase !== 'UNDERSTOOD AND CONTINUE RESETTING' || !secondPassword} onClick={execute}>
                    {busy ? 'Resetting selected data…' : 'Permanently reset selected data'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
