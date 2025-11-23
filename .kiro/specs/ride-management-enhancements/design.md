# Design Document

## Overview

This design document outlines the technical approach for enhancing ride management in the TaxiCab e-hailing PWA. The enhancements focus on preventing drivers from accepting multiple concurrent instant rides, providing active ride notifications to passengers, displaying active ride modals automatically, implementing trip activation controls for drivers, and ensuring all state changes propagate in real-time using Supabase Realtime.

The solution builds upon the existing realtime infrastructure and extends it with:
- Atomic bid acceptance with driver availability checks
- Active ride detection and notification system
- Trip activation workflow for scheduled rides
- Real-time synchronization across all components
- Session-persistent active ride state management

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TaxiCab PWA Frontend                     │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │  Passenger UI  │  │   Driver UI    │  │  Shared Utils │ │
│  │  - ActiveRide  │  │  - Availability│  │  - Realtime   │ │
│  │  - ToastNotif  │  │  - TripActivate│  │  - Validation │ │
│  │  - RideModal   │  │  - ActiveTrip  │  │  - Atomic Ops │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Supabase Realtime Subscriptions            │   │
│  │  - rides table (passenger & driver)                  │   │
│  │  - ride_offers table (bid acceptance)                │   │
│  │  - driver_locations (availability status)            │   │
│  │  - notifications (toast messages)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Database   │  │   Realtime   │  │   RPC Functions  │  │
│  │   - rides    │  │   - Postgres │  │   - accept_bid   │  │
│  │   - offers   │  │   - Channels │  │   - check_avail  │  │
│  │   - drivers  │  │   - Filters  │  │   - activate_trip│  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Database-Level Atomicity**: Use Supabase RPC functions for atomic bid acceptance with availability checks
2. **Realtime-First Updates**: All state changes broadcast via Supabase Realtime for instant UI updates
3. **Session-Independent State**: Store active ride state in database, not browser storage
4. **Optimistic UI with Rollback**: Update UI immediately, rollback on server failure
5. **Toast Notification System**: Centralized toast provider for consistent notifications
6. **Modal State Management**: Use React state with session storage for dismissal tracking

## Components and Interfaces

### 1. Driver Availability Check on Bid Acceptance

**Problem**: Passengers can accept bids from drivers who are already engaged in active trips, leading to conflicts.

**Solution**: Implement atomic bid acceptance with server-side availability check.


#### Database RPC Function

