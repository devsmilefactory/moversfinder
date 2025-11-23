# Design Document

## Overview

This design document outlines a complete rebuild of the driver rides feed system to eliminate code duplication, fix blocking UI bugs, and establish a single source of truth for ride data management. The system will provide a clean, responsive interface for drivers to view and manage rides across multiple tabs (Available, Bids/Offers, Active/In Progress, Completed) with proper filtering, pagination, and real-time updates.

The rebuild focuses on:
- **Single source of truth** for all ride data fetching
- **Non-blocking priority UI** for active rides and upcoming scheduled trips
- **Unified component architecture** with reusable presentational components
- **Consistent data layer** using Supabase views/RPCs
- **Preserved working components** like ActiveRideModal to speed implementation

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DriverRidesPage                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Priority UI Layer (Non-blocking)                     │  │
│  │  - ActiveRideModal (preserved)                        │  │
│  │  - ActiveRideToast                                    │  │
│  │  - ScheduledAlertToasts                               │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tab Navigation                                       │  │
│  │  Available | Bids | Active | Completed               │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Filter Bar                                           │  │
│  │  [Ride Type ▼] [Schedule Type ▼]                     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Ride List (Paginated)                                │  │
│  │  - RideCard (preserved & enhanced)                    │  │
│  │  - RideCard                                           │  │
│  │  - RideCard                                           │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Pagination Controls                                  │  │
│  │  ← Previous | Page 1 of 5 | Next →                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ useDriverRides   │  │ useActiveRide    │  │ useRealtime      │
│ Feed Hook        │  │ Check Hook       │  │ Subscription     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
         ↓                    ↓                    ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase Data Layer                            │
│  - get_driver_rides(filters, pagination)                    │
│  - get_active_instant_ride(driver_id)                       │
│  - get_imminent_scheduled_rides(driver_id, window)          │
│  - activate_scheduled_ride(ride_id, driver_id)              │
│  - Real-time channels for new rides                         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Page Load**:
   - Fetch driver profile and location
   - Check for active instant rides → Display modal/toast if found
   - Check for imminent scheduled rides → Display alert toasts
   - Load default tab (Available) with no filters, page 1

2. **Tab Switch**:
   - Update activeTab state
   - Reset page to 1
   - Call fetchRidesForTab with new tab's status_group

3. **Filter Change**:
   - Update filter state
   - Reset page to 1
   - Call fetchRidesForTab with current tab and new filters

4. **Pagination**:
   - Update page state
   - Call fetchRidesForTab with current tab, filters, and new page

5. **Real-time Updates**:
   - Available tab: Subscribe to new rides → Show toast
   - All tabs: Subscribe to ride/offer changes → Refresh counts

## Components and Interfaces

### Component Hierarchy

```
DriverRidesPage (Container)
├── ActiveRideModal (Preserved - shows active ride details)
├── ActiveRideToast (New - dismissible notification)
├── ScheduledAlertToast (New - for upcoming trips)
├── RidesTabs (New - tab navigation)
├── RideFiltersBar (New - dropdowns + pagination)
├── RideList (New - presentational list)
│   └── RideCard (Enhanced - preserved base, add new features)
└── NewAvailableRidesToast (New - for live feed)
```

### Component Specifications

#### 1. DriverRidesPage (Container Component)

**Purpose**: Main container managing all state and orchestrating child components

**State**:
```typescript
interface DriverRidesPageState {
  // Tab and filters
  activeTab: 'AVAILABLE' | 'BID' | 'ACTIVE' | 'COMPLETED';
  rideTypeFilter: 'ALL' | 'TAXI' | 'COURIER' | 'ERRANDS' | 'SCHOOL_RUN';
  scheduleFilter: 'ALL' | 'INSTANT' | 'SCHEDULED' | 'RECURRING';
  
  // Pagination
  page: number;
  pageSize: number; // Always 10
  totalCount: number;
  
  // Data
  rides: DriverRide[];
  isLoading: boolean;
  
  // Priority UI
  activeInstantRide: DriverRide | null;
  scheduledAlerts: DriverRide[];
  showActiveRideModal: boolean;
  hasActiveRideToast: boolean;
  
  // Live feed
  hasNewAvailableRides: boolean;
  lastAvailableFetchTs: string;
  
  // Driver info
  driverId: string;
  driverLocation: { lat: number; lng: number } | null;
}
```

