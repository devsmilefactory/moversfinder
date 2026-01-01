/**
 * Push Notifications Provider Component
 * 
 * Wraps the usePushNotifications hook so it can be used inside Router context.
 * This component must be rendered inside a BrowserRouter.
 */

import { usePushNotifications } from '../../hooks/usePushNotifications';

const PushNotificationsProvider = () => {
  // Initialize push notifications for authenticated users
  // This hook uses useNavigate(), so it must be inside Router context
  usePushNotifications({
    enableForegroundNotifications: true,
    onNotificationClick: (payload) => {
      const actionUrl = payload.data?.action_url || payload.notification?.click_action;
      if (actionUrl) {
        window.location.href = actionUrl;
      }
    },
  });

  // This component doesn't render anything
  return null;
};

export default PushNotificationsProvider;






