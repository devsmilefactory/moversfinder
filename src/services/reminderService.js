/**
 * Reminder Service
 * 
 * Handles trip reminder operations with Supabase.
 * Manages reminder retrieval, sending, and status updates.
 */

import { supabase } from '../lib/supabase';

/**
 * Get pending reminders that need to be sent
 * 
 * @param {number} limit - Maximum number of reminders to retrieve
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getPendingReminders = async (limit = 100) => {
  try {
    const { data, error } = await supabase.rpc('get_pending_reminders', {
      p_limit: limit
    });

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('❌ Error getting pending reminders:', error);
    return {
      success: false,
      error: 'unexpected_error',
      message: error.message || 'Failed to get pending reminders'
    };
  }
};

/**
 * Send a reminder notification
 * This function sends the notification and marks it as sent
 * 
 * @param {Object} reminder - The reminder object
 * @param {string} reminder.reminder_id - Reminder ID
 * @param {string} reminder.user_id - User ID to send to
 * @param {string} reminder.title - Notification title
 * @param {string} reminder.message - Notification message
 * @param {Object} reminder.notification_data - Additional notification data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendReminder = async (reminder) => {
  try {
    console.log('📤 Sending reminder:', {
      reminderId: reminder.reminder_id,
      userId: reminder.user_id,
      type: reminder.reminder_type,
      timestamp: new Date().toISOString()
    });

    // Create notification record
    const notificationData = {
      user_id: reminder.user_id,
      title: reminder.title,
      message: reminder.message,
      type: 'ride',
      read: false,
      action_url: reminder.notification_data?.series_id 
        ? `/recurring-trips/${reminder.notification_data.series_id}` 
        : null,
      created_at: new Date().toISOString()
    };

    const { error: notifError } = await supabase
      .from('notifications')
      .insert([notificationData]);

    if (notifError) {
      console.error('❌ Error creating notification:', notifError);
      throw notifError;
    }

    // Mark reminder as sent
    const { data: marked, error: markError } = await supabase.rpc('mark_reminder_sent', {
      p_reminder_id: reminder.reminder_id
    });

    if (markError) {
      console.error('❌ Error marking reminder as sent:', markError);
      throw markError;
    }

    console.log('✅ Reminder sent successfully');

    return {
      success: true,
      message: 'Reminder sent successfully'
    };

  } catch (error) {
    console.error('❌ Error sending reminder:', error);
    
    // Mark reminder as failed
    try {
      await supabase.rpc('mark_reminder_failed', {
        p_reminder_id: reminder.reminder_id,
        p_reason: error.message || 'Failed to send notification'
      });
    } catch (failError) {
      console.error('❌ Error marking reminder as failed:', failError);
    }

    return {
      success: false,
      error: 'send_failed',
      message: error.message || 'Failed to send reminder'
    };
  }
};

/**
 * Process all pending reminders
 * This is typically called by a background job or cron
 * 
 * @param {number} batchSize - Number of reminders to process in one batch
 * @returns {Promise<{success: boolean, processed: number, sent: number, failed: number}>}
 */
