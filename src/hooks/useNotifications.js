/**
 * Unified Notifications Hook
 *
 * Responsibilities:
 * - Fetch latest notifications for a user from `notifications`
 * - Subscribe to realtime inserts for that user
 * - Optionally surface UX signals (toasts / browser notifications / sounds)
 * - Provide helpers to mark notifications read
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { subscribeToNotifications } from '../lib/database';
import { useToast } from '../components/ui/ToastProvider';

const DEFAULT_LIMIT = 50;

function isRead(notification) {
  return Boolean(notification?.read || notification?.read_at);
}

function safeGetTitle(notification) {
  return notification?.title || notification?.notification_type || 'Notification';
}

function safeGetMessage(notification) {
  return notification?.message || notification?.body || '';
}

function safeGetActionUrl(notification) {
  return notification?.action_url || null;
}

function playSoftBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.03;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.08);
    oscillator.onended = () => {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    };
  } catch {
    // ignore
  }
}

/**
 * @param {string|null|undefined} userId
 * @param {object} options
 * @param {number} options.limit
 * @param {boolean} options.enableRealtime
 * @param {boolean} options.enableToasts
 * @param {boolean} options.enableSounds
 * @param {boolean} options.enableBrowserNotifications
 */
export const useNotifications = (userId, options = {}) => {
  const {
    limit = DEFAULT_LIMIT,
    enableRealtime = true,
    enableToasts = true,
    enableSounds = false,
    enableBrowserNotifications = false,
  } = options;

  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const subscriptionRef = useRef(null);
  const loadedForUserRef = useRef(null);

  const unreadCount = useMemo(() => {
    return (notifications || []).reduce((count, n) => count + (isRead(n) ? 0 : 1), 0);
  }, [notifications]);

  const showUxNotification = useCallback(
    (notification) => {
      const title = safeGetTitle(notification);
      const message = safeGetMessage(notification);
      const actionUrl = safeGetActionUrl(notification);

      if (enableSounds) playSoftBeep();

      if (enableToasts && addToast) {
        addToast({
          type: 'info',
          title,
          message,
          duration: 7000,
          onClick: actionUrl ? () => (window.location.href = actionUrl) : undefined,
        });
      }

      if (enableBrowserNotifications && typeof window !== 'undefined' && 'Notification' in window) {
        try {
          if (Notification.permission === 'granted') {
            // Prefer native browser notifications when permitted
            const n = new Notification(title, { body: message });
            if (actionUrl) {
              n.onclick = () => {
                window.focus?.();
                window.location.href = actionUrl;
              };
            }
          }
        } catch {
          // ignore
        }
      }
    },
    [addToast, enableBrowserNotifications, enableSounds, enableToasts]
  );

  const fetchLatest = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setNotifications(data || []);
      loadedForUserRef.current = userId;
    } catch (e) {
      console.error('useNotifications: failed to fetch notifications', e);
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [limit, userId]);

  // Initial load (and when user changes)
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      setError(null);
      loadedForUserRef.current = null;
      return;
    }

    // Avoid refetch loops if parent re-renders frequently
    if (loadedForUserRef.current !== userId) {
      fetchLatest();
    }
  }, [fetchLatest, userId]);

  // Realtime subscription
  useEffect(() => {
    if (!userId || !enableRealtime) return undefined;

    // Ensure we only have one subscription
    try {
      subscriptionRef.current?.unsubscribe?.();
    } catch {
      // ignore
    }

    const sub = subscribeToNotifications(userId, (payload) => {
      const next = payload?.new;
      if (!next) return;

      setNotifications((prev) => {
        const existing = prev || [];
        if (existing.some((n) => n.id === next.id)) return existing;
        return [next, ...existing].slice(0, limit);
      });

      showUxNotification(next);
    });

    subscriptionRef.current = sub;
    return () => {
      try {
        sub?.unsubscribe?.();
      } catch {
        // ignore
      }
      if (subscriptionRef.current === sub) {
        subscriptionRef.current = null;
      }
    };
  }, [enableRealtime, limit, showUxNotification, userId]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!userId || !notificationId) return;

      const now = new Date().toISOString();
      setNotifications((prev) =>
        (prev || []).map((n) => (n.id === notificationId ? { ...n, read: true, read_at: now } : n))
      );

      // Schema can vary; try the "full" update first, then fall back.
      const tryUpdate = async (fields) => {
        const { error: updateError } = await supabase
          .from('notifications')
          .update(fields)
          .eq('id', notificationId)
          .eq('user_id', userId);
        return updateError;
      };

      let updateError = await tryUpdate({ read: true, read_at: now });
      if (updateError) updateError = await tryUpdate({ read_at: now });
      if (updateError) updateError = await tryUpdate({ read: true });

      if (updateError) {
        console.warn('useNotifications: markAsRead failed', updateError);
      }
    },
    [userId]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    const unreadIds = (notifications || []).filter((n) => !isRead(n)).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => (prev || []).map((n) => ({ ...n, read: true, read_at: now })));

    const tryUpdate = async (fields) => {
      const { error: updateError } = await supabase
        .from('notifications')
        .update(fields)
        .in('id', unreadIds)
        .eq('user_id', userId);
      return updateError;
    };

    let updateError = await tryUpdate({ read: true, read_at: now });
    if (updateError) updateError = await tryUpdate({ read_at: now });
    if (updateError) updateError = await tryUpdate({ read: true });

    if (updateError) {
      console.warn('useNotifications: markAllAsRead failed', updateError);
    }
  }, [notifications, userId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch: fetchLatest,
    markAsRead,
    markAllAsRead,
  };
};

export default useNotifications;


