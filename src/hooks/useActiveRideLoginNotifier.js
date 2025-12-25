import { useEffect, useRef } from 'react';
import { notifyActiveRideOnLogin } from '../services/notificationService';

/**
 * useActiveRideLoginNotifier
 *
 * Sends a one-time push notification when a user logs in and already
 * has an active ride. Works for both drivers and passengers.
 *
 * @param {object|null} user - Authenticated user profile
 */
export function useActiveRideLoginNotifier(user) {
  const lastNotifiedRef = useRef(null);

  useEffect(() => {
    if (!user?.id) {
      lastNotifiedRef.current = null;
      return;
    }

    // Use sessionStorage + ref to ensure we only notify once per browser session
    const sessionKey = `active-ride-login-${user.id}`;
    if (sessionStorage.getItem(sessionKey) === 'sent') {
      lastNotifiedRef.current = sessionKey;
      return;
    }

    if (lastNotifiedRef.current === sessionKey) {
      return;
    }

    lastNotifiedRef.current = sessionKey;

    notifyActiveRideOnLogin(user)
      .then((result) => {
        if (result?.success && result.created > 0) {
          sessionStorage.setItem(sessionKey, 'sent');
        }
      })
      .catch((error) => {
        console.error('Failed to send active ride login notification:', error);
        // Allow retries on subsequent mounts by clearing the ref
        lastNotifiedRef.current = null;
      });
  }, [user]);
}

export default useActiveRideLoginNotifier;










