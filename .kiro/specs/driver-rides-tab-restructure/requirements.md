# Requirements Document

## Introduction

This specification addresses the restructuring of the driver rides hub tabs at `/driver/rides` to align with ride state progression rather than scheduling types. Currently, the tabs mix ride states (Available, Pending Bids, In Progress) with scheduling types (Scheduled), creating confusion. The goal is to ensure tabs represent only ride states and progression, similar to the passenger `/user/rides` interface, while handling instant, scheduled, and recurring rides appropriately within each state-based tab.

## Glossary

- **Driver_Rides_Hub**: The main interface at `/driver/rides` where drivers manage all their ride requests and active trips
- **Ride_State**: The current status of a ride in its lifecycle (pending, accepted, driver_on_way, driver_arrived, trip_started, completed, cancelled)
- **Ride_Timing**: The scheduling type of a ride (instant, scheduled_single, recurring)
- **Tab**: A navigation element representing a specific ride state category
- **Available_Rides**: Rides that drivers can bid on (ride_status='pending', no existing offer from this driver)
- **Pending_Bids**: Rides where the driver has submitted a bid awaiting passenger acceptance (offer_status='pending')
- **Active_Rides**: Rides where the driver's bid was accepted and the ride is in progress (ride_status in ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'])
- **Completed_Rides**: Rides that have been successfully finished (ride_status='completed')
- **Recurring_Series**: A collection of recurring rides linked by a series_id
- **Filter**: A UI control that allows drivers to narrow down displayed rides by ride_timing

## Requirements

### Requirement 1

**User Story:** As a driver, I want to see tabs that represent ride states rather than scheduling types, so that I can understand the progression of all my rides regardless of when they are scheduled

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub loads, THE Driver_Rides_Hub SHALL display exactly four tabs: "Available", "My Bids", "In Progress", and "Completed"
2. THE Driver_Rides_Hub SHALL NOT display a "Scheduled" tab as a primary navigation element
3. WHEN a driver views any tab, THE Driver_Rides_Hub SHALL show rides in that state regardless of ride_timing value
4. WHEN a driver switches between tabs, THE Driver_Rides_Hub SHALL maintain consistent state-based organization across all ride_timing types
5. THE Driver_Rides_Hub SHALL display badge counts on each tab showing the number of rides in that state

### Requirement 2

**User Story:** As a driver, I want to filter rides by scheduling type within each state tab, so that I can focus on instant, scheduled, or recurring rides as needed

#### Acceptance Criteria

1. WHEN a driver views the "Available" tab, THE Driver_Rides_Hub SHALL provide filter options for "All", "Instant", "Scheduled", and "Recurring"
2. WHEN a driver views the "My Bids" tab, THE Driver_Rides_Hub SHALL provide filter options for "All", "Instant", "Scheduled", and "Recurring"
3. WHEN a driver views the "In Progress" tab, THE Driver_Rides_Hub SHALL provide filter options for "All", "Instant", "Scheduled", and "Recurring"
4. WHEN a driver views the "Completed" tab, THE Driver_Rides_Hub SHALL provide filter options for "All", "Instant", "Scheduled", and "Recurring"
5. WHEN a driver selects a filter, THE Driver_Rides_Hub SHALL display only rides matching both the current tab state and the selected ride_timing
6. THE Driver_Rides_Hub SHALL persist the selected filter when switching between tabs within the same session
7. THE Driver_Rides_Hub SHALL default to "All" filter when the page first loads

### Requirement 3

**User Story:** As a driver, I want recurring rides to remain in the "In Progress" tab once accepted, so that I can monitor the series progress and upcoming trips

#### Acceptance Criteria

1. WHEN a driver accepts a recurring ride bid, THE Driver_Rides_Hub SHALL move that ride to the "In Progress" tab
2. WHILE a recurring series has remaining trips, THE Driver_Rides_Hub SHALL keep the series visible in the "In Progress" tab
3. WHEN viewing a recurring ride in "In Progress", THE Driver_Rides_Hub SHALL display series progress information including trips completed and trips remaining
4. WHEN all trips in a recurring series are completed, THE Driver_Rides_Hub SHALL move the series to the "Completed" tab
5. THE Driver_Rides_Hub SHALL display the next scheduled trip date and time for active recurring series
6. WHEN a driver cancels a recurring series, THE Driver_Rides_Hub SHALL move the series to the "Completed" tab with cancellation status

### Requirement 4

**User Story:** As a driver, I want the "Available" tab to show all rides I can bid on regardless of scheduling type, so that I don't miss opportunities

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub loads the "Available" tab, THE Driver_Rides_Hub SHALL display all rides where ride_status equals 'pending' AND acceptance_status equals 'pending' AND driver_id is null AND the driver has not submitted an offer
2. THE Driver_Rides_Hub SHALL include instant rides (ride_timing='instant') in the "Available" tab
3. THE Driver_Rides_Hub SHALL include scheduled single rides (ride_timing='scheduled_single') in the "Available" tab
4. THE Driver_Rides_Hub SHALL include recurring rides (ride_timing='recurring') in the "Available" tab
5. WHEN displaying recurring rides in "Available", THE Driver_Rides_Hub SHALL show series information including frequency and total trips
6. THE Driver_Rides_Hub SHALL allow drivers to place bids on any available ride regardless of ride_timing

### Requirement 5