**Methods**:
- `loadDriverInfo()`: Fetch driver ID and location
- `checkActiveInstantRide()`: Query for active instant rides
- `checkImminentScheduledRides()`: Query for upcoming scheduled rides
- `fetchRidesForTab(tab, filters, page)`: **Single source of truth** for fetching rides
- `handleTabChange(tab)`: Switch tabs
- `handleFilterChange(filterType, value)`: Update filters
- `handlePageChange(page)`: Navigate pages
- `handleRefreshAvailable()`: Refresh available rides (from toast)
- `handleActivateRide(rideId)`: Activate a scheduled/recurring ride

#### 2. RidesTabs (Presentational Component)

**Props**:
```typescript
interface RidesTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    available: number;
    bid: number;
    active: number;
    completed: number;
  };
}
```

**Rendering**:
- Horizontal scrollable tab bar
- Each tab shows icon, label, and count badge
- Active tab highlighted with colored border and background

#### 3. RideFiltersBar (Presentational Component)

**Props**:
```typescript
interface RideFiltersBarProps {
  rideTypeFilter: string;
  scheduleFilter: string;
  onRideTypeChange: (value: string) => void;
  onScheduleChange: (value: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```

**Rendering**:
- Two dropdowns side by side
- Pagination controls below or inline
- Responsive layout for mobile

#### 4. RideList (Presentational Component)

**Props**:
```typescript
interface RideListProps {
  rides: DriverRide[];
  isLoading: boolean;
  activeInstantRide: DriverRide | null;
  onRideClick: (ride: DriverRide) => void;
  onAcceptRide: (ride: DriverRide) => void;
  onActivateRide: (ride: DriverRide) => void;
}
```

**Rendering**:
- Loading skeleton when isLoading=true
- Empty state when rides.length === 0 and !isLoading
- Map rides to RideCard components
- Handle bulk ride grouping (preserve existing logic)

#### 5. RideCard (Enhanced Preserved Component)

**Props**:
```typescript
interface RideCardProps {
  ride: DriverRide;
  isAcceptDisabled: boolean;
  disabledTooltip?: string;
  onViewDetails: () => void;
  onAccept?: () => void;
  onActivate?: () => void;
}
```

**Preserved Features**:
- All existing card information (pickup, dropoff, price, distance, time)
- Service type and timing badges
- Conditional contact details (only when ride accepted)
- Bulk ride visual treatment

**New Features**:
- Activate Ride button for scheduled/recurring rides
- Disabled state for accept button when active instant ride exists
- Tooltip explaining why accept is disabled

#### 6. ActiveRideModal (Preserved Component)

**No changes** - This component already works well and will be reused as-is.

**Features**:
- Shows active ride details
- Sub-state progression buttons
- Dismissible
- Full ride information display

#### 7. ActiveRideToast (New Component)

**Props**:
```typescript
interface ActiveRideToastProps {
  ride: DriverRide;
  onView: () => void;
  onDismiss: () => void;
}
```

**Rendering**:
- Fixed position at top of page
- Short text: "You have an ongoing instant trip"
- Two buttons: "View" and "Dismiss"
- Non-blocking (page remains interactive)

#### 8. ScheduledAlertToast (New Component)

**Props**:
```typescript
interface ScheduledAlertToastProps {
  rides: DriverRide[];
  onViewAndActivate: (ride: DriverRide) => void;
  onDismiss: () => void;
}
```

**Rendering**:
- Shows count of upcoming trips
- "View & Activate" button for each ride
- Dismissible
- Auto-dismiss after 30 seconds

#### 9. NewAvailableRidesToast (New Component)

**Props**:
```typescript
interface NewAvailableRidesToastProps {
  visible: boolean;
  onRefresh: () => void;
  onDismiss: () => void;
}
```

