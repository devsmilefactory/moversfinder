 # Design Document

## Overview

This design document outlines the technical approach for fixing critical issues in the TaxiCab e-hailing PWA. The fixes address page refresh errors, real-time update failures, fare calculation bugs, trip status update issues, and UI overflow problems. The solution leverages Supabase Realtime subscriptions, optimized database queries, improved state management, and comprehensive testing using Chrome DevTools and Supabase MCP.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TaxiCab PWA Frontend                     │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │  Passenger UI  │  │   Driver UI    │  │  Shared Utils │ │
│  │  - BookRide    │  │  - RideRequests│  │  - Pricing    │ │
│  │  - TripStatus  │  │  - ActiveTrip  │  │  - Realtime   │ │
│  │  - RideOffers  │  │  - TripControl │  │  - Validation │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Supabase Realtime Subscriptions            │   │
│  │  - rides table (passenger & driver)                  │   │
│  │  - ride_offers table (passenger)                     │   │
│  │  - ride_acceptance_queue table (driver)              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Database   │  │   Realtime   │  │   Edge Functions │  │
│  │   - rides    │  │   - Postgres │  │   - Triggers     │  │
│  │   - offers   │  │   - Channels │  │   - Webhooks     │  │
│  │   - queue    │  │   - Filters  │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Realtime-First Approach**: All status updates use Supabase Realtime subscriptions instead of polling
2. **Optimistic UI Updates**: UI updates immediately on user action, with rollback on failure
3. **Centralized State Management**: Use Zustand stores for managing ride state across components
4. **Fare Calculation Service**: Isolated pricing logic in a dedicated service module
5. **Error Boundary Pattern**: Graceful error handling with user-friendly messages

## Components and Interfaces

### 1. Page Refresh Error Fix

**Problem**: App shows "page temporarily moved" error on refresh due to improper routing and auth state handling.

**Solution**:

```javascript
// src/App.jsx - Enhanced routing with proper refresh handling
const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check auth state
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Fetch user profile to determine active mode
          const { data: profile } = await supabase
            .from('profiles')
            .select('active_profile_type, last_selected_profile_type')
            .eq('id', session.user.id)
            .single();
          
          // Navigate to appropriate dashboard using replace
          const profileType = profile?.active_profile_type || profile?.last_selected_profile_type;
          if (profileType === 'driver') {
            navigate('/driver/dashboard', { replace: true });
          } else {
            navigate('/passenger/dashboard', { replace: true });
          }
        } else {
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('App initialization error:', error);
        navigate('/login', { replace: true });
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeApp();
  }, [navigate]);
  
  if (isInitializing) {
    return <LoadingScreen />;
  }
  
  return <Routes>{/* route definitions */}</Routes>;
};
```

**Key Changes**:
- Use `navigate(..., { replace: true })` to prevent back button issues
- Properly initialize auth state before rendering routes
- Handle edge cases where profile data is missing
- Show loading state during initialization

### 2. Realtime Updates System

**Problem**: App requires manual refresh to see status changes.

**Solution**: Implement comprehensive Supabase Realtime subscriptions.

#### Passenger Realtime Hook

