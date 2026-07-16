import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import NotificationBell from './NotificationBell.jsx';
const icon={dashboard:'⌂',reception:'⌁',collection:'⚗',reports:'▤',counselling:'☏',approvals:'✓',stock:'▣',patients:'♙',samples:'⚗',categories:'▦',users:'♚',settings:'⚙'};
export default function AppLayout(){
  const {user,logout}=useAuth();
  const {preferences,updatePreferences,t}=usePreferences();
  const [now,setNow]=useState(new Date());
  const [collapsed,setCollapsed]=useState(Boolean(preferences.sidebarCollapsed));
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(()=>setCollapsed(Boolean(preferences.sidebarCollapsed)),[preferences.sidebarCollapsed]);
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(timer)},[]);

  const home=user.role==='Reception'?'/reception':user.role==='Sample Collector'?'/collection':user.role==='Approver'?'/report-approvals':'/admin';
  const locale=preferences.language==='am'?'am-ET':'en-GB';
  const date=preferences.dateFormat==='iso'?now.toISOString().slice(0,10):now.toLocaleDateString(locale,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const time=now.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:preferences.timeFormat==='12'});

  const toggle=()=>{
    const next=!collapsed;
    setCollapsed(next);
    updatePreferences({sidebarCollapsed:next}).catch(()=>setCollapsed(!next));
  };

  const Item=({to,name,kind})=><NavLink to={to} title={name} onClick={() => setMobileOpen(false)}><span aria-hidden="true">{icon[kind]}</span><b>{name}</b></NavLink>;

  return (
    <div className={`app-shell ${collapsed?'sidebar-collapsed':''} ${mobileOpen ? 'mobile-sidebar-open' : ''}`}>
      <header className="mobile-header no-print">
        <button className="mobile-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? '✕' : '☰'}
        </button>
        <div className="brand">
          <span>ETU</span>
          <small>Diagnostic Laboratory</small>
        </div>
        <div className="mobile-tools">
          <NotificationBell />
        </div>
      </header>

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <span>ETU</span>
          <small>Diagnostic Laboratory</small>
        </div>
        <nav aria-label="Primary navigation">
          <button className="sidebar-collapse" title={collapsed?'Expand sidebar':'Collapse sidebar'} onClick={toggle}>{collapsed?'›':'‹'}</button>
          <Item to={home} name="Dashboard" kind="dashboard"/>
          {user.role==='Reception'&&<Item to="/reception" name="Reception" kind="reception"/>}
          {user.role==='Sample Collector'&&<>
            <Item to="/collection" name="Sample Collector" kind="collection"/>
            <Item to="/report-management" name="Report Management" kind="reports"/>
            <Item to="/counselling" name="Counseling" kind="counselling"/>
          </>}
          {['Admin','Reception'].includes(user.role)&&<Item to="/counselling" name="Counseling" kind="counselling"/>}
          {user.role==='Admin'&&<Item to="/extra-requests" name="Approval Center" kind="approvals"/>}
          {user.role==='Approver'&&<Item to="/report-approvals" name="Approver" kind="approvals"/>}
          {['Admin','Reception'].includes(user.role)&&<Item to="/stock" name="Stock Management" kind="stock"/>}
          {user.role==='Admin'&&<>
            <Item to="/patient-management" name="Patient Management" kind="patients"/>
            <Item to="/sample-types" name="Sample Types" kind="samples"/>
            <Item to="/categories" name="Stock Categories" kind="categories"/>
            <Item to="/users" name="User Management" kind="users"/>
            <Item to="/settings" name="Settings" kind="settings"/>
          </>}
        </nav>

        <div className="sidebar-mobile-tools">
          <button className="mobile-tool-btn" title={t('language')} onClick={()=>updatePreferences({language:preferences.language==='en'?'am':'en'})}>
            🌐 <span>{preferences.language==='en'?'English (EN)':'አማርኛ (አማ)'}</span>
          </button>
          <button className="mobile-tool-btn" title={t('theme')} onClick={()=>updatePreferences({theme:preferences.theme==='light'?'dark':'light'})}>
            <span>{preferences.theme==='light'?'◐ Dark Theme':'☀ Light Theme'}</span>
          </button>
          <button className="mobile-logout-btn" onClick={logout}>
            <span>Log out</span>
          </button>
        </div>

        <div className="user-card">
          <strong>{user.fullName}</strong>
          <span>{user.role}</span>
        </div>
      </aside>

      <main>
        <header className="top-navigation no-print">
          <span className="clock">{date} · {time}</span>
          <div className="top-tools">
            <NotificationBell/>
            <button className="tool-button" title={t('language')} onClick={()=>updatePreferences({language:preferences.language==='en'?'am':'en'})}>{preferences.language==='en'?'EN':'አማ'}</button>
            <button className="tool-button" title={t('theme')} onClick={()=>updatePreferences({theme:preferences.theme==='light'?'dark':'light'})}>{preferences.theme==='light'?'◐':'☀'}</button>
            <span className="profile-chip" title={`${user.fullName} — ${user.role}`}>♙ <b>{user.fullName}</b></span>
            <button className="logout-button" onClick={logout}>Log out</button>
          </div>
        </header>
        <Outlet/>
      </main>
    </div>
  );
}

