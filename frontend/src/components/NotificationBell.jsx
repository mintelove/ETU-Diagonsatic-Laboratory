import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';

export default function NotificationBell() {
  const { token, user } = useAuth();
  const { subscribe, unsubscribe } = useRealtime();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const requestInFlight = useRef(false);
  const go = useNavigate();
  const load = useCallback(async (signal) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    try {
      const next = await api('/notifications', { token, signal });
      if (!signal?.aborted) setData(next);
    } catch {
      // Notification polling is non-blocking; the next scheduled attempt recovers.
    } finally {
      requestInFlight.current = false;
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const id = setInterval(() => load(controller.signal), 15000);
    return () => { controller.abort(); clearInterval(id); };
  }, [load]);

  useEffect(() => {
    const cb = () => load();
    subscribe('notifications:change', cb);
    return () => unsubscribe('notifications:change', cb);
  }, [subscribe, unsubscribe, load]);

  const read = async notification => {
    try {
      await api(`/notifications/${notification._id}/read`, { token, method: 'PATCH' });
      load(); setOpen(false);
      go(notification.entityType === 'ExtraStockRequest' || user.role === 'Admin' ? '/extra-requests' : user.role === 'Approver' ? '/report-approvals' : user.role === 'Reception' ? '/reception' : notification.item ? `/stock?item=${notification.item?._id || notification.item}` : '/collection');
    } catch { /* Polling will retry without interrupting the user. */ }
  };
  const markAllRead = async () => {
    try { await api('/notifications/read-all', { token, method: 'PATCH' }); load(); } catch { /* Keep the panel usable. */ }
  };

  return <div className="notification-wrap"><button className={`bell ${data.unreadCount ? 'has-alert' : ''}`} aria-label="Notifications" onClick={() => setOpen(value => !value)}>◈{data.unreadCount > 0 && <b>{data.unreadCount}</b>}</button>{open && <div className="notification-panel"><div className="notification-title"><strong>Notification history</strong><button className="text-action" onClick={markAllRead}>Mark all read</button></div>{data.notifications.length ? data.notifications.map(notification => <button key={notification._id} className={`notification ${notification.read ? '' : 'unread'}`} onClick={() => read(notification)}><strong>{notification.type}</strong><span>{notification.message}</span><small>{new Date(notification.createdDate).toLocaleString()}</small></button>) : <p className="empty">No notifications.</p>}</div>}</div>;
}
