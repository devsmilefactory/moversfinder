# Requirements Document

## Introduction

This document outlines the requirements for enhancing ride management in the TaxiCab e-hailing PWA. The enhancements focus on driver availability management, active ride notifications, active ride modal management, trip activation controls, and real-time synchronization. These features ensure drivers cannot accept multiple concurrent trips, passengers are always aware of active rides, and all state changes propagate in real-time across the system.

## Glossary

- **TaxiCab_App**: The Progressive Web Application for e-hailing services
- **Driver_Availability**: The state indicating whether a driver can accept new ride bids
- **Active_Trip**: A ride with status 'accepted', 'driver_on_way', 'driver_arrived', or 'trip_started'
- **Bid_Acceptance**: The process where a passenger accepts a driver's offer for a ride
- **Active_Ride_Modal**: A modal dialog displaying current active ride details and controls
- **Toast_Notification**: A temporary notification message that appears at the top of the screen
- **Trip_Activation_Button**: A button that allows drivers to mark a scheduled ride as active
- **Supabase_Realtime**: Real-time database subscription system for live updates
- **Ride_Status**: Current state of a ride (pending, accepted, driver_on_way, driver_arrived, trip_started, completed, cancelled)
- **Ride_Timing**: When the ride occurs (instant, scheduled_single, scheduled_recurring)
- **Passenger_Dashboard**: User interface where passengers view and manage their rides
- **Driver_Dashboard**: User interface where drivers view and manage ride requests and active trips

## Requirements

### Requirement 1: Driver Availability Check on Bid Acceptance

**User Story:** As a passenger, I want the system to prevent accepting bids from drivers who are already engaged in a trip, so that I am only matched with available drivers.

#### Acceptance Criteria

1. WHEN a passenger attempts to accept a driver bid, THE TaxiCab_App SHALL check if the driver has an Active_Trip
2. IF the driver has an Active_Trip with ride_timing equal to 'instant', THEN THE TaxiCab_App SHALL reject the bid acceptance
3. WHEN a bid is rejected due to driver unavailability, THE TaxiCab_App SHALL display a notification to the passenger stating "Driver is already engaged in a trip"
4. WHEN a bid is rejected due to driver unavailability, THE TaxiCab_App SHALL send a notification to the driver informing them of the rejected bid attempt
5. THE TaxiCab_App SHALL allow bid acceptance only when the driver has no Active_Trip with ride_timing equal to 'instant'
6. THE TaxiCab_App SHALL perform the availability check atomically to prevent race conditions

### Requirement 2: Driver Notification on Rejected Bid

**User Story:** As a driver, I want to be notified when a passenger tries to accept my bid but I'm already engaged in a trip, so that I understand why the bid was not accepted.

#### Acceptance Criteria

1. WHEN a bid acceptance is rejected due to driver unavailability, THE TaxiCab_App SHALL create a notification record for the driver
2. THE notification SHALL include the title "Bid Rejected - Already Engaged"
3. THE notification SHALL include a message explaining "A passenger tried to accept your bid, but you are currently engaged in an active trip"
4. THE TaxiCab_App SHALL display the notification in real-time using Supabase_Realtime subscriptions
5. THE TaxiCab_App SHALL show the notification as a toast message with type 'info' and duration of 8 seconds

### Requirement 3: Active Ride Toast Notification for Passengers

**User Story:** As a passenger, I want to see a toast notification when I log in and have an active ride, so that I can quickly navigate to my ongoing trip.

#### Acceptance Criteria

1. WHEN a passenger logs into the TaxiCab_App, THE TaxiCab_App SHALL check for Active_Trip records where the passenger is the user
2. IF an Active_Trip exists, THE TaxiCab_App SHALL display a toast notification at the top of the screen
3. THE toast notification SHALL include the text "You have an active ride in progress"
4. THE toast notification SHALL be clickable and navigate to the active ride details when clicked
5. THE toast notification SHALL remain visible for 10 seconds or until dismissed by the user
6. THE toast notification SHALL have a distinctive style with a blue background and white text
7. THE TaxiCab_App SHALL show the toast notification only once per login session

### Requirement 4: Active Ride Check on Rides Feed Access

**User Story:** As a passenger, I want the system to check for active rides whenever I access the rides feed, so that I am always shown my current trip status first.

#### Acceptance Criteria

1. WHEN a passenger navigates to the rides feed, THE TaxiCab_App SHALL check for Active_Trip records for the passenger
2. THE active ride check SHALL occur after the approval status check for scheduled rides
3. IF an Active_Trip exists, THE TaxiCab_App SHALL display the Active_Ride_Modal automatically
4. THE Active_Ride_Modal SHALL take priority over displaying the rides feed list
5. THE TaxiCab_App SHALL allow the passenger to dismiss the Active_Ride_Modal and view the rides feed
6. WHEN the Active_Ride_Modal is dismissed, THE TaxiCab_App SHALL remember the dismissal for the current session