**Rendering**:
- Only visible when hasNewAvailableRides=true and activeTab='AVAILABLE'
- Text: "New rides available in your area"
- "Refresh" button
- Auto-dismiss on refresh

## Data Models

### Core Data Types

```typescript
interface DriverRide {
  // Core ride info
  id: string;
  user_id: string;
  driver_id: string | null;
  
  // Status
  status_group: 'AVAILABLE' | 'BID' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  driver_state: 'NONE' | 'OFFERED' | 'OFFER_ACCEPTED' | 'DRIVER_ON_THE_WAY' | 
                'DRIVER_ARRIVED' | 'TRIP_STARTED' | 'TRIP_COMPLETED' | 'TRIP_CANCELLED';
  
  // Type
  ride_type: 'TAXI' | 'COURIER' | 'ERRANDS' | 'SCHOOL_RUN';
  schedule_type: 'INSTANT' | 'SCHEDULED' | 'RECURRING';
  
  // Location
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string;
  
  // Distance
  distance_km: number; // Pickup to dropoff
  distance_to_driver_km: number; // Driver location to pickup
  
  // Time
  created_at: string;
  start_time: string | null; // For scheduled/recurring
  
  // Recurring info
  total_trips: number | null;
  trips_done: number | null;
  trips_remaining: number | null;
  trips_cancelled: number | null;
  
  // Pricing
  estimated_cost: number;
  
  // Notifications
  has_unread_notifications: boolean;
  
  // Contact (conditional)
  passenger_name: string | null;
  passenger_phone: string | null;
  passenger_email: string | null;
  
  // Additional details
  special_instructions: string | null;
  number_of_trips: number;
  number_of_tasks: number;
  package_size: string | null;
  booking_type: string | null;
  batch_id: string | null;
}
```

### Database Schema Assumptions

The design assumes the following database structure exists or will be created:

#### Tables

**rides** (existing):
- id, user_id, driver_id
- ride_status (maps to status_group)
- ride_type, ride_timing (maps to schedule_type)
- pickup_coordinates (GeoJSON), dropoff_coordinates (GeoJSON)
- pickup_address, dropoff_address
- distance_km, estimated_cost
- created_at, scheduled_datetime
- special_instructions, passengers
- booking_type, batch_id

**ride_offers** (existing):
- id, ride_id, driver_id
- offer_status ('pending', 'accepted', 'rejected')
- quoted_price, message
- offered_at

**driver_locations** (existing):
- driver_id, coordinates (GeoJSON)
- is_online, is_available
- updated_at

**recurring_trip_series** (existing):
- id, ride_id, driver_id
- total_trips, trips_completed, trips_cancelled
- status ('active', 'paused', 'completed')

**ride_notifications** (new or existing):
- id, ride_id, driver_id
- notification_type ('SCHEDULE_SOON', etc.)
- is_read
- created_at

#### Views / RPCs

**get_driver_rides** (RPC to create):
```sql
CREATE OR REPLACE FUNCTION get_driver_rides(
  p_driver_id UUID,
  p_status_group TEXT,
  p_ride_type TEXT DEFAULT NULL,
  p_schedule_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  -- All DriverRide fields
  id UUID,
  user_id UUID,
  driver_id UUID,
  status_group TEXT,
  driver_state TEXT,
  ride_type TEXT,
  schedule_type TEXT,
  pickup_lat FLOAT,
  pickup_lng FLOAT,
  pickup_address TEXT,
  dropoff_lat FLOAT,
  dropoff_lng FLOAT,
  dropoff_address TEXT,
  distance_km FLOAT,
  distance_to_driver_km FLOAT,
  created_at TIMESTAMP,
  start_time TIMESTAMP,
  total_trips INT,
  trips_done INT,
  trips_remaining INT,
  trips_cancelled INT,
  estimated_cost NUMERIC,
  has_unread_notifications BOOLEAN,
  passenger_name TEXT,
  passenger_phone TEXT,
  passenger_email TEXT,
  special_instructions TEXT,
  number_of_trips INT,
  number_of_tasks INT,
  package_size TEXT,
  booking_type TEXT,
  batch_id UUID
)
```