```sql
-- Create RPC function for atomic bid acceptance with availability check
CREATE OR REPLACE FUNCTION accept_driver_bid(
  p_ride_id UUID,
  p_offer_id UUID,
  p_driver_id UUID,
  p_passenger_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_instant_ride_count INTEGER;
  v_result JSON;
BEGIN
  -- Check if driver has any active instant rides
  SELECT COUNT(*)
  INTO v_active_instant_ride_count
  FROM rides
  WHERE driver_id = p_driver_id
    AND ride_timing = 'instant'
    AND ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started');
  
  -- If driver is engaged, reject the bid acceptance
  IF v_active_instant_ride_count > 0 THEN
    -- Create notification for driver
    INSERT INTO notifications (user_id, title, message, type, created_at)
    VALUES (
      p_driver_id,
      'Bid Rejected - Already Engaged',
      'A passenger tried to accept your bid, but you are currently engaged in an active trip',
      'info',
      NOW()
    );
    
    -- Return error response
    v_result := json_build_object(
      'success', false,
      'error', 'driver_unavailable',
      'message', 'Driver is already engaged in a trip'
    );
    RETURN v_result;
  END IF;
  
  -- Driver is available, proceed with bid acceptance
  BEGIN
    -- Update ride with driver assignment
    UPDATE rides
    SET 
      driver_id = p_driver_id,
      ride_status = 'accepted',
      acceptance_status = 'accepted',
      status_updated_at = NOW()
    WHERE id = p_ride_id
      AND user_id = p_passenger_id
      AND ride_status = 'pending';
    
    -- Update accepted offer
    UPDATE ride_offers
    SET 
      offer_status = 'accepted',
      accepted_at = NOW()
    WHERE id = p_offer_id
      AND driver_id = p_driver_id
      AND ride_id = p_ride_id;
    
    -- Reject all other pending offers for this ride
    UPDATE ride_offers
    SET 
      offer_status = 'rejected',
      rejected_at = NOW()
    WHERE ride_id = p_ride_id
      AND id != p_offer_id
      AND offer_status = 'pending';
    
    -- Create notification for driver
    INSERT INTO notifications (user_id, title, message, type, action_url, created_at)
    VALUES (
      p_driver_id,
      '✅ Bid Accepted',
      'Your bid has been accepted! Start heading to the pickup location.',
      'success',
      '/driver/active-trips',
      NOW()
    );
    
    -- Create notification for passenger
    INSERT INTO notifications (user_id, title, message, type, action_url, created_at)
    VALUES (
      p_passenger_id,
      '🚗 Driver Assigned',
      'A driver has been assigned to your ride!',
      'success',
      '/user/active-rides',
      NOW()
    );
    
    -- Return success response
    v_result := json_build_object(
      'success', true,
      'message', 'Bid accepted successfully'
    );
    RETURN v_result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback and return error
    v_result := json_build_object(
      'success', false,
      'error', 'transaction_failed',
      'message', SQLERRM
    );
    RETURN v_result;
  END;
END;
$$;
```


#### Frontend Implementation

```javascript
// src/services/bidAcceptanceService.js

export const acceptDriverBid = async (rideId, offerId, driverId, passengerId) => {
  try {
    console.log('🔄 Accepting driver bid:', {
      rideId,
      offerId,
      driverId,
      timestamp: new Date().toISOString()
    });
    
    // Call RPC function for atomic bid acceptance
    const { data, error } = await supabase.rpc('accept_driver_bid', {
      p_ride_id: rideId,
      p_offer_id: offerId,
      p_driver_id: driverId,
      p_passenger_id: passengerId
    });
    
    if (error) {
      console.error('❌ RPC error:', error);
      throw error;
    }
    
    console.log('📡 Bid acceptance response:', data);
    
    if (!data.success) {
      // Handle specific error cases
      if (data.error === 'driver_unavailable') {
        return {
          success: false,
          error: 'driver_unavailable',
          message: 'This driver is currently engaged in another trip'
        };
      }
      
      return {
        success: false,
        error: data.error,
        message: data.message || 'Failed to accept bid'
      };
    }
    
    return {
      success: true,
      message: 'Bid accepted successfully'
    };
    
  } catch (error) {
    console.error('❌ Error accepting bid:', error);
    return {
      success: false,
      error: 'network_error',
      message: 'Network error. Please try again.'
    };
  }
};
```

```javascript
// src/dashboards/client/components/PassengerOffersPanel.jsx

import { acceptDriverBid } from '../../../services/bidAcceptanceService';
import { useToast } from '../../../components/ui/ToastProvider';

const PassengerOffersPanel = ({ rideId, onAccepted }) => {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [offers, setOffers] = useState([]);
  const [acceptingOfferId, setAcceptingOfferId] = useState(null);
  
  // ... existing offer loading code ...
  
  const handleAcceptOffer = async (offer) => {
    setAcceptingOfferId(offer.id);
    
    try {
      const result = await acceptDriverBid(
        rideId,
        offer.id,
        offer.driver_id,
        user.id
      );
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Driver Assigned',
          message: 'Your ride has been accepted!',
          duration: 5000
        });
        
        // Trigger parent refresh
        if (onAccepted) onAccepted();
      } else {
        // Show error based on type
        if (result.error === 'driver_unavailable') {
          addToast({
            type: 'error',
            title: 'Driver Unavailable',
            message: result.message,
            duration: 6000
          });
          
          // Remove the unavailable offer from display
          setOffers(prev => prev.filter(o => o.id !== offer.id));
        } else {
          addToast({
            type: 'error',
            title: 'Failed to Accept Bid',
            message: result.message || 'Please try again',
            duration: 5000
          });
        }
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to accept bid. Please try again.',
        duration: 5000
      });
    } finally {
      setAcceptingOfferId(null);
    }
  };
  
  // ... rest of component ...
};
```