### Requirement 5: Active Ride Modal Display Conditions

**User Story:** As a passenger, I want the active ride modal to appear automatically when I have an ongoing trip, so that I can easily track and manage my current ride.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL display the Active_Ride_Modal when a passenger has a ride with ride_status in ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started')
2. THE Active_Ride_Modal SHALL display automatically when the passenger navigates to the Passenger_Dashboard
3. THE Active_Ride_Modal SHALL display automatically when the passenger navigates to the rides feed
4. THE Active_Ride_Modal SHALL update in real-time when the ride_status changes using Supabase_Realtime
5. THE Active_Ride_Modal SHALL close automatically when the ride_status changes to 'completed' or 'cancelled'
6. THE TaxiCab_App SHALL allow the passenger to manually dismiss the Active_Ride_Modal
7. WHEN manually dismissed, THE Active_Ride_Modal SHALL not reappear until the ride_status changes or the page is refreshed

### Requirement 6: Trip Activation Button for Drivers

**User Story:** As a driver, I want to activate a scheduled trip when I'm ready to start, so that the system knows I'm engaged with that ride.

#### Acceptance Criteria

1. WHEN a driver views a scheduled ride with ride_status equal to 'accepted', THE TaxiCab_App SHALL display an "Activate Trip" button
2. WHEN the driver clicks the "Activate Trip" button, THE TaxiCab_App SHALL update the ride_status to 'driver_on_way'
3. WHEN the trip is activated, THE Trip_Activation_Button SHALL change its text to "Trip Active"
4. WHEN the Trip_Activation_Button displays "Trip Active", THE TaxiCab_App SHALL disable the button
5. WHEN the trip is activated, THE TaxiCab_App SHALL display a "View Details" button next to the "Trip Active" button
6. WHEN the driver clicks the "View Details" button, THE TaxiCab_App SHALL open the Active_Ride_Modal
7. THE TaxiCab_App SHALL broadcast the status change via Supabase_Realtime to the passenger

### Requirement 7: Real-Time Synchronization for Driver Availability

**User Story:** As a system, I want to synchronize driver availability status in real-time, so that all components reflect the current state without requiring page refreshes.

#### Acceptance Criteria

1. WHEN a driver's Active_Trip status changes, THE TaxiCab_App SHALL broadcast the change via Supabase_Realtime
2. THE TaxiCab_App SHALL subscribe to rides table changes filtered by driver_id
3. WHEN a ride_status changes to 'accepted', 'driver_on_way', 'driver_arrived', or 'trip_started', THE TaxiCab_App SHALL update the driver's availability state
4. WHEN a ride_status changes to 'completed' or 'cancelled', THE TaxiCab_App SHALL update the driver's availability state to available
5. THE TaxiCab_App SHALL update the driver availability state within 1 second of the database change
6. THE TaxiCab_App SHALL handle multiple concurrent subscriptions without conflicts

### Requirement 8: Real-Time Synchronization for Active Ride Modal

**User Story:** As a passenger, I want the active ride modal to update automatically when the driver changes the trip status, so that I always see the current state without refreshing.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL subscribe to rides table changes filtered by user_id for passengers
2. WHEN the ride_status changes, THE TaxiCab_App SHALL update the Active_Ride_Modal content in real-time
3. WHEN the driver's location updates, THE TaxiCab_App SHALL update the map display in the Active_Ride_Modal
4. THE TaxiCab_App SHALL update the status timeline in the Active_Ride_Modal to reflect the current ride_status
5. THE TaxiCab_App SHALL update the estimated arrival time when the driver's location changes
6. THE TaxiCab_App SHALL maintain the Active_Ride_Modal open state during real-time updates

### Requirement 9: Real-Time Synchronization for Toast Notifications

**User Story:** As a passenger, I want to receive toast notifications in real-time when my ride status changes, so that I'm immediately informed of important updates.

#### Acceptance Criteria

1. WHEN the ride_status changes to 'accepted', THE TaxiCab_App SHALL display a toast notification "Driver accepted your ride"
2. WHEN the ride_status changes to 'driver_on_way', THE TaxiCab_App SHALL display a toast notification "Driver is on the way"
3. WHEN the ride_status changes to 'driver_arrived', THE TaxiCab_App SHALL display a toast notification "Driver has arrived"
4. WHEN the ride_status changes to 'trip_started', THE TaxiCab_App SHALL display a toast notification "Trip has started"
5. THE toast notifications SHALL appear at the top of the screen
6. THE toast notifications SHALL be clickable and navigate to the Active_Ride_Modal
7. THE TaxiCab_App SHALL use Supabase_Realtime subscriptions to receive status changes without polling

