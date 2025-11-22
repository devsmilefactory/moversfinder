# Design Document

## Overview

This design restructures the Driver Rides Hub to use state-based tabs instead of mixing ride states with scheduling types. The new architecture ensures that tabs represent ride progression (Available → My Bids → In Progress → Completed) while providing filters within each tab to narrow by ride timing (instant, scheduled, recurring). This aligns the driver experience with the passenger interface and provides clearer ride management.

## Architecture

### Component Structure

```
DriverRidesHub (Main Container)
├── Header Section
│   ├── Online/Offline Toggle
│   ├── Location Display
│   └── Refresh Button
├── Tab Navigation
│   ├── Available Tab (with count badge)
│   ├── My Bids Tab (with count badge)
│   ├── In Progress Tab (with count badge)
│   └── Completed Tab (with count badge)
├── Filter Bar (within each tab)
│   ├── All Filter
│   ├── Instant Filter (⚡)
│   ├── Scheduled Filter (📅)
│   └── Recurring Filter (🔄)
└── Tab Content Area
    ├── AvailableRidesView (refactored)
    ├── PendingBidsView (refactored)
    ├── ActiveRidesView (refactored)
    └── CompletedRidesView (new component)
```

### State Management

```javascript
// Main Hub State
{
  activeTab: 'available' | 'pending' | 'active' | 'completed',
  rideTimingFilter: 'all' | 'instant' | 'scheduled' | 'recurring',
  
  // Counts
  availableCount: number,
  pendingCount: number,
  activeCount: number,
  completedCount: number,
  
  // Driver status
  isOnline: boolean,
  driverLocation: { lat, lng },
  
  // Active ride overlay
  activeInstantRide: Ride | null
}
```

## Components and Interfaces

### 1. DriverRidesHub (Modified)

**Purpose**: Main container managing tab navigation and filter state

**Key Changes**:
- Remove `scheduled` tab from navigation
- Add `rideTimingFilter` state
- Update `loadCounts()` to count by state, not timing
- Pass filter prop to all child views

**Props**: None (uses hooks)

**State**:
```typescript
interface DriverRidesHubState {
  activeTab: 'available' | 'pending' | 'active' | 'completed';
  rideTimingFilter: 'all' | 'instant' | 'scheduled' | 'recurring';
  isOnline: boolean;
  driverLocation: Coordinates | null;
  availableCount: number;
  pendingCount: number;
  activeCount: number;
  completedCount: number;
}
```

**Methods**:
- `loadCounts()`: Query rides by state across all timing types
- `handleFilterChange(filter)`: Update ride timing filter
- `handleTabChange(tab)`: Switch active tab

### 2. FilterBar (New Component)

**Purpose**: Provides ride timing filters within each tab

**Props**:
```typescript
interface FilterBarProps {
  activeFilter: 'all' | 'instant' | 'scheduled' | 'recurring';
  onFilterChange: (filter: string) => void;
  counts?: {
    all: number;
    instant: number;
    scheduled: number;
    recurring: number;
  };
}
```

**UI Design**:
```
┌─────────────────────────────────────────────────────┐
│  [All (24)] [⚡ Instant (18)] [📅 Scheduled (4)]    │
│  [🔄 Recurring (2)]                                  │
└─────────────────────────────────────────────────────┘
```

### 3. AvailableRidesView (Refactored)

**Purpose**: Display rides drivers can bid on, filtered by timing

**Key Changes**:
- Accept `rideTimingFilter` prop
- Apply filter to query: `WHERE ride_timing = filter OR filter = 'all'`
- Group recurring rides by series_id
- Show series info for recurring rides

**Props**:
```typescript
interface AvailableRidesViewProps {
  isOnline: boolean;
  driverLocation: Coordinates | null;
  rideTimingFilter: 'all' | 'instant' | 'scheduled' | 'recurring';
  onBidPlaced: () => void;
}
```

**Query Logic**:
```sql
SELECT * FROM rides
WHERE ride_status = 'pending'
  AND acceptance_status = 'pending'
  AND driver_id IS NULL
  AND id NOT IN (
    SELECT ride_id FROM ride_offers 
    WHERE driver_id = $driverId
  )
  AND (ride_timing = $filter OR $filter = 'all')
ORDER BY 
  CASE 
    WHEN ride_timing = 'instant' THEN 1
    WHEN ride_timing = 'scheduled_single' THEN 2
    WHEN ride_timing = 'recurring' THEN 3
  END,
  scheduled_datetime ASC NULLS FIRST
```

### 4. PendingBidsView (Refactored)

**Purpose**: Display driver's pending bids, filtered by timing

**Key Changes**:
- Accept `rideTimingFilter` prop
- Join with rides table to get ride_timing
- Apply filter to results
- Group recurring bids by series_id

**Props**:
```typescript
interface PendingBidsViewProps {
  rideTimingFilter: 'all' | 'instant' | 'scheduled' | 'recurring';
  onBidUpdate: () => void;
}
```