**Logic**:
1. Map status_group to ride_status and offer_status combinations:
   - AVAILABLE: ride_status='pending', no offer from this driver
   - BID: offer_status='pending' for this driver
   - ACTIVE: offer_status='accepted' OR ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started')
   - COMPLETED: ride_status='completed'

2. Apply radius filter for AVAILABLE (5km from driver location)

3. Apply ride_type filter if provided

4. Apply schedule_type filter if provided (map ride_timing to schedule_type)

5. Calculate distance_to_driver_km using PostGIS ST_Distance

6. Join with profiles for passenger contact info (only if ride accepted)

7. Join with recurring_trip_series for recurring info

8. Join with ride_notifications for unread count

9. Apply pagination (LIMIT, OFFSET)

10. Return results

**get_active_instant_ride** (RPC to create):
```sql
CREATE OR REPLACE FUNCTION get_active_instant_ride(p_driver_id UUID)
RETURNS TABLE (
  -- Same fields as get_driver_rides
)
```

**Logic**:
- Find rides where driver_id = p_driver_id
- AND schedule_type = 'INSTANT'
- AND status_group = 'ACTIVE'
- LIMIT 1

**get_imminent_scheduled_rides** (RPC to create):
```sql
CREATE OR REPLACE FUNCTION get_imminent_scheduled_rides(
  p_driver_id UUID,
  p_window_minutes INT DEFAULT 30
)
RETURNS TABLE (
  -- Same fields as get_driver_rides
)
```

**Logic**:
- Find rides where driver_id = p_driver_id
- AND schedule_type IN ('SCHEDULED', 'RECURRING')
- AND status_group NOT IN ('COMPLETED', 'CANCELLED')
- AND start_time BETWEEN NOW() AND NOW() + INTERVAL 'p_window_minutes minutes'
- ORDER BY start_time ASC

**activate_scheduled_ride** (RPC to create):
```sql
CREATE OR REPLACE FUNCTION activate_scheduled_ride(
  p_ride_id UUID,
  p_driver_id UUID
)
RETURNS JSON
```

**Logic**:
1. Check if driver has any active rides (instant or scheduled)
2. If yes, return error: { success: false, error: "You have an active ride" }
3. If no, update ride:
   - status_group = 'ACTIVE'
   - driver_state = 'OFFER_ACCEPTED'
   - updated_at = NOW()
4. Return success: { success: true, ride_id: p_ride_id }

## Error Handling

### Error Scenarios

1. **Location Permission Denied**:
   - Show error toast: "Location access required to view available rides"
   - Disable Available tab
   - Allow other tabs to function

2. **Network Error During Fetch**:
   - Show error toast: "Failed to load rides. Please try again."
   - Keep previous data visible
   - Provide retry button

3. **Active Ride Activation Conflict**:
   - Show error toast: "You must complete your current ride first"
   - Keep Activate button disabled

4. **Real-time Subscription Failure**:
   - Log error to console
   - Fall back to manual refresh
   - Don't block UI

5. **Invalid Filter Combination**:
   - Reset to default filters
   - Show warning toast

### Error Recovery

- All errors should be non-blocking
- Provide clear user feedback
- Offer retry mechanisms
- Preserve user's current state (tab, filters, page)
- Log errors for debugging

## Testing Strategy

### Unit Tests

1. **fetchRidesForTab Function**:
   - Test with different tab values
   - Test with different filter combinations
   - Test pagination calculations
   - Test error handling

2. **Status Mapping Logic**:
   - Test AVAILABLE → ride_status='pending'
   - Test BID → offer_status='pending'
   - Test ACTIVE → multiple ride_status values
   - Test COMPLETED → ride_status='completed'

3. **Distance Calculations**:
   - Test radius filter (5km)
   - Test distance_to_driver_km calculation
   - Test edge cases (null coordinates)

4. **Component Rendering**:
   - Test RideCard with different ride types
   - Test disabled accept button logic
   - Test conditional contact details display
   - Test bulk ride grouping

