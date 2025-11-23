# Requirements Document

## Introduction

This specification addresses critical issues in the driver rides feed at `/driver/rides` that are preventing proper functionality. The current implementation has UI blocking issues, loading problems, and code duplication that need to be resolved. This spec focuses on fixing the immediate problems while implementing the proper ride state management, filtering, and priority handling.

## Glossary

- **Driver_Rides_Hub**: The main interface at `/driver/rides` where drivers manage ride requests and active trips
- **Active_Ride_Toast**: A dismissable notification banner showing active ride information
- **Active_Ride_Modal**: A dismissable modal overlay showing detailed active ride information
- **Ride_State_Tab**: Navigation tabs representing ride states (Available, My Bids, In Progress, Completed)
- **Ride_Type**: The service category (taxi, courier, errands, school_run)
- **Scheduling_Option**: The timing type (instant, scheduled, recurring)
- **Priority_Check**: System logic that determines which UI elements to display based on active rides
- **Live_Feed**: Real-time updating list of available rides
- **Radius_Filter**: Geographic constraint limiting rides to 5km from driver location

## Requirements

### Requirement 1

**User Story:** As a driver, I want the active ride toast to not block access to ride status tabs, so that I can navigate the interface while having an active ride

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub displays an Active_Ride_Toast, THE Driver_Rides_Hub SHALL position the toast to not overlap with tab navigation controls
2. WHEN a driver dismisses the Active_Ride_Toast, THE Driver_Rides_Hub SHALL maintain the dismissal state until the ride status changes
3. THE Driver_Rides_Hub SHALL allow full access to all tabs while the Active_Ride_Toast is visible
4. WHEN the Active_Ride_Toast is displayed, THE Driver_Rides_Hub SHALL ensure all interactive elements remain clickable
5. THE Driver_Rides_Hub SHALL display the Active_Ride_Toast with a z-index that does not interfere with tab interaction

### Requirement 2

**User Story:** As a driver, I want each ride status tab to automatically load rides when selected, so that I don't see "no rides" messages when rides exist

#### Acceptance Criteria

1. WHEN a driver selects the Available tab, THE Driver_Rides_Hub SHALL immediately query and display available rides
2. WHEN a driver selects the My Bids tab, THE Driver_Rides_Hub SHALL immediately query and display pending bids
3. WHEN a driver selects the In Progress tab, THE Driver_Rides_Hub SHALL immediately query and display active rides
4. WHEN a driver selects the Completed tab, THE Driver_Rides_Hub SHALL immediately query and display completed rides
5. THE Driver_Rides_Hub SHALL show a loading indicator while fetching rides for each tab
6. THE Driver_Rides_Hub SHALL only display "no rides" message when the query returns zero results

### Requirement 3

**User Story:** As a driver, I want the system to check for active instant rides first, so that I can immediately focus on my current trip

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub loads, THE Driver_Rides_Hub SHALL query for active instant rides before loading other content
2. WHEN an active instant ride exists, THE Driver_Rides_Hub SHALL display the Active_Ride_Modal as the highest priority UI element
3. THE Driver_Rides_Hub SHALL make the Active_Ride_Modal dismissable by the driver
4. WHEN the Active_Ride_Modal is dismissed, THE Driver_Rides_Hub SHALL display the Active_Ride_Toast as a secondary indicator
5. THE Driver_Rides_Hub SHALL make the Active_Ride_Toast dismissable independently of the modal
6. WHEN a driver has an active instant ride, THE Driver_Rides_Hub SHALL disable the ability to accept other instant ride requests

### Requirement 4

**User Story:** As a driver, I want the system to check for scheduled ride notifications second, so that I'm alerted when scheduled rides are about to start

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub completes the active instant ride check, THE Driver_Rides_Hub SHALL query for unread scheduled ride notifications
2. WHEN unread scheduled ride notifications exist, THE Driver_Rides_Hub SHALL display a notification banner below the active ride indicators
3. THE Driver_Rides_Hub SHALL show scheduled ride notifications for rides starting within 30 minutes
4. WHEN a driver views a scheduled ride notification, THE Driver_Rides_Hub SHALL mark it as read
5. THE Driver_Rides_Hub SHALL allow drivers to dismiss scheduled ride notifications

### Requirement 5

**User Story:** As a driver, I want the available rides feed to load by default without filters, so that I can see all opportunities

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub loads the Available tab, THE Driver_Rides_Hub SHALL display all available rides without applying filters
2. THE Driver_Rides_Hub SHALL paginate available rides with 10 rides per page
3. THE Driver_Rides_Hub SHALL filter available rides to only those within 5km radius of the driver location
4. THE Driver_Rides_Hub SHALL include all ride types (taxi, courier, errands, school_run) in the default view
5. THE Driver_Rides_Hub SHALL include all scheduling options (instant, scheduled, recurring) in the default view

### Requirement 6

**User Story:** As a driver, I want a simple "new rides available" toast when new rides appear, so that I can load them on demand without constant refreshing

#### Acceptance Criteria

1. WHEN a new ride becomes available within the driver radius, THE Driver_Rides_Hub SHALL display a "New rides available" toast notification
2. THE Driver_Rides_Hub SHALL make the toast dismissable
3. WHEN a driver clicks the toast, THE Driver_Rides_Hub SHALL refresh the available rides feed
4. THE Driver_Rides_Hub SHALL not automatically refresh the feed when new rides arrive
5. THE Driver_Rides_Hub SHALL batch multiple new ride notifications within 10 seconds into a single toast