**Query Logic**:
```sql
SELECT ro.*, r.* 
FROM ride_offers ro
JOIN rides r ON ro.ride_id = r.id
WHERE ro.driver_id = $driverId
  AND ro.offer_status = 'pending'
  AND (r.ride_timing = $filter OR $filter = 'all')
ORDER BY ro.created_at DESC
```

### 5. ActiveRidesView (Refactored)

**Purpose**: Display in-progress rides, filtered by timing

**Key Changes**:
- Accept `rideTimingFilter` prop
- Include all ride_status: ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started']
- Show recurring series with progress tracking
- Display next trip info for recurring rides

**Props**:
```typescript
interface ActiveRidesViewProps {
  rideTimingFilter: 'all' | 'instant' | 'scheduled' | 'recurring';
  onRideUpdate: () => void;
  onTripSelected: () => void;
}
```

**Query Logic**:
```sql
SELECT r.*, rts.* 
FROM rides r
LEFT JOIN recurring_trip_series rts ON r.series_id = rts.id
WHERE r.driver_id = $driverId
  AND r.ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started')
  AND (r.ride_timing = $filter OR $filter = 'all')
ORDER BY 
  CASE r.ride_status
    WHEN 'trip_started' THEN 1
    WHEN 'driver_arrived' THEN 2
    WHEN 'driver_on_way' THEN 3
    WHEN 'accepted' THEN 4
  END,
  r.scheduled_datetime ASC NULLS FIRST
```

### 6. CompletedRidesView (New Component)

**Purpose**: Display completed rides with earnings summary

**Props**:
```typescript
interface CompletedRidesViewProps {
  rideTimingFilter: 'all' | 'instant' | 'scheduled' | 'recurring';
}
```

**Features**:
- List completed rides with earnings
- Show series summary for recurring rides
- Display completion date and rating
- Calculate total earnings by filter

**Query Logic**:
```sql
SELECT r.*, rts.*
FROM rides r
LEFT JOIN recurring_trip_series rts ON r.series_id = rts.id
WHERE r.driver_id = $driverId
  AND r.ride_status = 'completed'
  AND (r.ride_timing = $filter OR $filter = 'all')
ORDER BY r.actual_dropoff_time DESC
LIMIT 50
```

### 7. RecurringRideCard (New Component)

**Purpose**: Display recurring ride series information

**Props**:
```typescript
interface RecurringRideCardProps {
  series: RecurringTripSeries;
  currentRide: Ride;
  context: 'available' | 'pending' | 'active' | 'completed';
}
```

**Display Elements**:
- Series frequency badge (Daily, Weekly, Monthly)
- Progress bar (trips completed / total trips)
- Next trip date and time
- Pickup/dropoff locations
- Bid amount (if in pending)
- Series status indicator

## Data Models

### Extended Ride Query Result

```typescript
interface RideWithSeries extends Ride {
  // Existing ride fields
  id: string;
  ride_status: string;
  ride_timing: 'instant' | 'scheduled_single' | 'recurring';
  series_id?: string;
  
  // Joined series data (for recurring rides)
  series?: {
    id: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    total_trips: number;
    completed_trips: number;
    remaining_trips: number;
    next_trip_date: string;
    series_status: 'active' | 'completed' | 'cancelled';
  };
}
```

### Filter State

```typescript
interface FilterState {
  activeFilter: 'all' | 'instant' | 'scheduled' | 'recurring';
  counts: {
    all: number;
    instant: number;
    scheduled: number;
    recurring: number;
  };
}
```

## Error Handling

### Filter Application Errors

**Scenario**: Filter query fails
**Handling**: 
- Log error to console
- Show toast: "Failed to apply filter"
- Fall back to 'all' filter
- Retry query without filter

### Count Calculation Errors

**Scenario**: Tab count query fails
**Handling**:
- Log error to console
- Display "?" in badge instead of count
- Continue loading tab content
- Retry count query after 5 seconds

### Recurring Series Grouping Errors

**Scenario**: Series data incomplete or missing
**Handling**:
- Display individual rides instead of grouped series
- Show warning icon on affected rides
- Log series_id for debugging
- Allow driver to interact with individual rides

## Testing Strategy

### Unit Tests

1. **FilterBar Component**
   - Renders all filter options
   - Calls onFilterChange with correct value
   - Highlights active filter
   - Displays counts when provided

2. **Count Calculation Logic**
   - Counts rides by state correctly
   - Excludes rides not matching driver_id
   - Handles null/undefined values
   - Updates counts on real-time changes

3. **Query Filtering**
   - Applies ride_timing filter correctly
   - Returns all rides when filter is 'all'
   - Handles empty result sets
   - Maintains sort order with filter

### Integration Tests

1. **Tab Navigation with Filters**
   - Filter persists when switching tabs
   - Counts update when filter changes
   - Real-time updates respect active filter
   - URL params sync with filter state

2. **Recurring Ride Handling**
   - Series grouped correctly in all tabs
   - Progress tracking updates in real-time
   - Individual trips accessible from series card
   - Series moves to completed when all trips done

3. **State Transitions**
   - Ride moves from Available to My Bids after bidding
   - Ride moves from My Bids to In Progress when accepted
   - Ride moves from In Progress to Completed when finished
   - Counts update correctly on transitions

