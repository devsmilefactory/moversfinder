/**
 * Push Notifications Hook
 * Manages push notification initialization and handling
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores';
import { pushNotificationService } from '../services/pushNotificationService';
import { useToast } from '../components/ui/ToastProvider';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to initialize and manage push notifications
 * @param {Object} options - Configuration options
 * @param {boolean} options.enableForegroundNotifications - Show notifications when app is in foreground
 * @param {Function} options.onNotificationClick - Callback when notification is clicked
 * @returns {Object} Push notification state and methods
 */
export const usePushNotifications = (options = {}) => {
  const {
    enableForegroundNotifications = true,
    onNotificationClick = null,
  } = options;

  const { user } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const initializedRef = useRef(false);

  /**
   * Handle notification click with deep linking
   */
  const handleNotificationClick = useCallback(
    (payload) => {
      const actionUrl = payload.data?.action_url || payload.notification?.click_action || '/';
      
      // Handle app update notifications specially
      if (payload.data?.update_type === 'app_update' || payload.data?.notification_type === 'app_update') {
        // For app updates, trigger the update flow
        if (window.location.pathname !== '/') {
          navigate('/?update=true');
        } else {
          // If already on home, trigger update check
          window.location.reload();
        }
        return;
      }
      
      // Extract route from action URL
      const url = new URL(actionUrl, window.location.origin);
      const path = url.pathname + url.search;

      // Navigate to the deep link
      navigate(path);

      // Call custom handler if provided
      if (onNotificationClick) {
        onNotificationClick(payload, path);
      }
    },
    [navigate, onNotificationClick]
  );

  /**
   * Handle foreground notification
   */
  const handleForegroundNotification = useCallback(
    (payload) => {
      console.log('Foreground notification received:', payload);

      const title = payload.notification?.title || payload.data?.title || 'New Notification';
      const body = payload.notification?.body || payload.data?.message || '';

      // Show toast notification
      if (enableForegroundNotifications) {
        addToast({
          type: 'info',
          title,
          message: body,
          duration: 5000,
          onClick: () => handleNotificationClick(payload),
        });
      }

      // Trigger custom handler
      if (onNotificationClick) {
        onNotificationClick(payload);
      }
    },
    [enableForegroundNotifications, addToast, handleNotificationClick, onNotificationClick]
  );

  /**
   * Initialize push notifications
   */
  useEffect(() => {
    if (!user?.id || initializedRef.current) {
      return;
    }

    const initialize = async () => {
      try {
        const success = await pushNotificationService.initialize(
          user.id,
          handleForegroundNotification
        );

        if (success) {
          initializedRef.current = true;
          console.log('✅ Push notifications initialized');
        }
        // Silently handle failure - Firebase may not be configured, which is OK
      } catch (error) {
        // Only log actual errors, not expected configuration issues
        console.error('Error initializing push notifications:', error);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      if (initializedRef.current) {
        pushNotificationService.cleanup();
        initializedRef.current = false;
      }
    };
  }, [user?.id, handleForegroundNotification]);

  /**
   * Refresh FCM token
   */
  const refreshToken = useCallback(async () => {
    if (!user?.id) return null;
    return await pushNotificationService.refreshToken(user.id);
  }, [user?.id]);

  /**
   * Get current FCM token
   */
  const getToken = useCallback(() => {
    return pushNotificationService.getToken();
  }, []);

  return {
    isInitialized: initializedRef.current,
    token: getToken(),
    refreshToken,
    getToken,
  };
};

export default usePushNotifications;


