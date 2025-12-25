/**
 * Broadcast Ride Notifications Edge Function
 * Sends push notifications to nearby drivers when a ride is created
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface BroadcastRequest {
  rideId: string;
  pickupCoordinates: {
    lat: number;
    lng: number;
  };
  radiusKm?: number;
}

serve(async (req) => {
  try {
    const { rideId, pickupCoordinates, radiusKm = 5 }: BroadcastRequest = await req.json();

    if (!rideId || !pickupCoordinates || !pickupCoordinates.lat || !pickupCoordinates.lng) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get ride details
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('id, service_type, pickup_location, estimated_fare, ride_timing, ride_status')
      .eq('id', rideId)
      .single();

    if (rideError || !ride) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ride not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Only broadcast instant rides
    if (ride.ride_timing !== 'instant' || ride.ride_status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          driversNotified: 0, 
          message: 'Ride is not instant or not pending' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find nearby drivers using RPC function
    const { data: nearbyDrivers, error: driversError } = await supabase.rpc(
      'find_drivers_within_radius',
      {
        pickup_lat: pickupCoordinates.lat,
        pickup_lng: pickupCoordinates.lng,
        radius_km: radiusKm,
      }
    );

    if (driversError) {
      console.error('Error finding nearby drivers:', driversError);
      return new Response(
        JSON.stringify({ success: false, error: driversError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!nearbyDrivers || nearbyDrivers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, driversNotified: 0, message: 'No nearby drivers' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter drivers: must be online and not engaged
    const eligibleDrivers = nearbyDrivers.filter((driver: any) => {
      return driver.is_online === true && 
             driver.is_available === true && 
             !driver.active_ride_id;
    });

    if (eligibleDrivers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          driversNotified: 0, 
          message: 'No eligible drivers (online and available)' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification content
    const serviceTypeDisplay: Record<string, string> = {
      taxi: 'Taxi',
      courier: 'Courier',
      errands: 'Errands',
      school_run: 'School Run',
    };

    const title = `New ${serviceTypeDisplay[ride.service_type] || 'Ride'} Request`;
    const message = ride.pickup_location
      ? `Pickup: ${ride.pickup_location.substring(0, 50)}${ride.pickup_location.length > 50 ? '...' : ''}`
      : 'New ride request nearby';

    // Create notifications for each eligible driver
    const notificationPromises = eligibleDrivers.map(async (driver: any) => {
      const actionUrl = `/driver/rides?rideId=${rideId}`;
      
      const { data: notifInsert, error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: driver.driver_id,
          notification_type: 'new_offer',
          category: 'OFFERS',
          priority: 'HIGH',
          title,
          message,
          action_url: actionUrl,
          ride_id: rideId,
          context_data: {
            service_type: ride.service_type,
            estimated_fare: ride.estimated_fare,
            pickup_location: ride.pickup_location,
            distance_km: driver.distance_km,
          },
        }])
        .select('id')
        .single();

      if (notifError) {
        console.error(`Error creating notification for driver ${driver.driver_id}:`, notifError);
        return null;
      }

      return notifInsert?.id || null;
    });

    const notificationIds = (await Promise.all(notificationPromises)).filter(Boolean);

    return new Response(
      JSON.stringify({
        success: true,
        driversNotified: notificationIds.length,
        eligibleDrivers: eligibleDrivers.length,
        totalNearby: nearbyDrivers.length,
        message: `Notified ${notificationIds.length} eligible drivers`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Broadcast ride notifications error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