### Integration Tests

1. **Page Load Flow**:
   - Test priority checks (active ride, scheduled alerts)
   - Test default tab loading
   - Test initial data fetch

2. **Tab Switching**:
   - Test data refresh on tab change
   - Test filter reset behavior
   - Test pagination reset

3. **Filter Changes**:
   - Test ride type filter
   - Test schedule type filter
   - Test combined filters
   - Test pagination reset

4. **Real-time Updates**:
   - Test new ride notification
   - Test ride status change
   - Test offer acceptance

5. **Ride Activation**:
   - Test successful activation
   - Test activation with active ride conflict
   - Test modal and toast display

### Manual Testing Checklist

- [ ] Load page with no rides
- [ ] Load page with active instant ride
- [ ] Load page with upcoming scheduled rides
- [ ] Switch between all tabs
- [ ] Apply each filter type
- [ ] Navigate through pages
- [ ] Receive new ride while on Available tab
- [ ] Click refresh on new rides toast
- [ ] Activate a scheduled ride
- [ ] Try to activate ride with active instant ride
- [ ] Dismiss active ride modal
- [ ] Dismiss active ride toast
- [ ] View ride details
- [ ] Accept a ride (if applicable)
- [ ] Test on mobile viewport
- [ ] Test with slow network
- [ ] Test with location disabled

## Implementation Notes

### Preserved Components

The following existing components will be **preserved and reused**:
- `ActiveRideModal` - Already works well for showing active ride details
- `ActiveRideOverlay` - Can be adapted to ActiveRideToast
- Base `RideCard` structure - Enhance with new features but keep core layout
- `MapView` - Used in ride details
- `DriverRideDetailsModal` - For viewing full ride details

### Components to Remove

The following components have duplication or corruption and should be **removed**:
- Any duplicate ride fetching logic in individual tab views
- Separate Available/Pending/Active/Completed view components (consolidate into RideList)
- Duplicate status mapping logic
- Duplicate filter implementations

### Migration Strategy

1. **Phase 1: Data Layer**
   - Create Supabase RPCs (get_driver_rides, get_active_instant_ride, etc.)
   - Test RPCs independently
   - Verify data mapping and filtering

2. **Phase 2: Hooks**
   - Implement useDriverRidesFeed hook
   - Implement useActiveRideCheck hook
   - Test hooks with mock data

3. **Phase 3: Presentational Components**
   - Build RidesTabs
   - Build RideFiltersBar
   - Build RideList
   - Enhance RideCard
   - Build toast components

4. **Phase 4: Container Integration**
   - Build DriverRidesPage container
   - Wire up all components
   - Integrate preserved components (ActiveRideModal)
   - Test full flow

5. **Phase 5: Cleanup**
   - Remove old components
   - Remove duplicate code
   - Update imports
   - Document changes

### Performance Considerations

1. **Pagination**: Always fetch only 10 rides per page to minimize data transfer

2. **Real-time Subscriptions**: 
   - Subscribe only to relevant channels for current tab
   - Unsubscribe when switching tabs
   - Use filtered subscriptions to reduce noise

3. **Location Updates**:
   - Update driver location every 35 seconds (existing pattern)
   - Only refresh Available tab if driver moved >200m

4. **Caching**:
   - Cache ride counts to avoid repeated queries
   - Invalidate cache on real-time updates

5. **Debouncing**:
   - Debounce filter changes (300ms)
   - Debounce search inputs if added later

### Accessibility

- All interactive elements must be keyboard accessible
- Proper ARIA labels for tabs, buttons, and modals
- Focus management when opening/closing modals
- Screen reader announcements for status changes
- Sufficient color contrast for all text
- Touch targets at least 44x44px on mobile

### Mobile Responsiveness

- Horizontal scrollable tabs on mobile
- Stacked filters on small screens
- Full-width ride cards on mobile
- Bottom sheet for ride details on mobile
- Fixed position toasts that don't block content
- Swipe gestures for dismissing toasts (optional enhancement)
