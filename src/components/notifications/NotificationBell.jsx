import React, { useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useNotifications from '../../hooks/useNotifications';

const NotificationBell = ({ className = '' }) => {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications(user?.id, {
    enableToasts: false,
    enableSounds: false,
    enableBrowserNotifications: false,
  });

  const sortedItems = useMemo(() => {
    if (!notifications) return [];
    return [...notifications].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [notifications]);

  const handleToggle = () => setOpen((v) => !v);

  const handleItemClick = (notification) => {
    markAsRead(notification.id);
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const handleMarkAll = () => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  };

  if (!user?.id) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleToggle}
        className="bg-white rounded-full shadow-md p-2 sm:p-3 hover:bg-slate-50 transition-all transform hover:scale-105 relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[9px] min-w-[0.9rem] h-3.5 px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[85vw] bg-white border border-slate-200 rounded-lg shadow-xl z-[9999]">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Notifications</p>
            {sortedItems.length > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-yellow-700 hover:text-yellow-800"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-slate-500">Loading notifications…</p>
            ) : sortedItems.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No notifications yet</p>
            ) : (
              sortedItems.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleItemClick(notification)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 flex items-start gap-3 ${
                    notification.read || notification.read_at ? 'bg-white' : 'bg-yellow-50'
                  }`}
                >
                  <div className="text-lg">{notification.type === 'ride' ? '🚕' : '🔔'}</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-800">{notification.title || 'Update'}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{notification.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

