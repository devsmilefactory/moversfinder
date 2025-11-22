# Requirements Document

## Introduction

This document outlines the requirements for fixing critical issues in the TaxiCab e-hailing PWA application. The app is a dual-mode (passenger/driver) platform offering multiple services (taxi, courier, errands, school/work run, bulk trips) with real-time updates via Supabase. The identified issues affect core functionality including page refresh errors, real-time updates, ride calculation logic, trip status updates, and UI overflow problems.

## Glossary

- **TaxiCab_App**: The Progressive Web Application for e-hailing services
- **Passenger_Mode**: User interface for booking and tracking rides
- **Driver_Mode**: User interface for accepting and managing ride requests
- **Supabase_Realtime**: Real-time database subscription system for live updates
- **Ride_Status**: Current state of a ride (pending, accepted, driver_on_way, driver_arrived, trip_started, trip_completed, cancelled)
- **Service_Type**: Category of ride (taxi, courier, errands, school_run, work_run, bulk_trips)
- **Ride_Timing**: When the ride occurs (instant, scheduled_single, scheduled_recurring)
- **Fare_Calculation**: Process of computing ride cost based on distance, service type, and scheduling
- **Active_Trip_Modal**: Driver interface showing current ride details and status controls
- **Chrome_DevTools**: Browser developer tools for debugging and network inspection

## Requirements

### Requirement 1: Page Refresh Error Resolution

**User Story:** As a user, I want the app to reload without errors, so that I can continue using the app after refreshing the page.

#### Acceptance Criteria

1. WHEN the user refreshes the browser page, THE TaxiCab_App SHALL reload without displaying "page temporarily moved" errors
2. WHEN the app detects a page refresh, THE TaxiCab_App SHALL properly reinitialize authentication state and routing
3. WHEN authentication state is restored after refresh, THE TaxiCab_App SHALL redirect users to their appropriate dashboard based on their active profile type
4. WHEN routing occurs after refresh, THE TaxiCab_App SHALL use replace navigation to prevent back button issues
5. IF authentication fails during refresh, THEN THE TaxiCab_App SHALL redirect to the login page with appropriate error messaging

### Requirement 2: Real-Time Updates for Passenger Mode

**User Story:** As a passenger, I want to see real-time updates on my ride status without refreshing, so that I know when the driver is on the way, has arrived, or the trip is in progress.

#### Acceptance Criteria

1. WHEN a driver accepts a ride, THE TaxiCab_App SHALL immediately update the passenger's UI to show "accepted" status without manual refresh
2. WHEN a driver sends an offer for a ride, THE TaxiCab_App SHALL display the offer notification to the passenger in real-time
3. WHEN the ride status changes to "driver_on_way", THE TaxiCab_App SHALL update the passenger's trip view with driver location and estimated arrival time
4. WHEN the ride status changes to "driver_arrived", THE TaxiCab_App SHALL notify the passenger that the driver has arrived at pickup location
5. WHEN the ride status changes to "trip_started", THE TaxiCab_App SHALL update the passenger's view to show trip in progress
6. WHEN the ride status changes to "trip_completed", THE TaxiCab_App SHALL display the post-ride rating form to the passenger
7. THE TaxiCab_App SHALL maintain Supabase_Realtime subscriptions for the rides table filtered by user_id
8. THE TaxiCab_App SHALL maintain Supabase_Realtime subscriptions for the ride_offers table filtered by ride_id

### Requirement 3: Real-Time Updates for Driver Mode

**User Story:** As a driver, I want to see new ride requests appear automatically without refreshing, so that I can respond quickly to opportunities.

#### Acceptance Criteria

1. WHEN a new ride request is added to the ride_acceptance_queue for the driver, THE TaxiCab_App SHALL display the request in the driver's feed without manual refresh
2. WHEN a ride request is removed from the queue, THE TaxiCab_App SHALL remove it from the driver's feed in real-time
3. WHEN the driver's online status changes, THE TaxiCab_App SHALL update the subscription filters accordingly
4. THE TaxiCab_App SHALL maintain Supabase_Realtime subscriptions for the ride_acceptance_queue table filtered by driver_id
5. THE TaxiCab_App SHALL maintain Supabase_Realtime subscriptions for the rides table filtered by driver_id for active trips
6. WHEN filtering instant rides, THE TaxiCab_App SHALL only display rides within a 5 kilometer radius of the driver's current location
7. WHEN filtering scheduled rides, THE TaxiCab_App SHALL display all scheduled rides regardless of distance from driver location
8. THE TaxiCab_App SHALL recalculate distance filters when the driver's location updates

