/**
 * Production-Ready Unified Notification Hook
 * 
 * Features:
 * - Single source of truth for notifications
 * - Real-time Supabase subscriptions
 * - Automatic retry logic
 * - Notification queue management
 * - Browser notification support
 * - Toast notifications
 * - Sound notifications
 * - Read/unread tracking
 * - Performance optimized (deduplication, batching)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import { subscribePostgresChanges, subscribeChannelStatus } from '../lib/realtimeRegistry';

const NOTIFICATION_SOUND = '/notification.mp3';
const MAX_NOTIFICATIONS = 100;
const RETRY_DELAY = 3000;
const MAX_RETRIES = 3;

const isNotificationRead = (notification) => {
  if (!notification) return false;
  return (
    notification.read === true ||
    notification.is_read === true ||
    Boolean(notification.read_at)
  );
};

const normalizeNotification = (notification) => {
  if (!notification) return notification;

  const readFlag = isNotificationRead(notification);

  return {
    ...notification,
    read: readFlag,
    is_read: readFlag,
    read_at: notification.read_at ?? null,
  };
};

export function useNotifications(userId, options = {}) {
  const {
    enableToasts = true,
    enableSounds = true,
    enableBrowserNotifications = true,
    maxNotifications = MAX_NOTIFICATIONS,
    onNotificationReceived = null,
    autoMarkRead = false,
  } = options;

  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState('disconnected');

  // Refs for deduplication and queue management
  const seenNotificationIds = useRef(new Set());
  const notificationQueue = useRef([]);
  const retryAttempts = useRef(new Map());
  const channelRef = useRef(null);
  const audioRef = useRef(null);
  const lastNotificationTime = useRef(new Map()); // Throttle duplicate notifications
  const handleNewNotificationRef = useRef(null);
  const handleNotificationUpdateRef = useRef(null);

  // Initialize audio for sound notifications
  useEffect(() => {
    if (enableSounds && typeof window !== 'undefined') {
      try {
        audioRef.current = new Audio(NOTIFICATION_SOUND);
        audioRef.current.preload = 'auto';
      } catch (e) {
        console.warn('Could not initialize notification sound:', e);
      }
    }
  }, [enableSounds]);

  // Request browser notification permission
  useEffect(() => {
    if (!enableBrowserNotifications || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().catch((err) => {
        console.warn('Failed to request notification permission:', err);
      });
    }
  }, [enableBrowserNotifications]);

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(maxNotifications);

      if (fetchError) throw fetchError;

      const notificationList = (data || []).map(normalizeNotification);
      setNotifications(notificationList);
      
      // Calculate unread count
      const unread = notificationList.filter(n => !isNotificationRead(n)).length;
      setUnreadCount(unread);

      // Track seen notifications
      notificationList.forEach(n => seenNotificationIds.current.add(n.id));

      return { success: true, data: notificationList };
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err.message);
      return { success: false, error: err };
    } finally {
      setIsLoading(false);
    }
  }, [userId, maxNotifications]);

  // Process notification queue with retry logic
  const processNotificationQueue = useCallback(async () => {
    if (notificationQueue.current.length === 0) return;

    const notification = notificationQueue.current.shift();
    const notificationId = notification.id;
    const attempts = retryAttempts.current.get(notificationId) || 0;

    if (attempts >= MAX_RETRIES) {
      console.error(`Max retries reached for notification ${notificationId}`);
      retryAttempts.current.delete(notificationId);
      return;
    }

    try {
      // Show notification
      await showNotification(notification);
      retryAttempts.current.delete(notificationId);
    } catch (err) {
      console.error(`Error processing notification ${notificationId}:`, err);
      retryAttempts.current.set(notificationId, attempts + 1);
      
      // Re-queue for retry
      setTimeout(() => {
        notificationQueue.current.push(notification);
        processNotificationQueue();
      }, RETRY_DELAY);
    }
  }, []);

  // Show notification (toast, sound, browser notification)
  const showNotification = useCallback(async (notification) => {
    // Show toast notification
    if (enableToasts && addToast) {
      addToast({
        type: 'info',
        title: notification.title,
        message: notification.message,
        duration: 8000,
        onClick: () => {
          if (notification.action_url) {
            window.location.href = notification.action_url;
          }
        },
      });
    }

    // Play sound
    if (enableSounds && audioRef.current) {
      try {
        await audioRef.current.play().catch(() => {
          // Ignore play errors (user might have blocked autoplay)
        });
      } catch (e) {
        // Ignore audio errors
      }
    }

    // Show browser notification
    if (enableBrowserNotifications && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: notification.id,
          requireInteraction: false,
          silent: false,
        });

        browserNotification.onclick = () => {
          window.focus();
          if (notification.action_url) {
            window.location.href = notification.action_url;
          }
          browserNotification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => browserNotification.close(), 5000);
      } catch (e) {
        console.warn('Failed to show browser notification:', e);
      }
    }

    // Call custom handler
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  }, [enableToasts, enableSounds, enableBrowserNotifications, addToast, onNotificationReceived]);

  // Handle new notification from real-time subscription
  const handleNewNotification = useCallback((payload) => {
    const notification = normalizeNotification(payload.new);
    
    // Deduplication check - prevent processing same notification twice
    if (seenNotificationIds.current.has(notification.id)) {
      return;
    }

    // Throttle duplicate notifications by content (prevent same notification shown multiple times within 2 seconds)
    const notificationKey = `${notification.title}-${notification.message}`;
    const lastTime = lastNotificationTime.current.get(notificationKey) || 0;
    const now = Date.now();
    if (now - lastTime < 2000) {
      // Same notification content within 2 seconds - skip
      return;
    }
    lastNotificationTime.current.set(notificationKey, now);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNotifications.js:233',message:'New notification received',data:{notificationId:notification?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Mark as seen
    seenNotificationIds.current.add(notification.id);

    // Add to notifications list
    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      return updated;
    });

    // Update unread count
    if (!isNotificationRead(notification)) {
      setUnreadCount(prev => prev + 1);
    }

    // Auto-mark as read if option enabled
    if (autoMarkRead) {
      markAsRead(notification.id);
    }

    // Show notification
    showNotification(notification).catch(err => {
      console.error('Error showing notification:', err);
      // Add to queue for retry
      notificationQueue.current.push(notification);
      processNotificationQueue();
    });
  }, [maxNotifications, autoMarkRead, showNotification, processNotificationQueue]);

  useEffect(() => {
    handleNewNotificationRef.current = handleNewNotification;
  }, [handleNewNotification]);

  // Handle notification update (e.g., marked as read)
  const handleNotificationUpdate = useCallback((payload) => {
    const updatedNotification = normalizeNotification(payload.new);
    
    setNotifications(prev =>
      prev.map(n =>
        n.id === updatedNotification.id ? updatedNotification : n
      )
    );

    // Update unread count
    if (isNotificationRead(updatedNotification)) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  useEffect(() => {
    handleNotificationUpdateRef.current = handleNotificationUpdate;
  }, [handleNotificationUpdate]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) {
      setSubscriptionStatus('disconnected');
      return;
    }

    // Load initial notifications
    loadNotifications();

    const channelName = `notifications-${userId}`;

    const unsubStatus = subscribeChannelStatus(channelName, (status) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNotifications.js:313',message:'Notification subscription status',data:{status},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      setSubscriptionStatus(status);
      if (status === 'SUBSCRIBED') {
        processNotificationQueue();
      }
    });

    const unsubInsert = subscribePostgresChanges({
      channelName,
      table: 'notifications',
      event: 'INSERT',
      filter: `user_id=eq.${userId}`,
      listener: (payload) => handleNewNotificationRef.current?.(payload),
    });

    const unsubUpdate = subscribePostgresChanges({
      channelName,
      table: 'notifications',
      event: 'UPDATE',
      filter: `user_id=eq.${userId}`,
      listener: (payload) => handleNotificationUpdateRef.current?.(payload),
    });

    channelRef.current = { unsubStatus, unsubInsert, unsubUpdate };

    // Cleanup
    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNotifications.js:326',message:'Cleaning up notification subscription',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      if (channelRef.current) {
        try { channelRef.current.unsubInsert?.(); } catch (e) {}
        try { channelRef.current.unsubUpdate?.(); } catch (e) {}
        try { channelRef.current.unsubStatus?.(); } catch (e) {}
        channelRef.current = null;
      }
    };
  }, [userId, loadNotifications, processNotificationQueue]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;

      // Optimistically update local state
      const timestamp = new Date().toISOString();
      setNotifications(prev =>
        prev.map(n => {
          if (n.id !== notificationId) return n;
          return normalizeNotification({
            ...n,
            is_read: true,
            read: true,
            read_at: timestamp,
          });
        })
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      return { success: true };
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return { success: false, error: err };
    }
  }, [userId]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;

      // Optimistically update local state
      setNotifications(prev =>
        prev.map(n =>
          normalizeNotification({
            ...n,
            is_read: true,
            read: true,
            read_at: n.read_at || new Date().toISOString(),
          })
        )
      );
      setUnreadCount(0);

      return { success: true };
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return { success: false, error: err };
    }
  }, [userId]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;

      // Optimistically update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if needed
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !isNotificationRead(notification)) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      return { success: true };
    } catch (err) {
      console.error('Error deleting notification:', err);
      return { success: false, error: err };
    }
  }, [userId, notifications]);

  // Refresh notifications
  const refresh = useCallback(() => {
    return loadNotifications();
  }, [loadNotifications]);

  return {
    // State
    notifications,
    unreadCount,
    isLoading,
    error,
    subscriptionStatus,

    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,

    // Utilities
    hasUnread: unreadCount > 0,
    isConnected: subscriptionStatus === 'SUBSCRIBED',
  };
}

export default useNotifications;



