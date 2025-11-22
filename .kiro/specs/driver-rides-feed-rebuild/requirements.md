# Requirements Document

## Introduction

This specification defines a complete rebuild of the driver rides feed system to eliminate code duplication, fix blocking UI bugs, and establish a single source of truth for ride data fetching and display. The system will provide drivers with a clean, responsive interface to view and manage available rides, bids, active trips, and completed rides while properly handling priority notifications for active instant rides and upcoming scheduled trips.

## Glossary

- **Driver Rides Feed System**: The complete UI and data layer that displays rides to drivers across multiple tabs with filtering and pagination
- **Status Group**: A high-level categorization of rides (AVAILABLE, BID, ACTIVE, COMPLETED, CANCELLED)
- **Driver State**: A detailed sub-state within active rides tracking trip progression (OFFER_ACCEPTED, DRIVER_ON_THE_WAY, DRIVER_ARRIVED, TRIP_STARTED, TRIP_COMPLETED, TRIP_CANCELLED)
- **Active Instant Ride**: A ride with schedule_type='INSTANT' and status_group='ACTIVE' that is currently in progress for the driver
- **Ride Type**: The category of service (TAXI, COURIER, ERRANDS, SCHOOL_RUN)
- **Schedule Type**: The timing model for the ride (INSTANT, SCHEDULED, RECURRING)
- **Priority UI**: Non-blocking modal and toast notifications that inform drivers of active rides or upcoming trips without preventing interaction with the main interface
- **Radius Filter**: A 5km distance constraint applied to available rides based on driver's current location
- **Live Feed**: A real-time subscription that notifies drivers of new available rides without auto-refreshing the list

## Requirements

### Requirement 1: Non-Blocking Priority UI

**User Story:** As a driver with an active instant ride, I want to see priority notifications about my current trip while still being able to browse other rides, so that I can plan my next trip without losing context of my current one.

#### Acceptance Criteria

1. WHEN the Driver Rides Feed System detects an active instant ride for the driver, THEN the Driver Rides Feed System SHALL display an Active Ride Modal that can be dismissed by the driver
2. WHEN the Driver Rides Feed System detects an active instant ride for the driver, THEN the Driver Rides Feed System SHALL display an Active Ride Toast at the top of the page that can be dismissed by the driver
3. WHILE an Active Ride Modal or Active Ride Toast is displayed, THE Driver Rides Feed System SHALL allow full interaction with all tabs and ride lists without blocking or overlay restrictions
4. WHEN a driver has an active instant ride and views an available instant ride card, THEN the Driver Rides Feed System SHALL disable only the accept button for that card and display a tooltip explaining the restriction
5. WHILE a driver has an active instant ride, THE Driver Rides Feed System SHALL keep all view details buttons and tab navigation fully enabled

### Requirement 2: Automatic Tab Data Loading

**User Story:** As a driver switching between ride tabs, I want each tab to automatically load the correct subset of rides with proper loading states, so that I always see accurate data without manual intervention.

#### Acceptance Criteria

1. WHEN a driver selects a tab in the Driver Rides Feed System, THEN the Driver Rides Feed System SHALL fetch rides matching that tab's status group with the current filters applied
2. WHILE the Driver Rides Feed System is fetching ride data, THE Driver Rides Feed System SHALL display a loading skeleton in the ride list area
3. WHEN the Driver Rides Feed System completes a fetch with zero results, THEN the Driver Rides Feed System SHALL display an empty state message specific to that tab
4. WHEN the Driver Rides Feed System completes a fetch with one or more results, THEN the Driver Rides Feed System SHALL display the rides in a paginated list with 10 rides per page
5. WHEN a driver changes the page number, THEN the Driver Rides Feed System SHALL fetch the next page of rides for the current tab and filters

### Requirement 3: Priority Logic on Page Load

**User Story:** As a driver opening the rides feed, I want the system to check for active trips and upcoming scheduled rides first, so that I'm immediately aware of my most urgent responsibilities.

#### Acceptance Criteria

1. WHEN the Driver Rides Feed System initializes, THEN the Driver Rides Feed System SHALL fetch the driver's current location and driver ID before any ride queries
2. WHEN the Driver Rides Feed System has driver information, THEN the Driver Rides Feed System SHALL query for active instant rides for that driver before loading the default tab
3. IF an active instant ride exists, THEN the Driver Rides Feed System SHALL store it in state and display the Active Ride Modal and Active Ride Toast
4. WHEN the Driver Rides Feed System completes the active ride check, THEN the Driver Rides Feed System SHALL query for scheduled or recurring rides starting within 30 minutes
5. WHEN the Driver Rides Feed System finds imminent scheduled rides, THEN the Driver Rides Feed System SHALL display toast notifications with view and activate CTAs for each ride
6. WHEN all priority checks complete, THEN the Driver Rides Feed System SHALL load the Available tab with no filters applied and page set to 1

