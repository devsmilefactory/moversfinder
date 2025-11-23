# Design Document

## Overview

This design addresses critical issues in the Driver Rides Hub by implementing proper priority-based UI rendering, fixing tab loading logic, eliminating code duplication, and optimizing performance. The solution focuses on a clean separation of concerns with a priority-first rendering approach that ensures active rides are handled correctly before loading the main feed.

## Architecture

### Component Hierarchy

```
DriverRidesHub (Main Container)
├── Priority Layer (Renders First)
│   ├── ActiveRideModal (Highest Priority - Active Instant Rides)
│   ├── ActiveRideToast (Secondary - Dismissed Modal State)
│   └── ScheduledRideNotificationBanner (Third Priority)
│
├── Header Section
│   ├── OnlineToggle
│   ├── LocationDisplay
│   └── RefreshButton
│
├── Tab Navigation
│   ├── AvailableTab (with badge)
│   ├── MyBidsTab (with badge)
│   ├── InProgressTab (with badge)
│   └── CompletedTab (with badge)
│
├── Filter Section (Per Tab)
│   ├── RideTypeDropdown (All, Taxi, Courier, Errands, School Run)
│   └── SchedulingDropdown (All, Instant, Scheduled, Recurring)
│
└── Tab Content Area
    ├── AvailableRidesView
    ├── PendingBidsView
    ├── ActiveRidesView
    └── CompletedRidesView
```

### State Management Strategy

```javascript
// Main Hub State
{
  // Priority state (loaded first)
  activeInstantRide: Ride | null,
  scheduledNotifications: Notification[],
  
  // UI state
  activeTab: 'available' | 'pending' | 'active' | 'completed',
  modalDismissed: boolean,
  toastDismissed: boolean,
  
  // Filter state (persisted per tab)
  filters: {
    available: { rideType: 'all', scheduling: 'all' },
    pending: { rideType: 'all', scheduling: 'all' },
    active: { rideType: 'all', scheduling: 'all' },
    completed: { rideType: 'all', scheduling: 'all' }
  },
  
  // Data state
  counts: {
    available: number,
    pending: number,
    active: number,
    completed: number
  },
  
  // Driver state
  isOnline: boolean,
  driverLocation: { lat: number, lng: number } | null,
  
  // Loading state
  priorityCheckComplete: boolean,
  tabDataLoading: boolean
}
```

## Components and Interfaces

### 1. DriverRidesHub (Refactored)

**Purpose**: Main container with priority-based rendering logic

**Key Changes**:
- Implement priority check sequence on mount
- Fix z-index layering for overlays
- Add filter state management
- Consolidate real-time subscriptions

**Lifecycle**:
```javascript
useEffect(() => {
  // Phase 1: Priority checks
  checkActiveInstantRide();
  checkScheduledNotifications();
  
  // Phase 2: Load tab data
  loadTabCounts();
  loadCurrentTabData();
  
  // Phase 3: Setup real-time
  setupRealtimeSubscriptions();
}, [user?.id, isOnline]);
```

**Methods**:
```typescript
interface DriverRidesHubMethods {
  // Priority checks
  checkActiveInstantRide(): Promise<Ride | null>;
  checkScheduledNotifications(): Promise<Notification[]>;
  
  // Tab management
  handleTabChange(tab: string): void;
  loadTabData(tab: string, filters: FilterState): Promise<void>;
  loadTabCounts(): Promise<void>;
  
  // Filter management
  handleFilterChange(filterType: string, value: string): void;
  getActiveFilters(): FilterState;
  
  // Overlay management
  dismissModal(): void;
  dismissToast(): void;
  restoreOverlays(): void;
}
```

### 2. Priority Check System

**Purpose**: Determine which UI elements to display based on active rides

**Implementation**:
```javascript
const checkActiveInstantRide = async () => {
  const { data } = await supabase
    .from('rides')
    .select('*')
    .eq('driver_id', user.id)
    .eq('ride_timing', 'instant')
    .in('ride_status', ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  setActiveInstantRide(data);
  return data;
};

const checkScheduledNotifications = async () => {
  const now = new Date();
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);
  
  const { data } = await supabase
    .from('rides')
    .select('*, notifications!inner(*)')
    .eq('driver_id', user.id)
    .in('ride_timing', ['scheduled_single', 'recurring'])
    .gte('scheduled_datetime', now.toISOString())
    .lte('scheduled_datetime', thirtyMinutesFromNow.toISOString())
    .eq('notifications.is_read', false);
    
  setScheduledNotifications(data || []);
  return data;
};
```

