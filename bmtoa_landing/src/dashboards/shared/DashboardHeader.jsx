import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

/**
 * Dashboard Header Component
 * Top navigation bar with search, notifications, and user menu
 * Integrated with Supabase for real-time notifications and user data
 */
const DashboardHeader = ({ user, onMenuClick, onSidebarToggle, sidebarOpen }) => {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuthStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Load notifications from Supabase
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const transformedNotifications = (data || []).map(notif => ({
        id: notif.id,
        title: notif.title || 'Notification',
        message: notif.message || '',
        time: formatTimeAgo(notif.created_at),
        unread: !notif.read_at,
        type: notif.type || 'info'
      }));

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      // Reload notifications
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, unread: false } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleLogout = async () => {
    try {
      // Use authStore logout function
      await authLogout();

      // Close dropdown
      setShowUserMenu(false);

      // Redirect to landing page
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <span className="text-xl">☰</span>
          </button>

          {/* Desktop Sidebar Toggle */}
          <button
            onClick={onSidebarToggle}
            className="hidden lg:block p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <span className="text-xl">{sidebarOpen ? '◀' : '▶'}</span>
          </button>

          {/* Search Bar */}
          <div className="hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-64 lg:w-96 pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                🔍
              </span>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-700">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-yellow-600 hover:text-yellow-700"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-2"></div>
                      <p className="text-sm text-slate-500">Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-slate-500 text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                          notification.unread ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-700 text-sm">
                              {notification.title}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {notification.time}
                            </p>
                          </div>
                          {notification.unread && (
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mt-1"></span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-3 text-center border-t border-slate-200">
                    <button className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-100"
            >
              {user?.profile_photo ? (
                <img
                  src={user.profile_photo}
                  alt={user?.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-slate-700 font-bold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <span className="hidden md:block text-sm font-medium text-slate-700">
                {user?.name || user?.full_name || 'User'}
              </span>
              <span className="text-slate-400">▼</span>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50">
                <div className="p-4 border-b border-slate-200">
                  <p className="font-medium text-slate-700">{user?.name || user?.full_name || 'User'}</p>
                  <p className="text-sm text-slate-500">{user?.email || 'No email'}</p>
                  <p className="text-xs text-yellow-600 mt-1 capitalize">
                    {user?.user_type?.replace('_', ' ') || user?.userType?.replace('_', ' ') || 'User'} Account
                  </p>
                </div>
                <div className="py-2">
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                    👤 Profile Settings
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                    ⚙️ Account Settings
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                    ❓ Help & Support
                  </button>
                </div>
                <div className="border-t border-slate-200 py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;