### Requirement 4: Available Rides Feed with Radius Filter

**User Story:** As a driver viewing available rides, I want to see only rides within 5km of my current location with no filters applied by default, so that I can quickly find nearby opportunities.

#### Acceptance Criteria

1. WHEN the Driver Rides Feed System loads the Available tab, THEN the Driver Rides Feed System SHALL apply a 5km radius filter based on the driver's last known location
2. WHEN the Driver Rides Feed System fetches available rides, THEN the Driver Rides Feed System SHALL return only rides where the distance from driver location to pickup location is 5km or less
3. WHEN the Available tab loads for the first time, THEN the Driver Rides Feed System SHALL set ride type filter to ALL and schedule filter to ALL
4. WHEN the Driver Rides Feed System displays available rides, THEN the Driver Rides Feed System SHALL show 10 rides per page with pagination controls
5. WHEN the Driver Rides Feed System completes the initial available rides fetch, THEN the Driver Rides Feed System SHALL store the fetch timestamp for new ride detection

### Requirement 5: Live Feed with New Ride Notifications

**User Story:** As a driver monitoring available rides, I want to be notified when new rides appear in my area without the list auto-refreshing, so that I can choose when to update my view without losing my place.

#### Acceptance Criteria

1. WHEN the Driver Rides Feed System loads the Available tab, THEN the Driver Rides Feed System SHALL subscribe to a real-time channel for new rides matching the driver's radius filter
2. WHEN a new ride is inserted that matches the available rides criteria, THEN the Driver Rides Feed System SHALL display a New Rides Available Toast without automatically refreshing the list
3. WHEN a driver clicks the refresh button on the New Rides Available Toast, THEN the Driver Rides Feed System SHALL re-fetch the current page of available rides and dismiss the toast
4. WHEN the Driver Rides Feed System switches away from the Available tab, THEN the Driver Rides Feed System SHALL unsubscribe from the new rides real-time channel
5. WHEN the Driver Rides Feed System returns to the Available tab, THEN the Driver Rides Feed System SHALL re-subscribe to the new rides real-time channel

### Requirement 6: Filter and Pagination Controls

**User Story:** As a driver browsing rides, I want to filter by ride type and schedule type on each tab, so that I can focus on the specific types of rides I'm interested in.

#### Acceptance Criteria

1. WHEN the Driver Rides Feed System displays any tab, THEN the Driver Rides Feed System SHALL show two dropdown filters for Ride Type and Schedule Type
2. WHEN a driver selects a ride type filter value, THEN the Driver Rides Feed System SHALL reset to page 1 and fetch rides matching the selected ride type for the current tab
3. WHEN a driver selects a schedule type filter value, THEN the Driver Rides Feed System SHALL reset to page 1 and fetch rides matching the selected schedule type for the current tab
4. WHEN the Driver Rides Feed System displays ride type options, THEN the Driver Rides Feed System SHALL include All, Taxi, Courier, Errands, and School/Work Run
5. WHEN the Driver Rides Feed System displays schedule type options, THEN the Driver Rides Feed System SHALL include All, Instant, Scheduled, and Recurring

### Requirement 7: Ride Card Display Standards

**User Story:** As a driver viewing ride cards, I want each card to clearly show the ride type, schedule type, and available actions, so that I can quickly understand each opportunity.

#### Acceptance Criteria

1. WHEN the Driver Rides Feed System displays a ride card, THEN the Driver Rides Feed System SHALL show the ride type as a visible badge or label
2. WHEN the Driver Rides Feed System displays a ride card, THEN the Driver Rides Feed System SHALL show the schedule type as a visible badge or label
3. WHEN the Driver Rides Feed System displays a ride card, THEN the Driver Rides Feed System SHALL include a View Details button that opens the full ride details
4. WHERE a ride has schedule type SCHEDULED or RECURRING and is not yet active, THE Driver Rides Feed System SHALL display an Activate Ride button on the card
5. WHEN a driver has an active instant ride and views an available instant ride card, THEN the Driver Rides Feed System SHALL disable the accept button and show a tooltip message
6. WHEN the Driver Rides Feed System displays a ride card, THEN the Driver Rides Feed System SHALL preserve all essential information from existing card implementations including pickup location, dropoff location, price, distance, and time information
7. WHERE a ride has been accepted by the driver, THE Driver Rides Feed System SHALL display contact details on the ride card
8. WHEN the Driver Rides Feed System displays conditional information, THEN the Driver Rides Feed System SHALL apply the same visibility rules as existing implementations

