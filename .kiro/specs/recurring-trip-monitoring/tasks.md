# Implementation Plan: Recurring Trip Monitoring

## Overview
This implementation plan breaks down the recurring trip monitoring feature into actionable tasks. Each task builds incrementally on previous work.

## Task List

### Phase 1: Database Schema & Backend

- [x] 1. Create recurring_trip_series table





  - Create migration file for `recurring_trip_series` table
  - Add all required columns (id, user_id, driver_id, series_name, recurrence_pattern, etc.)


  - Add constraints and indexes
  - Test table creation in development
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 2. Create trip_reminders table


  - Create migration file for `trip_reminders` table
  - Add columns for reminder scheduling
  - Add indexes for pending reminders query
  - Test table creation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_



- [x] 3. Update rides table for series support


  - Add `series_id` column to rides table
  - Add `series_trip_number` column
  - Create index on series_id


  - Test schema changes
  - _Requirements: 6.3_


- [ ] 4. Create calculate_next_trip_date function
  - Implement SQL function to calculate next trip date
  - Support daily, weekly, weekdays, weekends patterns
  - Handle end date constraints



  - Test with various recurrence patterns

  - _Requirements: 2.2, 2.3_

- [ ] 5. Create update_series_progress trigger
  - Implement trigger function for ride completion
  - Increment completed_trips counter

  - Calculate and set next_trip_date
  - Auto-create next ride in series
  - Mark series as complete when done

  - Test trigger with sample data
  - _Requirements: 1.4, 1.6, 2.3_

- [ ] 6. Create schedule_trip_reminders function
  - Implement function to schedule reminders
  - Create 24-hour and 1-hour reminders
  - Schedule for both driver and passenger
  - Test reminder creation
  - _Requirements: 3.1, 3.2, 3.3_

### Phase 2: Backend Services

- [x] 7. Create recurring trip service


  - Create `src/services/recurringTripService.js`

  - Implement `createRecurringSeries()` function
  - Implement `getSeriesDetails()` function
  - Implement `updateSeriesStatus()` function (pause/resume/cancel)
  - Add error handling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_





- [ ] 8. Create reminder service
  - Create `src/services/reminderService.js`
  - Implement `getPendingReminders()` function
  - Implement `sendReminder()` function
  - Implement `markReminderSent()` function
  - Add error handling


  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_


### Phase 3: UI Components

- [ ] 9. Create RecurringTripCard component
  - Create `src/components/recurring/RecurringTripCard.jsx`
  - Display series name and recurrence pattern
  - Show progress bar (completed/total trips)
  - Display trips remaining




  - Show next trip date
  - Display pickup/dropoff locations
  - Add "View Details" button
  - Style with purple theme
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.4_




- [ ] 10. Create SeriesProgressBar component
  - Create `src/components/recurring/SeriesProgressBar.jsx`
  - Display visual progress bar
  - Show completed vs total trips
  - Add percentage display


  - Make responsive


  - _Requirements: 4.2_

- [ ] 11. Create RecurringTripsView component (Driver)
  - Create `src/dashboards/driver/components/RecurringTripsView.jsx`
  - Load driver's recurring series from database
  - Display series cards in grid layout



  - Filter by status (active, paused, completed)



  - Add real-time subscription for updates


  - Show empty state when no series
  - _Requirements: 5.1, 5.2_

- [ ] 12. Create RecurringSeriesModal component
  - Create `src/components/modals/RecurringSeriesModal.jsx`



  - Display full series details
  - Show all upcoming trips in series
  - Display series schedule
  - Add pause/resume/cancel actions
  - Show series analytics
  - _Requirements: 5.3, 5.4, 5.5, 5.6_

- [ ] 13. Create PassengerSeriesView component
  - Create `src/dashboards/client/components/PassengerSeriesView.jsx`
  - Display passenger's recurring series
  - Show series progress
  - Display next trip date
  - Allow viewing full schedule
  - Add cancel future trips option
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

### Phase 4: Dashboard Integration

- [ ] 14. Add Recurring tab to DriverRidesHub
  - Update `src/dashboards/driver/components/DriverRidesHub.jsx`
  - Add "Recurring" tab to navigation
  - Integrate RecurringTripsView component
  - Add series count badge
  - Test tab switching
  - _Requirements: 5.1, 5.2_

