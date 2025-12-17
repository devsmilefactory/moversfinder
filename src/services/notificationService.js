import { supabase } from '../lib/supabase';
import { ACTIVE_RIDE_STATUSES } from '../hooks/useRideStatus';

// Centralized notification helpers for ride-related events
// All writes to the `notifications` table for ride flows should go through this
// service so we have consistent titles, messages, and action URLs.

export const NOTIFICATION_TYPES = {
  RIDE: 'ride',
};

export async function sendRideNotification({
  userId,
  title,
  message,
  rideId,
  actionPath = '/user/rides',
  actionUrl,
  extra = {},
}) {
  if (!userId || !title || !message) {
    console.error('sendRideNotification called with missing fields', {
      userId,
      title,
      message,
    });
    return { error: new Error('Missing notification fields') };
  }

  const defaultPath = actionPath || '/user/rides';
  const sanitizedPath = defaultPath.endsWith('/')
    ? defaultPath.slice(0, -1)
    : defaultPath;
  const resolvedActionUrl = actionUrl
    ? actionUrl
    : rideId
      ? `${sanitizedPath}/${rideId}`
      : sanitizedPath;

  const payload = {
    user_id: userId,
    title,
    message,
    type: NOTIFICATION_TYPES.RIDE,
    action_url: resolvedActionUrl,
    created_at: new Date().toISOString(),
    ...extra,
  };

  const { error } = await supabase.from('notifications').insert(payload);
  if (error) {
    console.error('Error sending ride notification:', error, payload);
    return { error };
  }
  return { error: null };
}

// Convenience wrappers for common ride events

export async function notifyTripCompleted({ userId, rideId }) {
  return sendRideNotification({
    userId,
    rideId,
    title: '✅ Trip Completed',
    message: 'Your ride has been completed. Thank you for riding with us!',
  });
}

export async function notifyRideCancelled({ userId, rideId, cancelledBy }) {
  const who = cancelledBy === 'driver' ? 'driver' : 'passenger';
  return sendRideNotification({
    userId,
    rideId,
    title: 'Ride Cancelled',
    message:
      who === 'passenger'
        ? 'The passenger has cancelled this ride.'
        : 'The driver has cancelled this ride.',
  });
}

export async function notifyStatusUpdateFromOverlay({ userId, rideId, title, message }) {
  return sendRideNotification({ userId, rideId, title, message });
}

/**
 * Send a one-time notification after login if the user already has an active ride.
 * Works for both drivers and passengers so they immediately see the ride context.
 */
export async function notifyActiveRideOnLogin(user) {
  if (!user?.id) {
    return { success: false, error: new Error('Missing user') };
  }

  const isDriver = user.user_type === 'driver';
  const matchColumn = isDriver ? 'driver_id' : 'user_id';

  try {
    const { data, error } = await supabase
      .from('rides')
      .select('id, ride_status, ride_type, schedule_type, pickup_address, dropoff_address')
      .eq(matchColumn, user.id)
      .in('ride_status', ACTIVE_RIDE_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return { success: true, created: 0 };
    }

    const ride = data[0];
    const dropoff = ride?.dropoff_address || 'the destination';
    const rideKind = ride?.ride_type || 'ride';

    const title = isDriver
      ? 'Active ride still in progress'
      : 'You already have an active ride';

    const message = isDriver
      ? `You still have an active ${rideKind} heading to ${dropoff}. Tap to reopen it.`
      : `Your ${rideKind} to ${dropoff} is already active. Tap to view live tracking.`;

    const actionUrl = isDriver
      ? `/driver/rides?tab=active&rideId=${ride.id}`
      : `/user/rides?tab=active&rideId=${ride.id}`;

    const result = await sendRideNotification({
      userId: user.id,
      rideId: ride.id,
      title,
      message,
      actionUrl,
    });

    if (result.error) {
      throw result.error;
    }

    return { success: true, created: 1 };
  } catch (error) {
    console.error('notifyActiveRideOnLogin failed:', error);
    return { success: false, error };
  }
}