### Requirement 8: Active Ride Sub-State Progression

**User Story:** As a driver with an active ride, I want to see my current progress through the trip stages and advance to the next stage, so that I can properly manage the trip lifecycle.

#### Acceptance Criteria

1. WHEN the Driver Rides Feed System displays an active ride, THEN the Driver Rides Feed System SHALL show the current driver state from the sequence OFFER_ACCEPTED, DRIVER_ON_THE_WAY, DRIVER_ARRIVED, TRIP_STARTED, TRIP_COMPLETED
2. WHEN the Driver Rides Feed System displays the Active Ride Modal, THEN the Driver Rides Feed System SHALL show action buttons to advance to the next driver state
3. WHEN a driver clicks a state advancement button, THEN the Driver Rides Feed System SHALL update the ride's driver state in the database and refresh the active ride display
4. WHERE a ride is a recurring ride, THE Driver Rides Feed System SHALL display total trips, trips done, trips remaining, and trips cancelled
5. WHEN a ride reaches driver state TRIP_COMPLETED, THEN the Driver Rides Feed System SHALL remove it from active ride state and clear the Active Ride Modal and Toast

### Requirement 9: Scheduled and Recurring Ride Activation

**User Story:** As a driver with upcoming scheduled or recurring rides, I want to activate them when I'm ready to start, so that I can begin the trip at the appropriate time.

#### Acceptance Criteria

1. WHEN a driver clicks the Activate Ride button on a scheduled or recurring ride, THEN the Driver Rides Feed System SHALL verify the driver has no other active rides before proceeding
2. IF the driver has an active instant ride or active scheduled ride, THEN the Driver Rides Feed System SHALL display an error message and prevent activation
3. WHEN activation validation passes, THEN the Driver Rides Feed System SHALL update the ride's status group to ACTIVE and driver state to OFFER_ACCEPTED
4. WHEN a scheduled or recurring ride is successfully activated, THEN the Driver Rides Feed System SHALL set it as the active ride and display the Active Ride Modal and Toast
5. WHEN a scheduled or recurring ride is activated, THEN the Driver Rides Feed System SHALL refresh the Active tab to show the newly activated ride

### Requirement 10: Single Source of Truth for Data Fetching

**User Story:** As a developer maintaining the driver rides feed, I want all ride data fetching to go through a single unified function, so that there is no duplication or inconsistency in how rides are retrieved.

#### Acceptance Criteria

1. WHEN any component needs to fetch rides for a tab, THEN the Driver Rides Feed System SHALL use the fetchRidesForTab function with tab, filters, and pagination parameters
2. WHEN the Driver Rides Feed System maps a tab to a database query, THEN the Driver Rides Feed System SHALL use the status group value that matches the tab name
3. WHEN the Driver Rides Feed System applies filters, THEN the Driver Rides Feed System SHALL pass ride type and schedule type filters to the same fetchRidesForTab function
4. WHEN the Driver Rides Feed System handles pagination, THEN the Driver Rides Feed System SHALL calculate offset as page minus 1 times page size within fetchRidesForTab
5. WHEN the Driver Rides Feed System needs ride data, THEN the Driver Rides Feed System SHALL call either the driver_rides_feed view or get_driver_rides RPC function with consistent parameters

### Requirement 11: Component Reuse and Preservation

**User Story:** As a developer implementing the rebuild, I want to reuse uncorrupted existing components like modals, so that implementation is faster and proven UI patterns are maintained.

#### Acceptance Criteria

1. WHEN the Driver Rides Feed System identifies uncorrupted existing components, THEN the Driver Rides Feed System SHALL reuse those components without modification
2. WHEN the Driver Rides Feed System uses the Active Ride Modal, THEN the Driver Rides Feed System SHALL preserve the existing Active Ride Modal implementation
3. WHEN the Driver Rides Feed System identifies duplicated or corrupted components, THEN the Driver Rides Feed System SHALL replace them with new unified implementations
4. WHEN the Driver Rides Feed System creates new components, THEN the Driver Rides Feed System SHALL follow the same patterns and styling as preserved existing components
5. WHEN the Driver Rides Feed System removes old components, THEN the Driver Rides Feed System SHALL document which components were removed and which were preserved
