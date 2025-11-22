import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/authStore';

const STATUS_LABELS = {
  driver_on_way: 'Driver on the way to pickup',
  driver_arrived: 'Driver has arrived at pickup',
  trip_started: 'Trip started',
  completed: 'Trip completed'
};

const NotificationBell = ({ className = '' }) => {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const lastStatusesRef = useRef({});

  // Initial fetch from notifications table
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id,title,message,type,action_url,created_at,read,read_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (Array.isArray(data)) {
        setItems(data.map(r => ({
          id: r.id,
          title: r.title,
          message: r.message,
          type: r.type,
          url: r.action_url,
          createdAt: r.created_at,
          read: !!(r.read || r.read_at)
        })));
      }
    })();
  }, [user?.id]);

  // Realtime subscription for notifications (INSERT + UPDATE)
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new;
        setItems(prev => ([{
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          url: n.action_url,
          createdAt: n.created_at,
          read: !!(n.read || n.read_at)
        }, ...prev].slice(0, 50)));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new;
        setItems(prev => prev.map(i => i.id === n.id ? { ...i, read: !!(n.read || n.read_at) } : i));
      })
      .subscribe();

    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [user?.id]);

  // NOTE: ride-status → notifications persistence moved into centralized
  // ride lifecycle logic and notificationService. The bell now only listens
  // to the notifications table and does not create notifications on its own.

  const unread = useMemo(() => items.filter(i => !i.read).length, [items]);

  const markAllRead = async () => {
    if (!user?.id || unread === 0) return;
    try {
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read', false);
    } catch {}
    setItems(prev => prev.map(i => ({ ...i, read: true })));
  };

  const markOneRead = async (rowId) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', rowId)
        .eq('user_id', user.id);
    } catch {}
    setItems(prev => prev.map(i => i.id === rowId ? { ...i, read: true } : i));
  };

  if (!user?.id) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="bg-white rounded-full shadow-xl p-3 hover:bg-slate-50 transition-all transform hover:scale-105 relative"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-yellow-500" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] min-w-[1rem] h-4 px-1">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[85vw] bg-white border border-slate-200 rounded-lg shadow-xl z-50">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Notifications</p>
            {items.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-yellow-700 hover:text-yellow-800">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No notifications yet</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b border-slate-100 flex items-start gap-3 ${n.read ? 'bg-white' : 'bg-yellow-50'}`}>
                  <div className="text-lg">{n.type === 'ride' ? '🚕' : '🔔'}</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-800">{n.title || 'Update'}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  <button onClick={() => markOneRead(n.id)} className="text-slate-400 hover:text-slate-600">×</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

