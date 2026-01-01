/**
 * App Update Notification Service
 * Handles sending push notifications when app updates are available
 */

import { supabase } from '../lib/supabase';
import { getCurrentVersion, getStoredVersion } from '../utils/versionManager';

/**
 * Send app update notification via push notification system
 * Uses edge function for reliable push notification delivery
 * @param {string} userId - User ID
 * @param {string} newVersion - New version available
 * @param {string} currentVersion - Current version
 * @returns {Promise<Object>} Result
 */
export const sendAppUpdateNotification = async (userId, newVersion, currentVersion) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    // Use edge function for reliable push notification delivery
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      // Fallback to direct RPC if no session
      return await sendAppUpdateNotificationDirect(userId, newVersion, currentVersion);
    }

    const { data, error } = await supabase.functions.invoke('send-app-update-notification', {
      body: {
        user_id: userId,
        new_version: newVersion,
        current_version: currentVersion,
      },
    });

    if (error) {
      console.error('Error calling app update edge function:', error);
      // Fallback to direct RPC
      return await sendAppUpdateNotificationDirect(userId, newVersion, currentVersion);
    }

    console.log('✅ App update notification sent via edge function:', data);
    return { success: true, ...data };
  } catch (error) {
    console.error('Exception in sendAppUpdateNotification:', error);
    // Fallback to direct RPC
    return await sendAppUpdateNotificationDirect(userId, newVersion, currentVersion);
  }
};

/**
 * Direct RPC fallback for app update notifications
 * @param {string} userId - User ID
 * @param {string} newVersion - New version available
 * @param {string} currentVersion - Current version
 * @returns {Promise<Object>} Result
 */
const sendAppUpdateNotificationDirect = async (userId, newVersion, currentVersion) => {
  try {
    const title = 'New Version Available';
    const message = `TaxiCab v${newVersion} is ready! Update now for the latest features and improvements.`;
    const actionUrl = '/?update=true';

    // Create notification record using the full signature
    const { data: notificationId, error: notifError } = await supabase.rpc(
      'create_notification',
      {
        p_user_id: userId,
        p_notification_type: 'app_update',
        p_category: 'system',
        p_priority: 'high',
        p_title: title,
        p_message: message,
        p_action_url: actionUrl,
        p_ride_id: null,
        p_series_id: null,
        p_task_id: null,
        p_offer_id: null,
        p_context_data: {
          new_version: newVersion,
          current_version: currentVersion,
          update_type: 'app_update',
        },
      }
    );

    if (notifError) {
      console.error('Error creating app update notification:', notifError);
      return { success: false, error: notifError.message };
    }

    console.log('✅ App update notification created:', notificationId);
    return { success: true, notificationId };
  } catch (error) {
    console.error('Exception in sendAppUpdateNotificationDirect:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check for app version updates and send notifications
 * This should be called periodically or when app starts
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result
 */
export const checkAndNotifyAppUpdate = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const currentVersion = getCurrentVersion();
    const storedVersion = getStoredVersion();

    // If no stored version, this is first run - store it
    if (!storedVersion) {
      return { success: true, message: 'First run, version stored', updated: false };
    }

    // If versions match, no update needed
    if (storedVersion === currentVersion) {
      return { success: true, message: 'App is up to date', updated: false };
    }

    // Version changed - send notification
    console.log(`🔄 App update detected: ${storedVersion} → ${currentVersion}`);
    
    const result = await sendAppUpdateNotification(userId, currentVersion, storedVersion);
    
    if (result.success) {
      return {
        success: true,
        updated: true,
        newVersion: currentVersion,
        oldVersion: storedVersion,
        notificationId: result.notificationId,
      };
    }

    return result;
  } catch (error) {
    console.error('Exception in checkAndNotifyAppUpdate:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Register app version with backend for centralized update tracking
 * @param {string} userId - User ID
 * @param {string} version - App version
 * @param {string} platform - Platform (web, ios, android)
 * @returns {Promise<Object>} Result
 */
export const registerAppVersion = async (userId, version, platform = 'web') => {
  try {
    if (!userId || !version) {
      return { success: false, error: 'User ID and version required' };
    }

    // Store version info in user's profile or a separate table
    // For now, we'll use the notification system's context_data
    // In the future, we could create an app_versions table
    
    const { error } = await supabase
      .from('profiles')
      .update({
        app_version: version,
        app_platform: platform,
        app_version_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      // If columns don't exist, that's OK - we'll just log it
      console.warn('Could not update app version in profile (columns may not exist):', error);
    }

    return { success: true };
  } catch (error) {
    console.error('Exception in registerAppVersion:', error);
    return { success: false, error: error.message };
  }
};