### 2. Active Ride Toast Notification for Passengers

**Problem**: Passengers who log in with an active ride are not immediately notified.

**Solution**: Implement login-time active ride check with clickable toast notification.

#### Implementation

```javascript
// src/hooks/useActiveRideCheck.js

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import { useNavigate } from 'react-router-dom';

export const useActiveRideCheck = (userId) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeRide, setActiveRide] = useState(null);
  const [hasShownToast, setHasShownToast] = useState(false);
  
  useEffect(() => {
    if (!userId || hasShownToast) return;
    
    const checkForActiveRide = async () => {
      try {
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .eq('user_id', userId)
          .in('ride_status', ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          console.log('🚗 Active ride detected on login:', data.id);
          setActiveRide(data);
          
          // Show clickable toast notification
          addToast({
            type: 'info',
            title: 'Active Ride in Progress',
            message: 'You have an active ride. Click to view details.',
            duration: 10000,
            onClick: () => {
              navigate('/user/active-rides');
            },
            style: {
              backgroundColor: '#3B82F6',
              color: 'white',
              cursor: 'pointer'
            }
          });
          
          setHasShownToast(true);
        }
      } catch (error) {
        console.error('Error checking for active ride:', error);
      }
    };
    
    checkForActiveRide();
  }, [userId, hasShownToast, addToast, navigate]);
  
  return { activeRide };
};
```

```javascript
// src/dashboards/client/ClientDashboard.jsx

import { useActiveRideCheck } from '../../hooks/useActiveRideCheck';

const ClientDashboard = () => {
  const { user } = useAuthStore();
  
  // Check for active ride on mount
  const { activeRide } = useActiveRideCheck(user?.id);
  
  // ... rest of dashboard code ...
};
```


### 3. Active Ride Modal Management

**Problem**: Passengers need automatic display of active ride modal when navigating to rides feed.

**Solution**: Implement active ride check with automatic modal display and session-based dismissal tracking.

#### Implementation