### End-to-End Tests

1. **Complete Driver Flow**
   - Driver goes online
   - Views available rides with different filters
   - Places bid on instant ride
   - Places bid on scheduled ride
   - Places bid on recurring series
   - Passenger accepts bid
   - Ride appears in In Progress
   - Driver completes ride
   - Ride appears in Completed

2. **Recurring Series Flow**
   - Driver bids on recurring series
   - Series appears in My Bids
   - Passenger accepts
   - Series moves to In Progress
   - Driver completes first trip
   - Series stays in In Progress
   - Next trip date updates
   - Driver completes all trips
   - Series moves to Completed

## UI/UX Considerations

### Filter Bar Design

- Horizontal scrollable on mobile
- Sticky below tab navigation
- Clear visual feedback for active filter
- Badge counts for each filter option
- Smooth transitions between filters

### Ride Card Enhancements

**Timing Badge**:
- ⚡ Instant (blue background)
- 📅 Scheduled (purple background)
- 🔄 Recurring (green background)

**Scheduled Ride Display**:
```
┌─────────────────────────────────────┐
│ 📅 Scheduled                        │
│ 🚕 Taxi Ride                        │
│                                     │
│ 📍 Pickup: 123 Main St              │
│ 📍 Dropoff: 456 Oak Ave             │
│                                     │
│ ⏰ Tomorrow at 8:00 AM              │
│                                     │
│ 💰 $15.00                           │
└─────────────────────────────────────┘
```

**Recurring Ride Display**:
```
┌─────────────────────────────────────┐
│ 🔄 Recurring • Daily                │
│ 🎒 School Run                       │
│                                     │
│ 📍 Pickup: 789 Elm St               │
│ 📍 Dropoff: Lincoln High School     │
│                                     │
│ Progress: ████████░░ 8/10 trips     │
│ Next: Tomorrow at 7:30 AM           │
│                                     │
│ 💰 $12.00 per trip                  │
└─────────────────────────────────────┘
```

### Empty States

**No Rides in Filter**:
```
┌─────────────────────────────────────┐
│           📅                        │
│                                     │
│   No Scheduled Rides                │
│                                     │
│   Try selecting "All" to see        │
│   all available rides               │
│                                     │
│   [View All Rides]                  │
└─────────────────────────────────────┘
```

### Loading States

- Skeleton cards while loading
- Shimmer effect on ride cards
- Preserve filter selection during load
- Show "Refreshing..." indicator

### Responsive Design

**Mobile** (< 768px):
- Single column layout
- Horizontal scrollable tabs
- Horizontal scrollable filters
- Collapsible ride details

**Tablet** (768px - 1024px):
- Two column layout for ride list
- Full width ride details modal
- Visible filter bar

**Desktop** (> 1024px):
- Three column layout
- Side-by-side ride list and details
- Full filter bar always visible

## Performance Optimizations

### Query Optimization

1. **Indexed Queries**
   - Add composite index on (driver_id, ride_status, ride_timing)
   - Add index on (series_id, ride_status) for recurring rides
   - Use query result caching for counts

2. **Pagination**
   - Load 20 rides per tab initially
   - Implement infinite scroll for Completed tab
   - Cache loaded pages in memory

3. **Real-time Subscriptions**
   - Single subscription per tab
   - Filter events client-side by ride_timing
   - Debounce count updates (500ms)

### Component Optimization

1. **Memoization**
   - Memo FilterBar component
   - Memo ride cards with React.memo
   - Use useMemo for filtered ride lists

2. **Lazy Loading**
   - Lazy load CompletedRidesView
   - Lazy load RecurringSeriesModal
   - Code split by tab

## Migration Strategy

### Phase 1: Add Filter Infrastructure
- Create FilterBar component
- Add rideTimingFilter state to DriverRidesHub
- Update queries to accept filter parameter
- Test filter functionality

### Phase 2: Refactor Existing Views
- Update AvailableRidesView with filter support
- Update PendingBidsView with filter support
- Update ActiveRidesView with filter support
- Remove ScheduledRidesView component

### Phase 3: Create Completed View
- Build CompletedRidesView component
- Implement earnings summary
- Add recurring series support
- Test completed ride display

### Phase 4: Update Tab Navigation
- Remove "Scheduled" tab
- Update tab labels and icons
- Update count calculations
- Test tab transitions

### Phase 5: Polish and Testing
- Add timing badges to ride cards
- Implement empty states
- Add loading states
- Comprehensive testing

## Backwards Compatibility

### Handling Existing Routes

- `/driver/rides?tab=scheduled` → Redirect to `/driver/rides?tab=active&filter=scheduled`
- Preserve any existing deep links
- Show migration notice for first-time users

### Database Compatibility

- No schema changes required
- All queries use existing columns
- Recurring series table already exists
- No data migration needed

## Accessibility

- Keyboard navigation for filters
- ARIA labels for filter buttons
- Screen reader announcements for count updates
- Focus management when switching tabs
- High contrast mode support for timing badges
