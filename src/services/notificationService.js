import { supabase } from '../lib/supabase';

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

  const payload = {
    user_id: userId,
    title,
    message,
    type: NOTIFICATION_TYPES.RIDE,
    action_url: rideId ? `${actionPath}/${rideId}` : actionPath,
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