export const processPendingReminders = async (batchSize = 50) => {
  try {
    console.log('🔄 Processing pending reminders...');

    // Get pending reminders
    const { success, data: reminders, error } = await getPendingReminders(batchSize);

    if (!success || !reminders) {
      console.error('❌ Failed to get pending reminders:', error);
      return {
        success: false,
        processed: 0,
        sent: 0,
        failed: 0,
        error
      };
    }

    if (reminders.length === 0) {
      console.log('✅ No pending reminders to process');
      return {
        success: true,
        processed: 0,
        sent: 0,
        failed: 0
      };
    }

    console.log(`📋 Found ${reminders.length} pending reminders`);

    let sent = 0;
    let failed = 0;

    // Process each reminder
    for (const reminder of reminders) {
      const result = await sendReminder(reminder);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    console.log(`✅ Processed ${reminders.length} reminders: ${sent} sent, ${failed} failed`);

    return {
      success: true,
      processed: reminders.length,
      sent,
      failed
    };

  } catch (error) {
    console.error('❌ Error processing pending reminders:', error);
    return {
      success: false,
      processed: 0,
      sent: 0,
      failed: 0,
      error: error.message
    };
  }
};

/**
 * Get reminders for a specific user
 * 
 * @param {string} userId - User ID
 * @param {string[]} statuses - Array of statuses to filter by (optional)
 * @param {number} limit - Maximum number of reminders to return
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getUserReminders = async (userId, statuses = ['pending', 'sent'], limit = 50) => {
  try {
    let query = supabase
      .from('trip_reminders')
      .select('*, recurring_trip_series(series_name, pickup_address, dropoff_address)')
      .eq('user_id', userId);

    if (statuses && statuses.length > 0) {
      query = query.in('status', statuses);
    }

    query = query
      .order('reminder_time', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('❌ Error getting user reminders:', error);
    return {
      success: false,
      error: 'unexpected_error',
      message: error.message || 'Failed to get user reminders'
    };
  }
};

/**
 * Get reminders for a specific series
 * 
 * @param {string} seriesId - Series ID
 * @param {string[]} statuses - Array of statuses to filter by (optional)
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getSeriesReminders = async (seriesId, statuses = null) => {
  try {
    let query = supabase
      .from('trip_reminders')
      .select('*')
      .eq('series_id', seriesId);

    if (statuses && statuses.length > 0) {
      query = query.in('status', statuses);
    }

    query = query.order('reminder_time', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('❌ Error getting series reminders:', error);
    return {
      success: false,
      error: 'unexpected_error',
      message: error.message || 'Failed to get series reminders'
    };
  }
};

/**
 * Cancel a reminder
 * 
 * @param {string} reminderId - Reminder ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const cancelReminder = async (reminderId, userId) => {
  try {
    // Verify user owns this reminder
    const { data: reminder, error: fetchError } = await supabase
      .from('trip_reminders')
      .select('user_id, status')
      .eq('id', reminderId)
      .single();

    if (fetchError) throw fetchError;

    if (!reminder) {
      return {
        success: false,
        error: 'reminder_not_found',
        message: 'Reminder not found'
      };
    }

    if (reminder.user_id !== userId) {
      return {
        success: false,
        error: 'unauthorized',
        message: 'You are not authorized to cancel this reminder'
      };
    }

    if (reminder.status !== 'pending') {
      return {
        success: false,
        error: 'invalid_status',
        message: 'Only pending reminders can be cancelled'
      };
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('trip_reminders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', reminderId);

    if (updateError) throw updateError;

    return {
      success: true,
      message: 'Reminder cancelled successfully'
    };

  } catch (error) {
    console.error('❌ Error cancelling reminder:', error);
    return {
      success: false,
      error: 'unexpected_error',
      message: error.message || 'Failed to cancel reminder'
    };
  }
};

/**
 * Retry failed reminders
 * 
 * @param {number} maxRetries - Maximum retry count to process (default: 3)
 * @param {number} limit - Maximum number of reminders to retry
 * @returns {Promise<{success: boolean, retried: number, sent: number, failed: number}>}
 */
export const retryFailedReminders = async (maxRetries = 3, limit = 20) => {
  try {
    console.log('🔄 Retrying failed reminders...');

    // Get failed reminders that haven't exceeded retry limit
    const { data: reminders, error } = await supabase
      .from('trip_reminders')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', maxRetries)
      .lte('reminder_time', new Date().toISOString())
      .order('reminder_time', { ascending: true })
      .limit(limit);

    if (error) throw error;

    if (!reminders || reminders.length === 0) {
      console.log('✅ No failed reminders to retry');
      return {
        success: true,
        retried: 0,
        sent: 0,
        failed: 0
      };
    }

    console.log(`📋 Found ${reminders.length} failed reminders to retry`);

    let sent = 0;
    let failed = 0;

    // Retry each reminder
    for (const reminder of reminders) {
      const result = await sendReminder(reminder);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    console.log(`✅ Retried ${reminders.length} reminders: ${sent} sent, ${failed} failed`);

    return {
      success: true,
      retried: reminders.length,
      sent,
      failed
    };

  } catch (error) {
    console.error('❌ Error retrying failed reminders:', error);
    return {
      success: false,
      retried: 0,
      sent: 0,
      failed: 0,
      error: error.message
    };
  }
};