### Requirement 10: Atomic Bid Acceptance Transaction

**User Story:** As a system administrator, I want bid acceptance to be atomic and prevent race conditions, so that multiple passengers cannot accept the same driver simultaneously.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL use database transactions for bid acceptance operations
2. THE bid acceptance transaction SHALL include the driver availability check
3. THE bid acceptance transaction SHALL include updating the ride record with driver_id
4. THE bid acceptance transaction SHALL include updating the offer status to 'accepted'
5. THE bid acceptance transaction SHALL include rejecting all other pending offers for the same ride
6. IF the driver availability check fails, THEN THE TaxiCab_App SHALL rollback the entire transaction
7. THE TaxiCab_App SHALL return a clear error message when the transaction fails due to driver unavailability

### Requirement 11: Active Ride Persistence Across Sessions

**User Story:** As a passenger, I want my active ride to persist across browser sessions, so that I can close and reopen the app without losing my trip information.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL store active ride information in the database, not in local session storage
2. WHEN a passenger logs in, THE TaxiCab_App SHALL query the database for Active_Trip records
3. THE TaxiCab_App SHALL display the Active_Ride_Modal based on database state, not cached state
4. WHEN a passenger closes and reopens the browser, THE TaxiCab_App SHALL restore the active ride state from the database
5. THE TaxiCab_App SHALL not rely on localStorage or sessionStorage for active ride state

### Requirement 12: Driver Active Trip Indicator

**User Story:** As a driver, I want to see a clear indicator when I have an active trip, so that I know I cannot accept new instant ride requests.

#### Acceptance Criteria

1. WHEN a driver has an Active_Trip with ride_timing equal to 'instant', THE TaxiCab_App SHALL display a prominent indicator in the Driver_Dashboard
2. THE indicator SHALL show the text "Active Trip in Progress"
3. THE indicator SHALL display the pickup and dropoff locations of the active trip
4. THE indicator SHALL include a button to view the Active_Ride_Modal
5. THE indicator SHALL be visible at the top of the Driver_Dashboard
6. THE indicator SHALL update in real-time when the trip status changes
7. WHEN the active trip is completed or cancelled, THE TaxiCab_App SHALL remove the indicator

### Requirement 13: Scheduled Ride Activation Workflow

**User Story:** As a driver, I want a clear workflow for activating scheduled rides, so that I can manage multiple scheduled rides without confusion.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL display all accepted scheduled rides in a separate section of the Driver_Dashboard
2. WHEN a scheduled ride's pickup time is within 30 minutes, THE TaxiCab_App SHALL highlight the ride with a yellow background
3. WHEN a scheduled ride's pickup time is within 30 minutes, THE TaxiCab_App SHALL enable the "Activate Trip" button
4. WHEN a scheduled ride's pickup time is more than 30 minutes away, THE TaxiCab_App SHALL disable the "Activate Trip" button
5. WHEN the driver activates a scheduled trip, THE TaxiCab_App SHALL move the ride to the active trips section
6. THE TaxiCab_App SHALL allow drivers to have multiple accepted scheduled rides but only one active instant ride
7. THE TaxiCab_App SHALL display the scheduled pickup time for each scheduled ride

### Requirement 14: Error Handling for Availability Conflicts

**User Story:** As a passenger, I want clear error messages when bid acceptance fails, so that I understand what went wrong and what to do next.

#### Acceptance Criteria

1. WHEN bid acceptance fails due to driver unavailability, THE TaxiCab_App SHALL display an error message "This driver is currently engaged in another trip"
2. THE error message SHALL include a suggestion "Please try another driver or wait a few moments"
3. THE TaxiCab_App SHALL automatically refresh the available offers list after showing the error
4. THE TaxiCab_App SHALL remove the unavailable driver's offer from the display
5. THE TaxiCab_App SHALL log the error details for debugging purposes
6. THE error message SHALL be displayed as a toast notification with type 'error' and duration of 6 seconds

### Requirement 15: Real-Time Offer Availability Updates

**User Story:** As a passenger, I want driver offers to disappear automatically when the driver becomes unavailable, so that I only see offers from available drivers.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL subscribe to driver availability changes via Supabase_Realtime
2. WHEN a driver accepts another ride, THE TaxiCab_App SHALL remove that driver's pending offers from all passengers' views
3. THE removal SHALL occur within 2 seconds of the driver accepting another ride
4. THE TaxiCab_App SHALL display a brief message "Some offers are no longer available" when offers are removed
5. THE TaxiCab_App SHALL not allow passengers to click on offers that are being removed
6. THE TaxiCab_App SHALL handle the removal gracefully without causing UI flicker or errors