```javascript
// src/dashboards/client/components/ActiveRidesView.jsx

const ActiveRidesView = () => {
  const { user } = useAuthStore();
  const [activeRides, setActiveRides] = useState([]);
  const [showActiveRideModal, setShowActiveRideModal] = useState(false);
  const [primaryActiveRide, setPrimaryActiveRide] = useState(null);
  const [modalDismissed, setModalDismissed] = useState(false);
  
  // Load active rides and check for primary active ride
  useEffect(() => {
    if (!user?.id) return;
    
    const loadActiveRides = async () => {
      try {
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .eq('user_id', user.id)
          .in('ride_status', ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'])
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setActiveRides(data || []);
        
        // Set primary active ride (most recent)
        if (data && data.length > 0 && !modalDismissed) {
          setPrimaryActiveRide(data[0]);
          setShowActiveRideModal(true);
        }
      } catch (error) {
        console.error('Error loading active rides:', error);
      }
    };
    
    loadActiveRides();
  }, [user?.id, modalDismissed]);
  
  // Setup realtime subscription for ride updates
  useEffect(() => {
    if (!user?.id) return;
    
    const subscription = supabase
      .channel(`active-rides-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Ride update:', payload.new);
          
          const updatedRide = payload.new;
          
          // If ride completed or cancelled, close modal
          if (['completed', 'cancelled'].includes(updatedRide.ride_status)) {
            if (primaryActiveRide?.id === updatedRide.id) {
              setShowActiveRideModal(false);
              setPrimaryActiveRide(null);
            }
          }
          
          // Update active rides list
          setActiveRides(prev => 
            prev.map(ride => 
              ride.id === updatedRide.id ? updatedRide : ride
            ).filter(ride => 
              ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'].includes(ride.ride_status)
            )
          );
          
          // Update primary active ride if it's the one that changed
          if (primaryActiveRide?.id === updatedRide.id) {
            setPrimaryActiveRide(updatedRide);
          }
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, primaryActiveRide]);
  
  const handleDismissModal = () => {
    setShowActiveRideModal(false);
    setModalDismissed(true);
    
    // Store dismissal in session storage
    try {
      sessionStorage.setItem(`active-ride-dismissed-${primaryActiveRide?.id}`, 'true');
    } catch (e) {
      console.warn('Failed to store dismissal state:', e);
    }
  };
  
  // ... rest of component ...
  
  return (
    <>
      {/* Active Rides List */}
      {/* ... existing UI ... */}
      
      {/* Active Ride Modal */}
      {showActiveRideModal && primaryActiveRide && (
        <ActiveRideModal
          ride={primaryActiveRide}
          onClose={handleDismissModal}
          onRefresh={() => loadActiveRides()}
        />
      )}
    </>
  );
};
```


### 4. Trip Activation Button for Drivers

**Problem**: Drivers need a way to activate scheduled rides when ready to start.

**Solution**: Implement dynamic trip activation button that changes state and triggers modal.

#### Implementation

```javascript
// src/dashboards/driver/components/ScheduledRidesView.jsx

