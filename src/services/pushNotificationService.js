/**
 * Push Notification Service
 * Manages FCM token registration, updates, and notification handling
 */

import { getFCMToken, onForegroundMessage, isFirebaseConfigured, checkMessagingSupport } from '../lib/firebase';
import { supabase } from '../lib/supabase';

class PushNotificationService {
  constructor() {
    this.token = null;
    this.isInitialized = false;
    this.messageHandler = null;
    this.unsubscribeForeground = null;
  }

  /**
   * Initialize push notification service
   * @param {string} userId - Current user ID
   * @param {Function} onNotificationReceived - Callback for received notifications
   * @returns {Promise<boolean>} Success status
   */
  async initialize(userId, onNotificationReceived = null) {
    if (this.isInitialized) {
      console.log('Push notification service already initialized');
      return true;
    }

    if (!isFirebaseConfigured()) {
      // Silently skip initialization if Firebase is not configured
      // This is expected behavior when Firebase credentials are not set up
      return false;
    }

    const supported = await checkMessagingSupport();
    if (!supported) {
      console.warn('Firebase Messaging not supported in this browser');
      return false;
    }

    try {
      // Get FCM token (may fail in dev mode, that's OK)
      const token = await getFCMToken();
      if (!token) {
        // In dev mode, this is expected - don't fail initialization
        if (import.meta.env.DEV) {
          console.log('FCM token not available in dev mode (expected)');
          return false; // Still return false but don't log as error
        }
        console.warn('Failed to get FCM token');
        return false;
      }

      this.token = token;

      // Save token to database
      await this.updateTokenInDatabase(userId, token);

      // Set up foreground message handler
      if (onNotificationReceived) {
        this.messageHandler = onNotificationReceived;
        this.unsubscribeForeground = onForegroundMessage((payload) => {
          console.log('Foreground notification received:', payload);
          onNotificationReceived(payload);
        });
      }

      // Set up token refresh handler
      this.setupTokenRefresh(userId);

      this.isInitialized = true;
      console.log('✅ Push notification service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing push notification service:', error);
      return false;
    }
  }

  /**
   * Update FCM token in database
   * @param {string} userId - User ID
   * @param {string} token - FCM token
   */
  async updateTokenInDatabase(userId, token) {
    try {
      const { error } = await supabase.rpc('update_fcm_token', {
        p_user_id: userId,
        p_fcm_token: token,
      });

      if (error) {
        console.error('Error updating FCM token in database:', error);
        throw error;
      }

      console.log('✅ FCM token updated in database');
    } catch (error) {
      console.error('Failed to update FCM token:', error);
    }
  }

  /**
   * Set up token refresh handler
   * @param {string} userId - User ID
   */
  setupTokenRefresh(userId) {
    // Token refresh is handled automatically by Firebase SDK
    // We just need to update the database when it changes
    // Note: This requires access to the messaging instance
    // For now, we'll handle token refresh on app initialization
  }

  /**
   * Get current FCM token
   * @returns {string|null}
   */
  getToken() {
    return this.token;
  }

  /**
   * Refresh FCM token
   * @param {string} userId - User ID
   * @returns {Promise<string|null>}
   */
  async refreshToken(userId) {
    try {
      const token = await getFCMToken();
      if (token && token !== this.token) {
        this.token = token;
        await this.updateTokenInDatabase(userId, token);
      }
      return token;
    } catch (error) {
      console.error('Error refreshing FCM token:', error);
      return null;
    }
  }

  /**
   * Cleanup and unsubscribe
   */
  cleanup() {
    if (this.unsubscribeForeground) {
      this.unsubscribeForeground();
      this.unsubscribeForeground = null;
    }
    this.messageHandler = null;
    this.isInitialized = false;
    this.token = null;
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;