```javascript
// src/hooks/usePassengerRealtime.js
export const usePassengerRealtime = (userId) => {
  const [rides, setRides] = useState([]);
  const [offers, setOffers] = useState([]);
  
  useEffect(() => {
    if (!userId) return;
    
    // Subscribe to rides table for user's rides
    const ridesChannel = supabase
      .channel(`passenger-rides-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Ride update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setRides(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setRides(prev => prev.map(ride => 
              ride.id === payload.new.id ? payload.new : ride
            ));
          } else if (payload.eventType === 'DELETE') {
            setRides(prev => prev.filter(ride => ride.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    // Subscribe to ride_offers for active rides
    const offersChannel = supabase
      .channel(`passenger-offers-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_offers',
          filter: `ride_id=in.(${rides.map(r => r.id).join(',')})`
        },
        (payload) => {
          console.log('Offer update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setOffers(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setOffers(prev => prev.map(offer => 
              offer.id === payload.new.id ? payload.new : offer
            ));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(ridesChannel);
      supabase.removeChannel(offersChannel);
    };
  }, [userId, rides]);
  
  return { rides, offers };
};
```

#### Driver Realtime Hook

```javascript
// src/hooks/useDriverRealtime.js
export const useDriverRealtime = (driverId, driverLocation) => {
  const [rideRequests, setRideRequests] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  
  useEffect(() => {
    if (!driverId) return;
    
    // Subscribe to ride_acceptance_queue for new requests
    const queueChannel = supabase
      .channel(`driver-queue-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_acceptance_queue',
          filter: `driver_id=eq.${driverId}`
        },
        (payload) => {
          console.log('Queue update:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Fetch full ride details
            fetchRideDetails(payload.new.ride_id).then(ride => {
              // Apply distance filter for instant rides
              if (ride.ride_timing === 'instant') {
                const distance = calculateDistance(
                  driverLocation,
                  { lat: ride.pickup_lat, lng: ride.pickup_lng }
                );
                if (distance <= 5) {
                  setRideRequests(prev => [...prev, ride]);
                }
              } else {
                // Show all scheduled rides
                setRideRequests(prev => [...prev, ride]);
              }
            });
          } else if (payload.eventType === 'DELETE') {
            setRideRequests(prev => prev.filter(r => r.id !== payload.old.ride_id));
          }
        }
      )
      .subscribe();
    
    // Subscribe to rides table for active trips
    const tripsChannel = supabase
      .channel(`driver-trips-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `driver_id=eq.${driverId}`
        },
        (payload) => {
          console.log('Trip update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            setActiveTrips(prev => prev.map(trip => 
              trip.id === payload.new.id ? payload.new : trip
            ));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(tripsChannel);
    };
  }, [driverId, driverLocation]);
  
  return { rideRequests, activeTrips };
};
```

### 3. Fare Calculation Service

**Problem**: Inconsistent and incorrect fare calculations across different service types.

**Solution**: Centralized pricing service with clear calculation logic.

```javascript
// src/services/pricingService.js

const PRICING_CONFIG = {
  taxi: {
    minimumFare: 5.00,
    costPerKm: 1.50
  },
  courier: {
    minimumFare: 3.00,
    costPerKm: 1.20
  },
  school_run: {
    minimumFare: 10.00,
    costPerKm: 2.00
  },
  work_run: {
    minimumFare: 10.00,
    costPerKm: 2.00
  },
  errands: {
    minimumFare: 5.00,
    costPerKm: 1.50,
    stopFee: 2.00
  },
  bulk_trips: {
    minimumFare: 5.00,
    costPerKm: 1.50
  }
};

export const calculateFare = (bookingData) => {
  const { 
    serviceType, 
    distanceKm, 
    isRecurring, 
    isRoundTrip,
    scheduledDates = [],
    errands = [],
    numberOfTrips = 1
  } = bookingData;
  
  const config = PRICING_CONFIG[serviceType];
  if (!config) throw new Error(`Unknown service type: ${serviceType}`);
  
  let baseFare = 0;
  let breakdown = {};
  
  // Calculate base fare based on service type
  switch (serviceType) {
    case 'taxi':
    case 'courier':
      baseFare = Math.max(
        config.minimumFare,
        distanceKm * config.costPerKm
      );
      breakdown.baseCost = baseFare;
      
      // Double for recurring
      if (isRecurring) {
        baseFare *= 2;
        breakdown.recurringMultiplier = 2;
      }
      
      // Multiply by number of dates
      if (scheduledDates.length > 0) {
        baseFare *= scheduledDates.length;
        breakdown.dateMultiplier = scheduledDates.length;
      }
      break;
      
    case 'school_run':
    case 'work_run':
      baseFare = Math.max(
        config.minimumFare,
        distanceKm * config.costPerKm
      );
      breakdown.baseCost = baseFare;
      
      // Double for round trip
      if (isRoundTrip) {
        baseFare *= 2;
        breakdown.roundTripMultiplier = 2;
      }
      
      // Multiply by number of dates
      if (scheduledDates.length > 0) {
        baseFare *= scheduledDates.length;
        breakdown.dateMultiplier = scheduledDates.length;
      }
      break;
      
    case 'errands':
      // Calculate cost for each errand
      const errandCosts = errands.map((errand, index) => {
        const distance = index === 0 
          ? calculateDistance(bookingData.pickupLocation, errand.location)
          : calculateDistance(errands[index - 1].location, errand.location);
        
        return Math.max(config.minimumFare, distance * config.costPerKm) + config.stopFee;
      });
      
      baseFare = errandCosts.reduce((sum, cost) => sum + cost, 0);
      breakdown.errandCosts = errandCosts;
      breakdown.totalErrandCost = baseFare;
      
      // Multiply by number of dates
      if (scheduledDates.length > 0) {
        baseFare *= scheduledDates.length;
        breakdown.dateMultiplier = scheduledDates.length;
      }
      break;
      
    case 'bulk_trips':
      baseFare = Math.max(
        config.minimumFare,
        distanceKm * config.costPerKm
      );
      breakdown.perTripCost = baseFare;
      
      // Multiply by number of trips
      baseFare *= numberOfTrips;
      breakdown.tripMultiplier = numberOfTrips;
      break;
  }
  
  return {
    totalFare: parseFloat(baseFare.toFixed(2)),
    breakdown
  };
};
```

### 4. Trip Status Update System

**Problem**: Driver status updates don't propagate to passengers in real-time, and trip completion doesn't trigger post-ride form.

**Solution**: Implement proper status update flow with history tracking.

```javascript
// src/services/tripStatusService.js

export const updateTripStatus = async (rideId, newStatus, driverId) => {
  try {
    const timestamp = new Date().toISOString();
    const updates = {
      ride_status: newStatus,
      status_updated_at: timestamp
    };
    
    // Add specific timestamps based on status
    switch (newStatus) {
      case 'driver_on_way':
        // No additional timestamp needed
        break;
      case 'driver_arrived':
        updates.actual_pickup_time = timestamp;
        break;
      case 'trip_started':
        updates.trip_started_at = timestamp;
        break;
      case 'trip_completed':
        updates.trip_completed_at = timestamp;
        updates.actual_dropoff_time = timestamp;
        break;
    }
    
    // Update ride status
    const { data: ride, error: updateError } = await supabase
      .from('rides')
      .update(updates)
      .eq('id', rideId)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // Create status history entry
    const { error: historyError } = await supabase
      .from('ride_status_history')
      .insert({
        ride_id: rideId,
        old_status: ride.ride_status,
        new_status: newStatus,
        changed_by: driverId,
        changed_at: timestamp
      });
    
    if (historyError) console.error('Failed to create history:', historyError);
    
    console.log(`Trip ${rideId} status updated to ${newStatus}`);
    
    return { success: true, ride };
  } catch (error) {
    console.error('Failed to update trip status:', error);
    return { success: false, error };
  }
};
```

### 5. Post-Ride Rating Form

**Problem**: Rating form doesn't appear after trip completion.

**Solution**: Trigger modal display based on realtime status update.

```javascript
// src/components/passenger/PostRideRatingModal.jsx

export const PostRideRatingModal = ({ ride, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  
  const handleSubmit = async () => {
    try {
      // Update ride with rating
      const { error: ratingError } = await supabase
        .from('rides')
        .update({
          rating,
          review,
          rated_at: new Date().toISOString()
        })
        .eq('id', ride.id);
      
      if (ratingError) throw ratingError;
      
      // Save as template if requested
      if (saveAsTemplate) {
        const { error: templateError } = await supabase
          .from('saved_trips')
          .insert({
            user_id: ride.user_id,
            name: `${ride.service_type} - ${ride.pickup_location}`,
            service_type: ride.service_type,
            pickup_location: ride.pickup_location,
            dropoff_location: ride.dropoff_location,
            additional_stops: ride.additional_stops,
            estimated_cost: ride.fare
          });
        
        if (templateError) console.error('Failed to save template:', templateError);
      }
      
      onSubmit({ rating, review, savedAsTemplate: saveAsTemplate });
      onClose();
    } catch (error) {
      console.error('Failed to submit rating:', error);
    }
  };
  
  return (
    <Modal isOpen onClose={onClose}>
      <h2>Rate Your Trip</h2>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        placeholder="Share your experience (optional)"
        value={review}
        onChange={(e) => setReview(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={saveAsTemplate}
          onChange={(e) => setSaveAsTemplate(e.target.checked)}
        />
        Save this trip as a template for future bookings
      </label>
      <button onClick={handleSubmit} disabled={rating === 0}>
        Submit Rating
      </button>
    </Modal>
  );
};

// Usage in passenger dashboard
const PassengerDashboard = () => {
  const { rides } = usePassengerRealtime(userId);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [completedRide, setCompletedRide] = useState(null);
  
  useEffect(() => {
    // Check for newly completed rides
    const justCompleted = rides.find(
      ride => ride.ride_status === 'trip_completed' && !ride.rated_at
    );
    
    if (justCompleted) {
      setCompletedRide(justCompleted);
      setShowRatingModal(true);
    }
  }, [rides]);
  
  return (
    <>
      {/* Dashboard content */}
      {showRatingModal && completedRide && (
        <PostRideRatingModal
          ride={completedRide}
          onClose={() => setShowRatingModal(false)}
          onSubmit={(data) => console.log('Rating submitted:', data)}
        />
      )}
    </>
  );
};
```

### 6. Active Trip Modal UI Optimization

**Problem**: Driver's active trip modal overflows and requires scrolling.

**Solution**: Redesign with compact layout and collapsible sections.

```javascript
// src/components/driver/ActiveTripModal.jsx

export const ActiveTripModal = ({ trip, onStatusUpdate, onClose }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  
  const getNextAction = () => {
    switch (trip.ride_status) {
      case 'accepted':
        return { label: 'On My Way', status: 'driver_on_way' };
      case 'driver_on_way':
        return { label: 'Arrived', status: 'driver_arrived' };
      case 'driver_arrived':
        return { label: 'Start Trip', status: 'trip_started' };
      case 'trip_started':
        return { label: 'Complete Trip', status: 'trip_completed' };
      default:
        return null;
    }
  };
  
  const nextAction = getNextAction();
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Active Trip</h2>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Essential Info - Always Visible */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-green-600">📍</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Pickup</p>
                <p className="text-sm font-medium truncate">{trip.pickup_location}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-red-600">📍</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Dropoff</p>
                <p className="text-sm font-medium truncate">{trip.dropoff_location}</p>
              </div>
            </div>
            
            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Passenger</p>
                <p className="font-medium">{trip.passenger_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Contact</p>
                <a href={`tel:${trip.contact_number}`} className="font-medium text-blue-600">
                  {trip.contact_number}
                </a>
              </div>
            </div>
          </div>
          
          {/* Collapsible Sections */}
          {trip.special_requests && (
            <CollapsibleSection
              title="Special Instructions"
              isExpanded={expandedSection === 'instructions'}
              onToggle={() => setExpandedSection(
                expandedSection === 'instructions' ? null : 'instructions'
              )}
            >
              <p className="text-sm text-gray-700">{trip.special_requests}</p>
            </CollapsibleSection>
          )}
          
          {trip.service_type === 'courier' && trip.courier_package_details && (
            <CollapsibleSection
              title="Package Details"
              isExpanded={expandedSection === 'package'}
              onToggle={() => setExpandedSection(
                expandedSection === 'package' ? null : 'package'
              )}
            >
              <div className="text-sm space-y-1">
                <p><span className="text-gray-500">Size:</span> {trip.package_size}</p>
                <p><span className="text-gray-500">Details:</span> {trip.courier_package_details}</p>
                {trip.recipient_name && (
                  <>
                    <p><span className="text-gray-500">Recipient:</span> {trip.recipient_name}</p>
                    <p><span className="text-gray-500">Phone:</span> {trip.recipient_phone}</p>
                  </>
                )}
              </div>
            </CollapsibleSection>
          )}
        </div>
        
        {/* Footer - Fixed */}
        <div className="p-4 border-t space-y-2">
          {nextAction && (
            <button
              onClick={() => onStatusUpdate(trip.id, nextAction.status)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              {nextAction.label}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const CollapsibleSection = ({ title, isExpanded, onToggle, children }) => (
  <div className="border rounded-lg">
    <button
      onClick={onToggle}
      className="w-full p-3 flex justify-between items-center text-left"
    >
      <span className="text-sm font-medium">{title}</span>
      <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
    </button>
    {isExpanded && (
      <div className="px-3 pb-3">
        {children}
      </div>
    )}
  </div>
);
```

## Data Models

### Ride Status Flow

```
pending → accepted → driver_on_way → driver_arrived → trip_started → trip_completed
                                                                    ↘ cancelled
```

### Key Database Tables

1. **rides**: Main ride records with status tracking
2. **ride_offers**: Driver offers for rides
3. **ride_acceptance_queue**: Queue of rides shown to drivers
4. **ride_status_history**: Audit trail of status changes
5. **driver_locations**: Real-time driver location tracking

## Error Handling

### Realtime Connection Errors

```javascript
const handleRealtimeError = (error) => {
  console.error('Realtime error:', error);
  
  // Show user-friendly message
  toast.error('Connection lost. Reconnecting...');
  
  // Attempt reconnection
  setTimeout(() => {
    supabase.realtime.connect();
  }, 3000);
};
```

### Status Update Failures

```javascript
const handleStatusUpdateError = (error, rideId, attemptedStatus) => {
  console.error('Status update failed:', error);
  
  // Rollback optimistic update
  setRides(prev => prev.map(ride => 
    ride.id === rideId ? { ...ride, ride_status: ride.previousStatus } : ride
  ));
  
  // Notify user
  toast.error('Failed to update trip status. Please try again.');
};
```

## Testing Strategy

### Unit Tests
- Fare calculation logic for all service types
- Distance calculation utilities
- Status transition validation

### Integration Tests
- Realtime subscription setup and teardown
- Status update flow from driver to passenger
- Fare calculation with various configurations

### End-to-End Tests (Manual with Chrome DevTools)
1. Test page refresh in different states (logged in/out, driver/passenger mode)
2. Test realtime updates by having two browser windows open (driver and passenger)
3. Test fare calculations for each service type with different parameters
4. Test complete trip flow from booking to completion
5. Test 5km radius filtering for driver ride requests

### Chrome DevTools Testing Protocol

```javascript
// Enable verbose logging for debugging
localStorage.setItem('supabase.debug', 'true');

// Monitor realtime events
supabase.realtime.onMessage((message) => {
  console.log('Realtime message:', message);
});

// Track subscription status
supabase.realtime.onOpen(() => console.log('Realtime connected'));
supabase.realtime.onClose(() => console.log('Realtime disconnected'));
supabase.realtime.onError((error) => console.error('Realtime error:', error));
```

### 7. Driver Offers Display Optimization

**Problem**: Driver offers are displayed in the middle of the ride details section, causing visual conflict with ride information.

**Solution**: Reposition offers to the bottom of the ride card with enhanced visual styling.

```javascript
// src/dashboards/client/components/ActiveRidesView.jsx

// Add CSS for pulse animation
const pulseAnimation = `
@keyframes pulse-offer {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.95;
    transform: scale(1.01);
  }
}

.pulse-offer {
  animation: pulse-offer 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
`;

// Updated ride details layout
<div className="bg-white rounded-lg shadow-sm border border-gray-200">
  {/* Header */}
  <div className="p-6 border-b border-gray-200">
    {/* Status and timeline */}
  </div>

  {/* Map */}
  <div className="h-96 relative">
    <MapView {...mapProps} />
  </div>

  {/* Ride Details */}
  <div className="p-6 space-y-4">
    {/* Locations */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Pickup and dropoff */}
    </div>

    {/* Driver Info (if assigned) */}
    {selectedRide.driver_id && (
      <div className="bg-gray-50 rounded-lg p-4">
        {/* Driver details */}
      </div>
    )}

    {/* Actions */}
    <div className="flex gap-3 pt-4 border-t border-gray-200">
      {/* Cancel and support buttons */}
    </div>
  </div>

  {/* Offers Panel - Moved to bottom with enhanced styling */}
  {selectedRide.ride_status === 'pending' && (
    <div className="border-t border-gray-200">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 pulse-offer">
        <PassengerOffersPanel 
          rideId={selectedRide.id} 
          onAccepted={() => loadActiveRides()} 
        />
      </div>
    </div>
  )}
</div>
```

**Key Changes**:
- Move offers section to the bottom of the ride card (after actions)
- Apply gradient background (blue-50 to indigo-50) for visual distinction
- Add pulse animation using CSS keyframes
- Wrap in border-t to separate from ride details
- Maintain all existing functionality (accept/reject)
- Only show when ride status is pending

**CSS Animation Details**:
- Pulse animation runs continuously with 2-second duration
- Subtle scale and opacity changes (1.0 to 1.01 scale, 1.0 to 0.95 opacity)
- Uses cubic-bezier easing for smooth animation
- Draws attention without being distracting

## Performance Considerations

1. **Subscription Optimization**: Use specific filters to reduce unnecessary updates
2. **Debounce Location Updates**: Limit driver location updates to every 5 seconds
3. **Lazy Load Ride History**: Only fetch recent rides initially
4. **Memoize Fare Calculations**: Cache results for identical inputs
5. **Optimize Modal Rendering**: Use React.memo for static sections
6. **CSS Animations**: Use GPU-accelerated properties (transform, opacity) for smooth animations

## Security Considerations

1. **RLS Policies**: Ensure Row Level Security is enabled on all tables
2. **Input Validation**: Validate all user inputs before database operations
3. **Rate Limiting**: Implement rate limiting on status updates
4. **Authentication Checks**: Verify user identity before allowing status changes
5. **Audit Trail**: Maintain complete history of all status changes

## Deployment Notes

1. Test on local development server (http://localhost:4030)
2. Use test accounts for validation:
   - Driver: driver.test@bmtoa.co.zw / Drivere@123
   - Passenger: user.test@taxicab.co.zw / User@123
3. Monitor Supabase logs for realtime connection issues
4. Check Chrome DevTools Network tab for failed requests
5. Verify database indexes are in place for performance