### Requirement 4: Ride Calculation Logic for Taxi and Courier Services

**User Story:** As a passenger booking a taxi or courier service, I want accurate fare calculations based on distance and scheduling, so that I know the correct cost before booking.

#### Acceptance Criteria

1. WHEN a passenger books a taxi or courier ride, THE TaxiCab_App SHALL calculate the base fare using minimum fare plus distance-based cost per kilometer
2. WHEN a passenger selects a recurring ride option, THE TaxiCab_App SHALL multiply the base fare by two
3. WHEN a passenger schedules a ride for multiple dates, THE TaxiCab_App SHALL multiply the fare by the number of scheduled dates
4. THE TaxiCab_App SHALL display the calculated fare breakdown showing base cost, recurring multiplier, and date multiplier
5. THE TaxiCab_App SHALL validate that the minimum fare is applied when distance-based calculation is below minimum

### Requirement 5: Ride Calculation Logic for School/Work Run Services

**User Story:** As a passenger booking a school or work run, I want the fare calculated correctly for round trips and multiple dates, so that I am charged accurately.

#### Acceptance Criteria

1. WHEN a passenger books a school_run or work_run service, THE TaxiCab_App SHALL calculate the base fare using minimum fare plus distance-based cost per kilometer
2. WHEN the ride is marked as a round trip, THE TaxiCab_App SHALL multiply the base fare by two
3. WHEN a passenger schedules the run for multiple dates, THE TaxiCab_App SHALL multiply the fare by the number of scheduled dates
4. THE TaxiCab_App SHALL display the fare breakdown showing base cost, round trip multiplier, and date multiplier

### Requirement 6: Ride Calculation Logic for Errands Services

**User Story:** As a passenger booking errands, I want each errand to have its own cost and the total calculated correctly for multiple dates, so that I pay the right amount.

#### Acceptance Criteria

1. WHEN a passenger adds an errand, THE TaxiCab_App SHALL calculate the cost for that errand based on distance from previous location
2. WHEN multiple errands are added, THE TaxiCab_App SHALL sum the costs of all errands to get the total base fare
3. WHEN errands are scheduled for multiple dates, THE TaxiCab_App SHALL multiply the total errand cost by the number of scheduled dates
4. THE TaxiCab_App SHALL display the fare breakdown showing individual errand costs, total base cost, and date multiplier

### Requirement 7: Ride Calculation Logic for Bulk Trips

**User Story:** As a passenger booking bulk trips, I want the fare calculated based on the number of trips, so that I understand the total cost.

#### Acceptance Criteria

1. WHEN a passenger books a bulk trip, THE TaxiCab_App SHALL calculate the base fare using minimum fare plus distance-based cost per kilometer
2. WHEN the number of trips is specified, THE TaxiCab_App SHALL multiply the base fare by the number of trips
3. THE TaxiCab_App SHALL display the fare breakdown showing per-trip cost and total cost for all trips

### Requirement 8: Driver Trip Status Updates

**User Story:** As a driver, I want to update trip status in real-time, so that passengers are informed of my progress.

#### Acceptance Criteria

1. WHEN a driver clicks "On My Way", THE TaxiCab_App SHALL update the ride_status to "driver_on_way" and update status_updated_at timestamp
2. WHEN a driver clicks "Arrived", THE TaxiCab_App SHALL update the ride_status to "driver_arrived" and record actual_pickup_time
3. WHEN a driver clicks "Start Trip", THE TaxiCab_App SHALL update the ride_status to "trip_started" and record trip_started_at timestamp
4. WHEN a driver clicks "Complete Trip", THE TaxiCab_App SHALL update the ride_status to "trip_completed" and record trip_completed_at and actual_dropoff_time
5. THE TaxiCab_App SHALL create entries in the ride_status_history table for each status change
6. THE TaxiCab_App SHALL broadcast status changes via Supabase_Realtime to connected passengers

### Requirement 9: Post-Ride Rating Form Display

**User Story:** As a passenger, I want to see a rating form after my trip is completed, so that I can provide feedback on my experience.