const ScheduledRidesView = () => {
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [scheduledRides, setScheduledRides] = useState([]);
  const [activatingRideId, setActivatingRideId] = useState(null);
  const [showActiveRideModal, setShowActiveRideModal] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  
  // Load scheduled rides
  useEffect(() => {
    if (!user?.id) return;
    
    const loadScheduledRides = async () => {
      try {
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .eq('driver_id', user.id)
          .eq('ride_status', 'accepted')
          .in('ride_timing', ['scheduled_single', 'scheduled_recurring'])
          .order('scheduled_datetime', { ascending: true });
        
        if (error) throw error;
        setScheduledRides(data || []);
      } catch (error) {
        console.error('Error loading scheduled rides:', error);
      }
    };
    
    loadScheduledRides();
  }, [user?.id]);
  
  // Check if ride can be activated (within 30 minutes of scheduled time)
  const canActivateRide = (ride) => {
    if (!ride.scheduled_datetime) return false;
    
    const scheduledTime = new Date(ride.scheduled_datetime);
    const now = new Date();
    const diffMinutes = (scheduledTime - now) / (1000 * 60);
    
    // Can activate if within 30 minutes of scheduled time
    return diffMinutes <= 30 && diffMinutes >= -5; // Allow 5 minutes past scheduled time
  };
  
  // Activate trip
  const handleActivateTrip = async (ride) => {
    setActivatingRideId(ride.id);
    
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          ride_status: 'driver_on_way',
          status_updated_at: new Date().toISOString()
        })
        .eq('id', ride.id)
        .eq('driver_id', user.id)
        .eq('ride_status', 'accepted');
      
      if (error) throw error;
      
      addToast({
        type: 'success',
        title: 'Trip Activated',
        message: 'You can now start heading to the pickup location',
        duration: 5000
      });
      
      // Reload scheduled rides
      const { data } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user.id)
        .eq('ride_status', 'accepted')
        .in('ride_timing', ['scheduled_single', 'scheduled_recurring'])
        .order('scheduled_datetime', { ascending: true });
      
      setScheduledRides(data || []);
      
    } catch (error) {
      console.error('Error activating trip:', error);
      addToast({
        type: 'error',
        title: 'Failed to Activate Trip',
        message: 'Please try again',
        duration: 5000
      });
    } finally {
      setActivatingRideId(null);
    }
  };
  
  // View trip details
  const handleViewDetails = (ride) => {
    setSelectedRide(ride);
    setShowActiveRideModal(true);
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Scheduled Rides</h2>
      
      {scheduledRides.map(ride => {
        const isActivatable = canActivateRide(ride);
        const isWithin30Min = isActivatable;
        
        return (
          <div
            key={ride.id}
            className={`p-4 rounded-lg border-2 ${
              isWithin30Min ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'
            }`}
          >
            {/* Ride details */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">
                  {ride.service_type?.replace('_', ' ')}
                </h3>
                {isWithin30Min && (
                  <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full font-medium">
                    Ready to Start
                  </span>
                )}
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p>📍 Pickup: {ride.pickup_address}</p>
                <p>📍 Dropoff: {ride.dropoff_address}</p>
                <p>🕐 Scheduled: {new Date(ride.scheduled_datetime).toLocaleString()}</p>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              {ride.ride_status === 'accepted' ? (
                <Button
                  variant="primary"
                  onClick={() => handleActivateTrip(ride)}
                  disabled={!isActivatable || activatingRideId === ride.id}
                  className="flex-1"
                >
                  {activatingRideId === ride.id ? 'Activating...' : 'Activate Trip'}
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    disabled
                    className="flex-1"
                  >
                    Trip Active
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleViewDetails(ride)}
                  >
                    View Details
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Active Ride Modal */}
      {showActiveRideModal && selectedRide && (
        <ActiveRideModal
          ride={selectedRide}
          onClose={() => setShowActiveRideModal(false)}
        />
      )}
    </div>
  );
};
```


### 5. Real-Time Synchronization System

**Problem**: All components need to stay synchronized with real-time updates without page refreshes.

**Solution**: Comprehensive Supabase Realtime subscriptions with proper cleanup and error handling.

#### Centralized Realtime Hook

```javascript
// src/hooks/useRideRealtime.js

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useRideRealtime = (userId, userType = 'passenger') => {
  const [rides, setRides] = useState([]);
  const [offers, setOffers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    if (!userId) return;
    
    console.log(`🔌 Setting up realtime for ${userType}:`, userId);
    
    // Subscribe to rides table
    const ridesChannel = supabase
      .channel(`${userType}-rides-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: userType === 'passenger' 
            ? `user_id=eq.${userId}` 
            : `driver_id=eq.${userId}`
        },
        (payload) => {
          console.log('📡 Ride update:', {
            event: payload.eventType,
            rideId: payload.new?.id,
            status: payload.new?.ride_status,
            timestamp: new Date().toISOString()
          });
          
          if (payload.eventType === 'INSERT') {
            setRides(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setRides(prev => 
              prev.map(ride => 
                ride.id === payload.new.id ? payload.new : ride
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setRides(prev => prev.filter(ride => ride.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Rides subscription status:', status);
      });
    
    // Subscribe to ride_offers (for passengers)
    let offersChannel;
    if (userType === 'passenger') {
      offersChannel = supabase
        .channel(`passenger-offers-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ride_offers'
          },
          (payload) => {
            console.log('📡 Offer update:', payload);
            
            if (payload.eventType === 'INSERT') {
              setOffers(prev => [...prev, payload.new]);
            } else if (payload.eventType === 'UPDATE') {
              setOffers(prev => 
                prev.map(offer => 
                  offer.id === payload.new.id ? payload.new : offer
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setOffers(prev => prev.filter(offer => offer.id !== payload.old.id));
            }
          }
        )
        .subscribe();
    }
    
    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 Notification received:', payload.new);
          setNotifications(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();
    
    // Cleanup subscriptions
    return () => {
      console.log(`🔌 Cleaning up realtime for ${userType}`);
      ridesChannel.unsubscribe();
      if (offersChannel) offersChannel.unsubscribe();
      notificationsChannel.unsubscribe();
    };
  }, [userId, userType]);
  
  return { rides, offers, notifications };
};
```


### 6. Driver Active Trip Indicator

**Problem**: Drivers need a clear visual indicator when they have an active instant trip.

**Solution**: Implement prominent indicator in driver dashboard with trip details.

#### Implementation

```javascript
// src/dashboards/driver/components/ActiveTripIndicator.jsx

const ActiveTripIndicator = ({ activeTrip, onViewDetails }) => {
  if (!activeTrip || activeTrip.ride_timing !== 'instant') return null;
  
  return (
    <div className="fixed top-20 left-0 right-0 z-40 mx-4">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-lg p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🚗</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">Active Trip in Progress</h3>
              <p className="text-sm text-green-100">
                {activeTrip.pickup_address} → {activeTrip.dropoff_address}
              </p>
            </div>
          </div>
          
          <button
            onClick={onViewDetails}
            className="px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
          >
            View Details
          </button>
        </div>
        
        <div className="mt-3 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span>📍</span>
            <span>Status: {activeTrip.ride_status.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💰</span>
            <span>Fare: ${parseFloat(activeTrip.estimated_cost).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Usage in DriverRidesHub
const DriverRidesHub = () => {
  const [activeInstantTrip, setActiveInstantTrip] = useState(null);
  
  // ... existing code ...
  
  // Check for active instant trip
  useEffect(() => {
    const checkActiveTrip = async () => {
      const { data } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user.id)
        .eq('ride_timing', 'instant')
        .in('ride_status', ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'])
        .maybeSingle();
      
      setActiveInstantTrip(data);
    };
    
    checkActiveTrip();
  }, [user?.id]);
  
  return (
    <>
      <ActiveTripIndicator 
        activeTrip={activeInstantTrip}
        onViewDetails={() => setShowDetailsModal(true)}
      />
      
      {/* Rest of dashboard */}
    </>
  );
};
```


## Data Models

### Ride Status Flow with Activation

```
Scheduled Rides:
accepted → [ACTIVATE TRIP] → driver_on_way → driver_arrived → trip_started → completed

Instant Rides:
pending → accepted → driver_on_way → driver_arrived → trip_started → completed
```

### Driver Availability States

```javascript
{
  is_online: boolean,           // Driver is logged in and accepting requests
  is_available: boolean,         // Driver can accept new instant rides
  has_active_instant_ride: boolean,  // Driver is engaged in an instant ride
  active_scheduled_rides: number     // Count of accepted scheduled rides
}
```

### Active Ride Detection Logic

```javascript
// For passengers
const isActiveRide = (ride) => {
  return ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'].includes(ride.ride_status);
};

// For drivers - instant rides only block new instant rides
const hasActiveInstantRide = (rides) => {
  return rides.some(ride => 
    ride.ride_timing === 'instant' &&
    ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'].includes(ride.ride_status)
  );
};
```

### Database Schema Updates

```sql
-- Add index for faster active ride queries
CREATE INDEX idx_rides_active_instant 
ON rides (driver_id, ride_timing, ride_status) 
WHERE ride_timing = 'instant' 
  AND ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started');

-- Add index for passenger active rides
CREATE INDEX idx_rides_active_passenger 
ON rides (user_id, ride_status) 
WHERE ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started');

-- Add index for scheduled rides activation
CREATE INDEX idx_rides_scheduled_activation 
ON rides (driver_id, ride_status, scheduled_datetime) 
WHERE ride_status = 'accepted' 
  AND ride_timing IN ('scheduled_single', 'scheduled_recurring');
```

## Error Handling

### Bid Acceptance Errors

```javascript
const handleBidAcceptanceError = (error) => {
  co
#
# Error Handling

### Bid Acceptance Errors

```javascript
const handleBidAcceptanceError = (error, errorType) => {
  const errorMessages = {
    driver_unavailable: {
      title: 'Driver Unavailable',
      message: 'This driver is currently engaged in another trip. Please try another driver.',
      action: 'refresh_offers'
    },
    transaction_failed: {
      title: 'Transaction Failed',
      message: 'Failed to accept bid due to a database error. Please try again.',
      action: 'retry'
    },
    network_error: {
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your connection.',
      action: 'retry'
    }
  };
  
  const errorConfig = errorMessages[errorType] || {
    title: 'Error',
    message: 'An unexpected error occurred. Please try again.',
    action: 'retry'
  };
  
  return errorConfig;
};
```

### Realtime Connection Errors

```javascript
const handleRealtimeError = (error, channelName) => {
  console.error(`Realtime error on ${channelName}:`, error);
  
  // Show user-friendly message
  addToast({
    type: 'warning',
    title: 'Connection Issue',
    message: 'Reconnecting to live updates...',
    duration: 3000
  });
  
  // Attempt reconnection after delay
  setTimeout(() => {
    supabase.realtime.connect();
  }, 3000);
};
```

### Trip Activation Errors

```javascript
const handleTripActivationError = (error, ride) => {
  console.error('Trip activation error:', error);
  
  // Check if ride was already activated by another process
  if (error.code === 'PGRST116') {
    addToast({
      type: 'info',
      title: 'Trip Already Active',
      message: 'This trip has already been activated.',
      duration: 5000
    });
    return;
  }
  
  // Generic error
  addToast({
    type: 'error',
    title: 'Activation Failed',
    message: 'Failed to activate trip. Please try again.',
    duration: 5000
  });
};
```

## Testing Strategy

### Unit Tests
- Bid acceptance logic with availability checks
- Active ride detection algorithms
- Trip activation eligibility checks
- Toast notification triggering logic

### Integration Tests
- Atomic bid acceptance with rollback scenarios
- Realtime subscription setup and cleanup
- Active ride modal display conditions
- Trip activation workflow

### End-to-End Tests (Manual with Chrome DevTools)

1. **Test Driver Availability Check**
   - Driver A accepts instant ride
   - Passenger tries to accept Driver A's bid on another ride
   - Verify bid rejection with notification
   - Verify Driver A receives notification

2. **Test Active Ride Toast Notification**
   - Passenger logs in with active ride
   - Verify toast appears at top of screen
   - Click toast and verify navigation to active rides
   - Verify toast only shows once per session

3. **Test Active Ride Modal**
   - Passenger navigates to rides feed with active ride
   - Verify modal displays automatically
   - Dismiss modal and verify it stays dismissed
   - Change ride status and verify modal updates

4. **Test Trip Activation**
   - Driver has scheduled ride 25 minutes away
   - Verify "Activate Trip" button is enabled
   - Click button and verify status changes to "driver_on_way"
   - Verify button changes to "Trip Active" (disabled)
   - Verify "View Details" button appears
   - Click "View Details" and verify modal opens

5. **Test Real-Time Synchronization**
   - Open passenger and driver dashboards in separate browsers
   - Driver accepts bid
   - Verify passenger sees update within 2 seconds
   - Driver updates trip status
   - Verify passenger sees status change in real-time
   - Verify toast notifications appear for status changes

6. **Test Concurrent Bid Acceptance**
   - Two passengers try to accept same driver's bid simultaneously
   - Verify only one succeeds
   - Verify other receives "driver unavailable" error
   - Verify unavailable offer is removed from display

## Performance Considerations

1. **Database Query Optimization**
   - Use indexes for active ride queries
   - Limit realtime subscription filters to necessary columns
   - Use `maybeSingle()` instead of `limit(1).single()` for optional queries

2. **Realtime Subscription Management**
   - Unsubscribe from channels on component unmount
   - Use specific filters to reduce unnecessary updates
   - Batch multiple updates within 100ms window

3. **Toast Notification Throttling**
   - Limit toast notifications to one per 2 seconds
   - Queue notifications if multiple arrive simultaneously
   - Auto-dismiss after specified duration

4. **Modal Rendering Optimization**
   - Use React.memo for static modal content
   - Lazy load modal components
   - Preload active ride data before showing modal

5. **Session Storage Usage**
   - Store only essential dismissal state
   - Clear old dismissal keys on logout
   - Handle storage quota exceeded errors

## Security Considerations

1. **RPC Function Security**
   - Use SECURITY DEFINER for atomic operations
   - Validate user permissions within function
   - Prevent SQL injection with parameterized queries
   - Log all bid acceptance attempts for audit

2. **Realtime Subscription Security**
   - Use RLS policies to filter subscription data
   - Verify user can only subscribe to their own data
   - Rate limit subscription creation

3. **Client-Side Validation**
   - Validate all user inputs before API calls
   - Sanitize data displayed in toasts and modals
   - Prevent XSS in notification messages

4. **State Management Security**
   - Don't store sensitive data in session storage
   - Clear active ride state on logout
   - Validate ride ownership before displaying details

## Deployment Notes

1. **Database Migrations**
   - Create RPC function for bid acceptance
   - Add indexes for active ride queries
   - Update RLS policies if needed

2. **Testing Accounts**
   - Driver: driver.test@bmtoa.co.zw / Drivere@123
   - Passenger: user.test@taxicab.co.zw / User@123
   - Local server: http://localhost:4030

3. **Rollback Plan**
   - Keep old bid acceptance logic as fallback
   - Feature flag for new active ride checks
   - Monitor error rates in production

4. **Monitoring**
   - Track bid acceptance success/failure rates
   - Monitor realtime connection stability
   - Log trip activation attempts
   - Track toast notification display rates

## Architecture Diagrams

### Bid Acceptance Flow

```
Passenger                    Frontend                    Backend                    Driver
   |                            |                           |                          |
   |--Click Accept Bid--------->|                           |                          |
   |                            |--Call RPC Function------->|                          |
   |                            |                           |--Check Driver Avail----->|
   |                            |                           |<--Has Active Ride--------|
   |                            |<--Return Error------------|                          |
   |<--Show Error Toast---------|                           |                          |
   |                            |                           |--Send Notification------>|
   |                            |                           |                          |--Show Toast
```

### Active Ride Detection Flow

```
Passenger Login              Frontend                    Database
   |                            |                           |
   |--Login Success------------>|                           |
   |                            |--Query Active Rides------>|
   |                            |<--Return Active Ride------|
   |<--Show Toast Notification--|                           |
   |                            |--Subscribe to Updates---->|
   |                            |                           |
   |--Navigate to Rides-------->|                           |
   |                            |--Check Active Ride------->|
   |<--Show Active Modal--------|<--Return Active Ride------|
```

### Trip Activation Flow

```
Driver                       Frontend                    Database                   Passenger
   |                            |                           |                          |
   |--Click Activate Trip------>|                           |                          |
   |                            |--Update Status----------->|                          |
   |                            |<--Success-----------------|                          |
   |<--Button Changes-----------|                           |--Broadcast Update------->|
   |<--Show View Details--------|                           |                          |--Update UI
   |                            |                           |                          |--Show Toast
```

## Conclusion

This design provides a comprehensive solution for ride management enhancements that:

1. **Prevents conflicts** through atomic bid acceptance with driver availability checks
2. **Improves awareness** with active ride toast notifications and automatic modal display
3. **Enhances control** with trip activation buttons and dynamic state management
4. **Ensures consistency** through real-time synchronization across all components
5. **Maintains reliability** with proper error handling and rollback mechanisms

The implementation leverages existing Supabase Realtime infrastructure while adding new RPC functions for atomic operations. All components are designed to work seamlessly together without breaking existing functionality.