### 3. ActiveRideModal (Fixed Positioning)

**Purpose**: Full-screen modal for active instant rides

**Props**:
```typescript
interface ActiveRideModalProps {
  ride: Ride;
  onDismiss: () => void;
  onViewDetails: () => void;
  onCancel: () => void;
}
```

**Styling**:
```css
.active-ride-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999; /* Highest priority */
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 4. ActiveRideToast (Fixed Positioning)

**Purpose**: Dismissable banner for active rides when modal is dismissed

**Props**:
```typescript
interface ActiveRideToastProps {
  ride: Ride;
  onDismiss: () => void;
  onExpand: () => void;
}
```

**Styling**:
```css
.active-ride-toast {
  position: fixed;
  top: 80px; /* Below header, above tabs */
  left: 16px;
  right: 16px;
  z-index: 50; /* Above content, below modal */
  max-width: 1200px;
  margin: 0 auto;
  pointer-events: auto; /* Ensure clickable */
}
```

### 5. FilterSection (New Component)

**Purpose**: Dropdown filters for ride type and scheduling

**Props**:
```typescript
interface FilterSectionProps {
  rideTypeFilter: string;
  schedulingFilter: string;
  onRideTypeChange: (value: string) => void;
  onSchedulingChange: (value: string) => void;
  counts?: {
    byType: Record<string, number>;
    byScheduling: Record<string, number>;
  };
}
```

**UI Design**:
```
┌─────────────────────────────────────────────────────┐
│  Ride Type: [All ▼]    Scheduling: [All ▼]         │
└─────────────────────────────────────────────────────┘
```

**Dropdown Options**:
- Ride Type: All, 🚕 Taxi, 📦 Courier, 🛒 Errands, 🎒 School/Work Run
- Scheduling: All, ⚡ Instant, 📅 Scheduled, 🔄 Recurring

### 6. AvailableRidesView (Refactored)

**Purpose**: Display available rides with proper loading and filtering

**Key Changes**:
- Remove duplicate loading logic
- Implement proper empty state handling
- Add filter support
- Fix radius filtering (5km)
- Add "New rides available" toast

**Props**:
```typescript
interface AvailableRidesViewProps {
  isOnline: boolean;
  driverLocation: Coordinates | null;
  filters: FilterState;
  onBidPlaced: () => void;
  onNewRidesAvailable: (count: number) => void;
}
```

**Query Logic**:
```sql
-- Base query with radius filter
SELECT r.*, 
  ST_Distance(
    r.pickup_coordinates::geography,
    ST_SetSRID(ST_MakePoint($driverLng, $driverLat), 4326)::geography
  ) / 1000 as distance_to_pickup_km
FROM rides r
WHERE r.ride_status = 'pending'
  AND r.acceptance_status = 'pending'
  AND r.driver_id IS NULL
  AND r.id NOT IN (
    SELECT ride_id FROM ride_offers WHERE driver_id = $driverId
  )
  AND ST_DWithin(
    r.pickup_coordinates::geography,
    ST_SetSRID(ST_MakePoint($driverLng, $driverLat), 4326)::geography,
    5000  -- 5km radius
  )
  AND ($rideType = 'all' OR r.service_type = $rideType)
  AND ($scheduling = 'all' OR r.ride_timing = $scheduling)