### Requirement 7

**User Story:** As a driver, I want active rides to progress through sub-states, so that I can track my progress through the trip

#### Acceptance Criteria

1. WHEN a driver's bid is accepted, THE Driver_Rides_Hub SHALL set the ride status to 'offer_accepted'
2. WHEN a driver starts driving to pickup, THE Driver_Rides_Hub SHALL allow updating status to 'driver_on_way'
3. WHEN a driver arrives at pickup, THE Driver_Rides_Hub SHALL allow updating status to 'driver_arrived'
4. WHEN a driver starts the trip, THE Driver_Rides_Hub SHALL allow updating status to 'trip_started'
5. WHEN a driver completes the trip, THE Driver_Rides_Hub SHALL allow updating status to 'trip_completed'
6. THE Driver_Rides_Hub SHALL display the current sub-state prominently in the active ride UI

### Requirement 8

**User Story:** As a driver, I want scheduled and recurring rides to have an activate button, so that I can start them when ready

#### Acceptance Criteria

1. WHEN a scheduled ride time arrives, THE Driver_Rides_Hub SHALL display an "Activate Ride" button
2. WHEN a driver clicks "Activate Ride" on a scheduled ride, THE Driver_Rides_Hub SHALL transition the ride to active instant ride state
3. WHEN a recurring ride instance is ready, THE Driver_Rides_Hub SHALL display an "Activate Ride" button
4. WHEN a driver activates a recurring ride instance, THE Driver_Rides_Hub SHALL treat it as an active instant ride
5. THE Driver_Rides_Hub SHALL disable activation for scheduled rides more than 15 minutes before scheduled time

### Requirement 9

**User Story:** As a driver, I want recurring rides to show trip counts, so that I can track series progress

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub displays a recurring ride, THE Driver_Rides_Hub SHALL show total trips in the series
2. THE Driver_Rides_Hub SHALL show trips completed count
3. THE Driver_Rides_Hub SHALL show trips remaining count
4. THE Driver_Rides_Hub SHALL show trips cancelled count
5. THE Driver_Rides_Hub SHALL display a progress bar visualizing completion percentage

### Requirement 10

**User Story:** As a driver, I want ride type and scheduling option filters as dropdowns under each tab, so that I can combine different filtering options

#### Acceptance Criteria

1. WHEN a driver views any ride state tab, THE Driver_Rides_Hub SHALL display a ride type dropdown filter
2. THE Driver_Rides_Hub SHALL include options: All, Taxi, Courier, Errands, School/Work Run
3. WHEN a driver views any ride state tab, THE Driver_Rides_Hub SHALL display a scheduling option dropdown filter
4. THE Driver_Rides_Hub SHALL include options: All, Instant, Scheduled, Recurring
5. WHEN a driver selects filters, THE Driver_Rides_Hub SHALL apply both filters simultaneously to the ride list
6. THE Driver_Rides_Hub SHALL persist filter selections when switching between tabs

### Requirement 11

**User Story:** As a driver, I want each ride card to display ride type and schedule option, so that I can quickly identify ride characteristics

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub displays a ride card, THE Driver_Rides_Hub SHALL show a ride type badge (🚕 Taxi, 📦 Courier, 🛒 Errands, 🎒 School Run)
2. THE Driver_Rides_Hub SHALL show a scheduling option badge (⚡ Instant, 📅 Scheduled, 🔄 Recurring)
3. THE Driver_Rides_Hub SHALL position badges prominently at the top of each ride card
4. THE Driver_Rides_Hub SHALL use distinct colors for each badge type
5. THE Driver_Rides_Hub SHALL ensure badges are visible on all screen sizes

### Requirement 12

**User Story:** As a driver, I want CTAs to view further details on each ride card, so that I can access complete ride information

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub displays a ride card, THE Driver_Rides_Hub SHALL include a "View Details" button
2. WHEN a driver clicks "View Details", THE Driver_Rides_Hub SHALL open a modal with complete ride information
3. THE Driver_Rides_Hub SHALL display pickup and dropoff addresses in the details modal
4. THE Driver_Rides_Hub SHALL display passenger information in the details modal
5. THE Driver_Rides_Hub SHALL display special instructions in the details modal
6. THE Driver_Rides_Hub SHALL allow drivers to close the details modal and return to the feed

### Requirement 13

**User Story:** As a system administrator, I want the codebase cleaned of duplicating and conflicting implementations, so that the system is maintainable

#### Acceptance Criteria

1. THE Driver_Rides_Hub SHALL use a single source of truth for ride state queries
2. THE Driver_Rides_Hub SHALL eliminate duplicate component definitions
3. THE Driver_Rides_Hub SHALL consolidate conflicting real-time subscription logic
4. THE Driver_Rides_Hub SHALL remove unused or deprecated code
5. THE Driver_Rides_Hub SHALL use consistent naming conventions across all components

### Requirement 14

**User Story:** As a system administrator, I want the code optimized to function efficiently, so that the application performs well

#### Acceptance Criteria

1. THE Driver_Rides_Hub SHALL implement query result caching for ride lists
2. THE Driver_Rides_Hub SHALL debounce real-time updates to prevent excessive re-renders
3. THE Driver_Rides_Hub SHALL use pagination for large result sets
4. THE Driver_Rides_Hub SHALL lazy load ride details only when requested
5. THE Driver_Rides_Hub SHALL minimize database queries by batching related data fetches