#### Acceptance Criteria

1. WHEN the ride_status changes to "trip_completed", THE TaxiCab_App SHALL display a post-ride rating modal to the passenger
2. THE TaxiCab_App SHALL allow the passenger to rate the driver from 1 to 5 stars
3. THE TaxiCab_App SHALL allow the passenger to provide optional written feedback
4. WHEN the passenger submits the rating, THE TaxiCab_App SHALL update the rides table with rating and review fields
5. THE TaxiCab_App SHALL provide an option to save the trip as a template for future bookings

### Requirement 10: Active Trip Modal UI Optimization

**User Story:** As a driver, I want the active trip modal to display all information without scrolling, so that I can quickly access trip controls.

#### Acceptance Criteria

1. THE Active_Trip_Modal SHALL display all trip information and controls within the viewport without requiring vertical scrolling
2. THE Active_Trip_Modal SHALL use a compact layout with appropriate spacing and font sizes
3. THE Active_Trip_Modal SHALL prioritize essential information (pickup/dropoff, status buttons, passenger contact) in the visible area
4. THE Active_Trip_Modal SHALL use collapsible sections for secondary information (special instructions, package details)
5. THE Active_Trip_Modal SHALL be responsive and adapt to different screen sizes while maintaining readability

### Requirement 11: Database Analysis and Optimization

**User Story:** As a system administrator, I want to analyze the database schema and queries, so that I can identify and fix performance issues.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL use Supabase MCP tools to analyze table structures and relationships
2. THE TaxiCab_App SHALL identify missing indexes on frequently queried columns
3. THE TaxiCab_App SHALL verify that RLS policies are correctly configured for real-time subscriptions
4. THE TaxiCab_App SHALL check for proper foreign key constraints and cascading rules
5. THE TaxiCab_App SHALL validate that ride_status and acceptance_status enums match application logic

### Requirement 12: Chrome DevTools Integration for Debugging

**User Story:** As a developer, I want to use Chrome DevTools to inspect network requests and real-time subscriptions, so that I can diagnose issues quickly.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL log Supabase_Realtime connection events to the browser console
2. THE TaxiCab_App SHALL log subscription events (INSERT, UPDATE, DELETE) with payload details
3. THE TaxiCab_App SHALL provide clear error messages when real-time subscriptions fail
4. THE TaxiCab_App SHALL expose debugging information for fare calculations in development mode
5. THE TaxiCab_App SHALL log ride status transitions with timestamps for troubleshooting

### Requirement 13: Comprehensive Testing Protocol

**User Story:** As a developer, I want to test all implementations using Chrome DevTools and Supabase MCP, so that I can verify functionality works correctly.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL be tested on the local development server at http://localhost:4030
2. THE TaxiCab_App SHALL be tested using driver test account (driver.test@bmtoa.co.zw / Drivere@123)
3. THE TaxiCab_App SHALL be tested using passenger test account (user.test@taxicab.co.zw / User@123)
4. WHEN testing, THE developer SHALL use Chrome DevTools MCP to inspect network traffic and console logs
5. WHEN testing, THE developer SHALL use Supabase MCP to verify database state changes
6. THE developer SHALL test profile switching between driver and passenger modes
7. THE developer SHALL verify real-time updates by monitoring console messages for subscription events
8. THE developer SHALL test the complete ride flow from booking to completion
9. THE developer SHALL verify fare calculations for each service type with different configurations
10. THE developer SHALL test the 5km radius filtering for driver ride requests

### Requirement 14: Driver Offers Display Optimization

**User Story:** As a passenger viewing active rides, I want driver offers displayed at the bottom of the ride card with visual emphasis, so that I can easily see and respond to offers without them conflicting with ride information.

#### Acceptance Criteria

1. WHEN driver offers exist for a pending ride, THE TaxiCab_App SHALL display the offers section at the bottom of the ride details card
2. THE TaxiCab_App SHALL apply a colored background to the offers section to distinguish it from ride information
3. THE TaxiCab_App SHALL apply a pulse animation to the offers section to draw attention to new offers
4. THE TaxiCab_App SHALL ensure the offers section does not overlap or conflict with ride information details
5. THE TaxiCab_App SHALL maintain all existing offer functionality including accept and reject actions
6. THE TaxiCab_App SHALL display the offers section only when the ride status is pending and offers exist