ORDER BY distance_to_pickup_km ASC
LIMIT 10 OFFSET $offset;
```

**Real-time Toast**:
```javascript
useEffect(() => {
  if (!isOnline) return;
  
  const subscription = supabase
    .channel(`new-rides-${user.id}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'rides',
      filter: 'ride_status=eq.pending'
    }, (payload) => {
      // Check if ride is within radius
      const distance = calculateDistance(driverLocation, payload.new.pickup_coordinates);
      if (distance <= 5) {
        showNewRidesToast();
      }
    })
    .subscribe();
    
  return () => subscription.unsubscribe();
}, [isOnline, driverLocation]);
```

### 7. PendingBidsView (Refactored)

**Purpose**: Display driver's pending bids with filtering

**Key Changes**:
- Add automatic loading on tab select
- Implement filter support
- Fix empty state

**Query Logic**:
```sql
SELECT ro.*, r.*
FROM ride_offers ro
JOIN rides r ON ro.ride_id = r.id
WHERE ro.driver_id = $driverId
  AND ro.offer_status = 'pending'
  AND ($rideType = 'all' OR r.service_type = $rideType)
  AND ($scheduling = 'all' OR r.ride_timing = $scheduling)
ORDER BY ro.created_at DESC
LIMIT 10 OFFSET $offset;
```

### 8. ActiveRidesView (Refactored)

**Purpose**: Display in-progress rides with sub-state management

**Key Changes**:
- Add sub-state progression UI
- Implement "Activate Ride" button for scheduled/recurring
- Show recurring trip counts
- Add filter support

**Sub-State Progression**:
```javascript
const rideSubStates = [
  { status: 'accepted', label: 'Offer Accepted', action: 'Start Driving' },
  { status: 'driver_on_way', label: 'On The Way', action: 'Mark Arrived' },
  { status: 'driver_arrived', label: 'Arrived', action: 'Start Trip' },
  { status: 'trip_started', label: 'In Progress', action: 'Complete Trip' },
  { status: 'completed', label: 'Completed', action: null }
];

const handleProgressRide = async (ride, nextStatus) => {
  await supabase
    .from('rides')
    .update({ ride_status: nextStatus })
    .eq('id', ride.id);
};
```

**Activate Button Logic**:
```javascript
const canActivateScheduledRide = (ride) => {
  if (ride.ride_timing === 'instant') return false;
  
  const scheduledTime = new Date(ride.scheduled_datetime);
  const now = new Date();
  const minutesUntil = (scheduledTime - now) / 60000;
  
  return minutesUntil <= 15 && minutesUntil >= 0;
};

const handleActivateRide = async (ride) => {
  // Transition to active instant ride state
  await supabase
    .from('rides')
    .update({ 
      ride_status: 'accepted',
      activated_at: new Date().toISOString()
    })
    .eq('id', ride.id);
    
  // Trigger priority check to show modal
  checkActiveInstantRide();
};
```

**Recurring Trip Display**:
```javascript
const RecurringTripProgress = ({ series }) => (
  <div className="bg-purple-50 rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium">🔄 Recurring Series</span>
      <span className="text-xs text-gray-600">
        {series.completed_trips}/{series.total_trips} trips
      </span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-purple-600 h-2 rounded-full transition-all"
        style={{ width: `${(series.completed_trips / series.total_trips) * 100}%` }}
      />
    </div>
    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
      <div>
        <span className="text-gray-500">Remaining:</span>
        <span className="font-bold ml-1">{series.remaining_trips}</span>
      </div>
      <div>
        <span className="text-gray-500">Cancelled:</span>
        <span className="font-bold ml-1">{series.cancelled_trips}</span>
      </div>
      <div>
        <span className="text-gray-500">Next:</span>
        <span className="font-bold ml-1">
          {formatDate(series.next_trip_date)}
        </span>
      </div>
    </div>
  </div>
);
```

### 9. CompletedRidesView (Refactored)

**Purpose**: Display completed rides with filtering

**Key Changes**:
- Add automatic loading
- Implement filter support
- Show earnings summary

**Query Logic**:
```sql
SELECT r.*, rts.*
FROM rides r
LEFT JOIN recurring_trip_series rts ON r.series_id = rts.id
WHERE r.driver_id = $driverId
  AND r.ride_status = 'completed'
  AND ($rideType = 'all' OR r.service_type = $rideType)
  AND ($scheduling = 'all' OR r.ride_timing = $scheduling)
ORDER BY r.actual_dropoff_time DESC
LIMIT 10 OFFSET $offset;
```

### 10. RideCard (Standardized Component)

**Purpose**: Consistent ride card display across all tabs

**Props**:
```typescript
interface RideCardProps {
  ride: Ride;
  context: 'available' | 'pending' | 'active' | 'completed';
  onViewDetails: () => void;
  onAction?: () => void;
  actionLabel?: string;
}
```

**Display Elements**:
```javascript
<div className="ride-card">
  {/* Header with badges */}
  <div className="flex items-center justify-between">
    <div className="flex gap-2">
      <RideTypeBadge type={ride.service_type} />
      <SchedulingBadge timing={ride.ride_timing} />
    </div>
    {ride.estimated_cost && (
      <span className="font-bold text-green-600">
        ${ride.estimated_cost}
      </span>
    )}
  </div>
  
  {/* Locations */}
  <LocationDisplay 
    pickup={ride.pickup_address}
    dropoff={ride.dropoff_address}
  />
  
  {/* Context-specific content */}
  {context === 'active' && ride.ride_timing === 'recurring' && (
    <RecurringTripProgress series={ride.series} />
  )}
  
  {/* Actions */}
  <div className="flex gap-2">
    <Button onClick={onViewDetails}>View Details</Button>
    {onAction && (
      <Button onClick={onAction} variant="primary">
        {actionLabel}
      </Button>
    )}
  </div>
</div>
```

## Data Models

### Extended Ride Model

```typescript
interface Ride {
  id: string;
  user_id: string;
  driver_id: string | null;
  service_type: 'taxi' | 'courier' | 'errands' | 'school_run';
  ride_timing: 'instant' | 'scheduled_single' | 'recurring';
  ride_status: 'pending' | 'accepted' | 'driver_on_way' | 'driver_arrived' | 'trip_started' | 'completed' | 'cancelled';
  acceptance_status: 'pending' | 'accepted' | 'rejected';
  
  pickup_address: string;
  pickup_coordinates: GeoJSON;
  dropoff_address: string;
  dropoff_coordinates: GeoJSON;
  
  scheduled_datetime: string | null;
  series_id: string | null;
  
  estimated_cost: number;
  distance_km: number;
  distance_to_pickup_km: number;
  
  created_at: string;
  activated_at: string | null;
  
  // Joined data
  series?: RecurringTripSeries;
}
```

### Filter State Model

```typescript
interface FilterState {
  rideType: 'all' | 'taxi' | 'courier' | 'errands' | 'school_run';
  scheduling: 'all' | 'instant' | 'scheduled' | 'recurring';
}
```

### Recurring Trip Series Model

```typescript
interface RecurringTripSeries {
  id: string;
  user_id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  total_trips: number;
  completed_trips: number;
  remaining_trips: number;
  cancelled_trips: number;
  next_trip_date: string;
  series_status: 'active' | 'completed' | 'cancelled';
}
```

## Error Handling

### Priority Check Failures

**Scenario**: Active ride query fails
**Handling**:
- Log error to console
- Continue loading main interface
- Show error toast: "Failed to check active rides"
- Retry after 5 seconds

### Tab Loading Failures

**Scenario**: Tab data query fails
**Handling**:
- Show error state in tab content
- Display retry button
- Log error details
- Don't block other tabs from loading

### Filter Application Failures

**Scenario**: Filtered query fails
**Handling**:
- Fall back to unfiltered results
- Show warning toast
- Log error
- Allow user to retry

### Real-time Subscription Failures

**Scenario**: WebSocket connection drops
**Handling**:
- Attempt reconnection (3 retries)
- Show offline indicator
- Queue updates for when connection restores
- Fall back to polling every 30 seconds

## Testing Strategy

### Unit Tests

1. **Priority Check Logic**
   - Returns active instant ride when exists
   - Returns null when no active rides
   - Handles multiple active rides correctly
   - Filters out non-instant rides

2. **Filter Logic**
   - Applies ride type filter correctly
   - Applies scheduling filter correctly
   - Combines filters properly
   - Handles 'all' filter value

3. **Sub-State Progression**
   - Validates state transitions
   - Prevents invalid transitions
   - Updates database correctly
   - Triggers UI updates

### Integration Tests

1. **Tab Loading Flow**
   - Tab loads data on selection
   - Shows loading indicator
   - Displays results correctly
   - Handles empty results

2. **Filter Persistence**
   - Filters persist across tab switches
   - Filters reset on logout
   - Filters sync with URL params

3. **Real-time Updates**
   - New rides trigger toast
   - Bid acceptance moves ride to active
   - Ride completion updates counts
   - Filters apply to real-time updates

### End-to-End Tests

1. **Complete Driver Flow**
   - Driver goes online
   - Sees available rides
   - Places bid
   - Bid accepted
   - Modal appears
   - Progresses through sub-states
   - Completes ride
   - Ride appears in completed

2. **Scheduled Ride Activation**
   - Scheduled ride appears in active tab
   - Activate button appears 15 min before
   - Driver activates ride
   - Modal appears
   - Ride progresses normally

## Performance Optimizations

### Query Optimization

1. **Indexed Queries**
```sql
-- Add composite indexes
CREATE INDEX idx_rides_driver_status ON rides(driver_id, ride_status);
CREATE INDEX idx_rides_pending_location ON rides(ride_status, pickup_coordinates) 
  WHERE ride_status = 'pending';
CREATE INDEX idx_ride_offers_driver_status ON ride_offers(driver_id, offer_status);
```

2. **Query Result Caching**
```javascript
const useRideCache = () => {
  const cache = useRef(new Map());
  const CACHE_TTL = 30000; // 30 seconds
  
  const getCachedRides = (key) => {
    const cached = cache.current.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  };
  
  const setCachedRides = (key, data) => {
    cache.current.set(key, { data, timestamp: Date.now() });
  };
  
  return { getCachedRides, setCachedRides };
};
```

### Component Optimization

1. **Memoization**
```javascript
const RideCard = React.memo(({ ride, context, onViewDetails, onAction }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  return prevProps.ride.id === nextProps.ride.id &&
         prevProps.ride.ride_status === nextProps.ride.ride_status;
});
```

2. **Debounced Updates**
```javascript
const debouncedLoadCounts = useMemo(
  () => debounce(loadCounts, 500),
  []
);
```

3. **Lazy Loading**
```javascript
const RideDetailsModal = lazy(() => import('./RideDetailsModal'));
const RecurringSeriesModal = lazy(() => import('./RecurringSeriesModal'));
```

### Real-time Optimization

1. **Batched Updates**
```javascript
const batchedUpdates = useRef([]);
const flushTimeout = useRef(null);

const handleRealtimeUpdate = (payload) => {
  batchedUpdates.current.push(payload);
  
  clearTimeout(flushTimeout.current);
  flushTimeout.current = setTimeout(() => {
    processBatchedUpdates(batchedUpdates.current);
    batchedUpdates.current = [];
  }, 1000);
};
```

2. **Selective Subscriptions**
```javascript
// Only subscribe to relevant channels based on active tab
useEffect(() => {
  const subscriptions = [];
  
  if (activeTab === 'available') {
    subscriptions.push(subscribeToPendingRides());
  } else if (activeTab === 'pending') {
    subscriptions.push(subscribeToOffers());
  } else if (activeTab === 'active') {
    subscriptions.push(subscribeToActiveRides());
  }
  
  return () => subscriptions.forEach(sub => sub.unsubscribe());
}, [activeTab]);
```

## Code Cleanup Strategy

### Duplicate Removal

1. **Consolidate Query Functions**
   - Create `src/services/rideQueryService.js`
   - Move all ride queries to single service
   - Export reusable query functions

2. **Standardize Components**
   - Create `src/components/rides/RideCard.jsx`
   - Remove duplicate card implementations
   - Use single component with context prop

3. **Centralize Real-time Logic**
   - Create `src/hooks/useRideRealtime.js`
   - Consolidate subscription logic
   - Export single hook for all components

### Naming Conventions

```javascript
// Components: PascalCase
DriverRidesHub
ActiveRideModal
RideCard

// Hooks: camelCase with 'use' prefix
useRideRealtime
useRideFilters
useActiveRideCheck

// Services: camelCase
rideQueryService
bidService
notificationService

// Constants: UPPER_SNAKE_CASE
RIDE_STATES
SCHEDULING_OPTIONS
FILTER_DEFAULTS
```

## Migration Plan

### Phase 1: Fix Critical Issues (Priority)
1. Fix ActiveRideToast z-index and positioning
2. Implement automatic tab loading
3. Add priority check system
4. Fix empty state handling

### Phase 2: Add Filtering
1. Create FilterSection component
2. Add filter state management
3. Update queries to support filters
4. Implement filter persistence

### Phase 3: Code Cleanup
1. Consolidate query functions
2. Remove duplicate components
3. Standardize naming
4. Add comprehensive comments

### Phase 4: Optimization
1. Add query caching
2. Implement debouncing
3. Add lazy loading
4. Optimize real-time subscriptions

### Phase 5: Testing & Polish
1. Add unit tests
2. Add integration tests
3. Perform E2E testing
4. Fix any remaining bugs

## Accessibility

- Keyboard navigation for all interactive elements
- ARIA labels for all buttons and controls
- Screen reader announcements for state changes
- Focus management for modals
- High contrast mode support
- Touch target sizes minimum 44x44px