**User Story:** As a driver, I want the "My Bids" tab to show all pending bids I've submitted, so that I can track which passengers might accept my offers

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub loads the "My Bids" tab, THE Driver_Rides_Hub SHALL display all rides where the driver has a ride_offer with offer_status='pending'
2. THE Driver_Rides_Hub SHALL include instant ride bids in the "My Bids" tab
3. THE Driver_Rides_Hub SHALL include scheduled single ride bids in the "My Bids" tab
4. THE Driver_Rides_Hub SHALL include recurring ride bids in the "My Bids" tab
5. WHEN displaying bids, THE Driver_Rides_Hub SHALL show the bid amount, time submitted, and ride details
6. WHEN a passenger accepts a bid, THE Driver_Rides_Hub SHALL automatically move that ride from "My Bids" to "In Progress"
7. WHEN a passenger rejects a bid, THE Driver_Rides_Hub SHALL remove that ride from "My Bids"

### Requirement 6

**User Story:** As a driver, I want the "In Progress" tab to show all active rides including scheduled and recurring ones, so that I can manage all my current commitments

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub loads the "In Progress" tab, THE Driver_Rides_Hub SHALL display all rides where driver_id equals the current driver AND ride_status is in ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started']
2. THE Driver_Rides_Hub SHALL include instant rides in progress in the "In Progress" tab
3. THE Driver_Rides_Hub SHALL include scheduled single rides in progress in the "In Progress" tab
4. THE Driver_Rides_Hub SHALL include recurring rides with active trips in the "In Progress" tab
5. WHEN displaying scheduled rides, THE Driver_Rides_Hub SHALL show the scheduled pickup time
6. WHEN displaying recurring rides, THE Driver_Rides_Hub SHALL show series progress, next trip date, and trips remaining
7. THE Driver_Rides_Hub SHALL sort rides by urgency with soonest pickup times first

### Requirement 7

**User Story:** As a driver, I want the "Completed" tab to show all finished rides with appropriate filtering, so that I can review my ride history

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub loads the "Completed" tab, THE Driver_Rides_Hub SHALL display all rides where driver_id equals the current driver AND ride_status equals 'completed'
2. THE Driver_Rides_Hub SHALL include completed instant rides in the "Completed" tab
3. THE Driver_Rides_Hub SHALL include completed scheduled single rides in the "Completed" tab
4. THE Driver_Rides_Hub SHALL include completed recurring series in the "Completed" tab
5. WHEN displaying completed recurring series, THE Driver_Rides_Hub SHALL show total trips completed and series completion date
6. THE Driver_Rides_Hub SHALL display earnings information for each completed ride
7. THE Driver_Rides_Hub SHALL sort completed rides by completion date with most recent first

### Requirement 8

**User Story:** As a driver, I want visual indicators for different ride timing types within each tab, so that I can quickly identify instant, scheduled, and recurring rides

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub displays a ride card, THE Driver_Rides_Hub SHALL show a timing badge indicating "Instant", "Scheduled", or "Recurring"
2. THE Driver_Rides_Hub SHALL use distinct icons for each ride_timing type (⚡ for instant, 📅 for scheduled, 🔄 for recurring)
3. WHEN displaying scheduled rides, THE Driver_Rides_Hub SHALL show the scheduled date and time prominently
4. WHEN displaying recurring rides, THE Driver_Rides_Hub SHALL show the frequency (daily, weekly, monthly) and series progress
5. THE Driver_Rides_Hub SHALL use consistent color coding across all tabs for ride_timing types

### Requirement 9

**User Story:** As a driver, I want the tab counts to accurately reflect the number of rides in each state, so that I can prioritize my attention

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub calculates the "Available" count, THE Driver_Rides_Hub SHALL count all pending rides the driver can bid on regardless of ride_timing
2. WHEN THE Driver_Rides_Hub calculates the "My Bids" count, THE Driver_Rides_Hub SHALL count all pending offers submitted by the driver regardless of ride_timing
3. WHEN THE Driver_Rides_Hub calculates the "In Progress" count, THE Driver_Rides_Hub SHALL count all active rides assigned to the driver regardless of ride_timing
4. WHEN THE Driver_Rides_Hub calculates the "Completed" count, THE Driver_Rides_Hub SHALL count all completed rides for the driver regardless of ride_timing
5. THE Driver_Rides_Hub SHALL update tab counts in real-time when ride states change
6. THE Driver_Rides_Hub SHALL display badge counts only when the count is greater than zero

### Requirement 10

**User Story:** As a driver, I want the interface to handle recurring series intelligently, so that I don't see duplicate entries for each trip in the series

#### Acceptance Criteria

1. WHEN THE Driver_Rides_Hub displays recurring rides in "Available", THE Driver_Rides_Hub SHALL show one entry per series with series details
2. WHEN THE Driver_Rides_Hub displays recurring rides in "My Bids", THE Driver_Rides_Hub SHALL show one entry per series with bid details
3. WHEN THE Driver_Rides_Hub displays recurring rides in "In Progress", THE Driver_Rides_Hub SHALL show one entry per series with current trip and progress information
4. WHEN THE Driver_Rides_Hub displays recurring rides in "Completed", THE Driver_Rides_Hub SHALL show one entry per completed series with summary statistics
5. WHEN a driver clicks on a recurring ride entry, THE Driver_Rides_Hub SHALL display detailed series information including all individual trips
6. THE Driver_Rides_Hub SHALL allow drivers to manage the entire series from a single interface
