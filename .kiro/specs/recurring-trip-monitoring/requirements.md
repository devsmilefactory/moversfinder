# Requirements Document: Recurring Trip Monitoring

## Introduction

This document outlines the requirements for monitoring and managing recurring trips in the TaxiCab e-hailing PWA. The feature enables drivers and passengers to track the number of trips remaining in a recurring series, view next trip dates, and receive reminders for upcoming recurring trips.

## Glossary

- **Recurring_Trip**: A ride series that repeats on a schedule (daily, weekly, weekends, etc.)
- **Trip_Series**: A collection of individual rides that belong to the same recurring trip
- **Trips_Remaining**: The number of rides left in a recurring trip series
- **Next_Trip_Date**: The scheduled date/time for the next occurrence in a recurring series
- **Trip_Reminder**: A notification sent to drivers/passengers before a recurring trip
- **Series_Completion**: When all rides in a recurring trip series have been completed
- **TaxiCab_App**: The Progressive Web Application for e-hailing services

## Requirements

### Requirement 1: Track Trips Remaining in Recurring Series

**User Story:** As a driver, I want to see how many trips are left in a recurring series, so that I know my commitment level.

#### Acceptance Criteria

1. WHEN a driver views a recurring trip, THE TaxiCab_App SHALL display the total number of trips in the series
2. THE TaxiCab_App SHALL display the number of completed trips in the series
3. THE TaxiCab_App SHALL display the number of remaining trips in the series
4. THE TaxiCab_App SHALL calculate trips remaining as (total trips - completed trips)
5. WHEN all trips in a series are completed, THE TaxiCab_App SHALL mark the series as complete
6. THE TaxiCab_App SHALL update the trips remaining count in real-time when a trip is completed

### Requirement 2: Display Next Trip Date for Recurring Series

**User Story:** As a driver, I want to see when my next recurring trip is scheduled, so that I can plan my availability.

#### Acceptance Criteria

1. WHEN a driver views a recurring trip series, THE TaxiCab_App SHALL display the next scheduled trip date
2. THE TaxiCab_App SHALL calculate the next trip date based on the recurrence pattern (daily, weekly, weekends)
3. WHEN the current trip in a series is completed, THE TaxiCab_App SHALL automatically calculate and display the next trip date
4. THE TaxiCab_App SHALL display the next trip date in a user-friendly format (e.g., "Tomorrow at 8:00 AM", "Monday, Jan 20 at 8:00 AM")
5. WHEN there are no more trips remaining, THE TaxiCab_App SHALL display "Series Complete" instead of a next trip date
6. THE TaxiCab_App SHALL highlight the next trip if it is within 24 hours

### Requirement 3: Send Reminders for Upcoming Recurring Trips

**User Story:** As a driver, I want to receive reminders before my recurring trips, so that I don't forget my commitments.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL send a reminder notification 24 hours before a recurring trip
2. THE TaxiCab_App SHALL send a reminder notification 1 hour before a recurring trip
3. THE reminder notification SHALL include the trip details (pickup location, time, passenger name)
4. THE reminder notification SHALL be clickable and navigate to the trip details
5. THE TaxiCab_App SHALL allow drivers to configure reminder preferences (enable/disable, timing)
6. THE TaxiCab_App SHALL not send reminders for cancelled trips
7. THE TaxiCab_App SHALL mark reminders as sent to avoid duplicate notifications

### Requirement 4: Passenger View of Recurring Trip Status

**User Story:** As a passenger, I want to see the status of my recurring trip series, so that I know how many trips I have left.

#### Acceptance Criteria

1. WHEN a passenger views their recurring trip, THE TaxiCab_App SHALL display the series progress
2. THE TaxiCab_App SHALL show a progress bar indicating completed vs remaining trips
3. THE TaxiCab_App SHALL display the next scheduled trip date
4. THE TaxiCab_App SHALL allow passengers to view the full schedule of upcoming trips
5. THE TaxiCab_App SHALL allow passengers to cancel future trips in the series
6. WHEN a passenger cancels a trip, THE TaxiCab_App SHALL update the trips remaining count

### Requirement 5: Recurring Trip Series Management

**User Story:** As a driver, I want to manage my recurring trip commitments, so that I can adjust my schedule if needed.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL allow drivers to view all their recurring trip series in one place
2. THE TaxiCab_App SHALL display the status of each series (active, paused, completed)
3. THE TaxiCab_App SHALL allow drivers to pause a recurring series
4. WHEN a series is paused, THE TaxiCab_App SHALL not create new trips for that series
5. THE TaxiCab_App SHALL allow drivers to resume a paused series
6. THE TaxiCab_App SHALL allow drivers to cancel a recurring series
7. WHEN a series is cancelled, THE TaxiCab_App SHALL notify the passenger

### Requirement 6: Database Schema for Recurring Trips

**User Story:** As a system, I need to track recurring trip series data, so that I can manage trips remaining and next trip dates.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL store recurring trip series information in a `recurring_trip_series` table
2. THE table SHALL include fields: id, user_id, driver_id, recurrence_pattern, total_trips, completed_trips, start_date, end_date, status
3. THE TaxiCab_App SHALL link individual rides to their series via a `series_id` foreign key
4. THE TaxiCab_App SHALL update the `completed_trips` count when a ride in the series is completed
5. THE TaxiCab_App SHALL calculate `trips_remaining` as (total_trips - completed_trips)
6. THE TaxiCab_App SHALL store the next_trip_date in the series record

### Requirement 7: Recurring Trip Notifications

**User Story:** As a passenger, I want to receive notifications about my recurring trips, so that I'm informed of upcoming rides.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL send a notification to passengers 24 hours before a recurring trip
2. THE TaxiCab_App SHALL send a notification to passengers when a driver accepts the next trip in the series
3. THE TaxiCab_App SHALL send a notification when a recurring series is about to end (1 trip remaining)
4. THE TaxiCab_App SHALL send a notification when a recurring series is complete
5. THE notifications SHALL include the series name and trip details
6. THE TaxiCab_App SHALL allow passengers to configure notification preferences

### Requirement 8: Recurring Trip Analytics

**User Story:** As a driver, I want to see analytics for my recurring trips, so that I can understand my recurring revenue.

#### Acceptance Criteria

1. THE TaxiCab_App SHALL display total earnings from recurring trips
2. THE TaxiCab_App SHALL display the number of active recurring series
3. THE TaxiCab_App SHALL display the average trips per series
4. THE TaxiCab_App SHALL display upcoming recurring trip revenue projections
5. THE TaxiCab_App SHALL allow drivers to filter analytics by date range
6. THE TaxiCab_App SHALL display a calendar view of recurring trips