- [ ] 15. Add recurring series to passenger dashboard
  - Update passenger dashboard to show recurring series
  - Add series progress widget
  - Display next trip reminder
  - Add link to full series view
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 16. Update ScheduledRidesView to show series info
  - Update `src/dashboards/driver/components/ScheduledRidesView.jsx`
  - Add series badge for recurring trips
  - Display trip number in series (e.g., "Trip 3 of 10")
  - Show series name
  - Add link to series details
  - _Requirements: 1.1, 1.2, 1.3_

### Phase 5: Notifications & Reminders

- [ ] 17. Implement reminder notification system
  - Create background job to check pending reminders
  - Send notifications via Supabase
  - Mark reminders as sent
  - Handle failed reminders
  - Add retry logic
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 18. Create reminder preferences UI
  - Add reminder settings to user profile
  - Allow enable/disable reminders
  - Configure reminder timing (24h, 1h, custom)
  - Save preferences to database
  - _Requirements: 3.5, 7.6_

- [ ] 19. Implement series ending notifications
  - Send notification when 1 trip remaining
  - Send notification when series completes
  - Include series summary in notification
  - _Requirements: 7.3, 7.4_

- [ ] 20. Add passenger notifications
  - Send 24h reminder to passengers
  - Notify when driver accepts next trip
  - Notify on series ending
  - Notify on series completion
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

### Phase 6: Analytics & Reporting

- [ ] 21. Create recurring trip analytics component
  - Create `src/dashboards/driver/components/RecurringTripAnalytics.jsx`
  - Display total earnings from recurring trips
  - Show number of active series
  - Calculate average trips per series
  - Show revenue projections
  - Add date range filter
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 22. Create calendar view for recurring trips
  - Create `src/components/recurring/RecurringTripCalendar.jsx`
  - Display monthly calendar
  - Highlight recurring trip dates
  - Show trip details on date click
  - Allow navigation between months
  - Color-code by series
  - _Requirements: 8.6_

- [ ] 23. Add series management dashboard
  - Create overview of all series
  - Show series health metrics
  - Display completion rates
  - Add filters and search
  - Export series data
  - _Requirements: 5.1, 5.2, 8.1, 8.2, 8.3_

### Phase 7: Testing & Polish

- [ ] 24. End-to-end testing
  - [ ] 24.1 Test series creation
    - Create daily recurring series
    - Create weekly recurring series
    - Create weekdays recurring series
    - Create weekends recurring series
    - Verify trips are created correctly
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_
  
  - [ ] 24.2 Test series progress tracking
    - Complete a trip in series
    - Verify completed_trips increments
    - Verify trips_remaining decrements
    - Verify next_trip_date updates
    - Verify next ride is created
    - _Requirements: 1.4, 1.5, 1.6, 2.3_
  
  - [ ] 24.3 Test reminders
    - Verify 24h reminder is sent
    - Verify 1h reminder is sent
    - Test reminder preferences
    - Verify no duplicate reminders
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ] 24.4 Test series management
    - Pause a series
    - Resume a series
    - Cancel a series
    - Verify passenger notification
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [ ] 24.5 Test series completion
    - Complete all trips in series
    - Verify series marked as complete
    - Verify completion notification sent
    - Verify no more trips created
    - _Requirements: 1.5, 2.5, 7.4_
  
  - [ ] 24.6 Test passenger view
    - View series progress
    - View full schedule
    - Cancel future trip
    - Verify trips_remaining updates
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ] 24.7 Test analytics
    - Verify earnings calculation
    - Check active series count
    - Verify revenue projections
    - Test date range filters
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 25. Performance optimization
  - Add database indexes for series queries
  - Optimize reminder queries
  - Cache series calculations
  - Test with large number of series
  - Profile and optimize slow queries

- [ ] 26. Documentation
  - Document series creation flow
  - Document reminder system
  - Add API documentation
  - Create user guide for recurring trips
  - Document database schema

## Notes

- All database changes should be tested in development first
- Use Supabase MCP to verify database operations
- Each component should have proper error handling
- All real-time subscriptions must clean up on unmount
- Test with both driver and passenger accounts
- Ensure mobile responsiveness for all components

## Dependencies

- Requires completed ride-management-enhancements spec
- Requires Supabase Realtime setup
- Requires notification system
- Requires existing dashboard structure

## Estimated Timeline

- Phase 1 (Database): 2-3 days
- Phase 2 (Services): 1-2 days
- Phase 3 (Components): 3-4 days
- Phase 4 (Integration): 1-2 days
- Phase 5 (Notifications): 2-3 days
- Phase 6 (Analytics): 2-3 days
- Phase 7 (Testing): 2-3 days

**Total Estimated Time:** 13-20 days

