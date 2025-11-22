# Implementation Plan

- [x] 1. Create Supabase database layer


  - Create RPC function `get_driver_rides` that accepts driver_id, status_group, ride_type filter, schedule_type filter, limit, and offset parameters
  - Implement status_group mapping logic: AVAILABLE (pending rides, no offer from driver), BID (pending offers), ACTIVE (accepted offers or in-progress rides), COMPLETED (completed rides)
  - Add 5km radius filter for AVAILABLE rides using PostGIS ST_Distance from driver location to pickup coordinates
  - Calculate distance_to_driver_km field using PostGIS for all rides
  - Join with profiles table to include passenger contact info (name, phone, email) only when ride is accepted
  - Join with recurring_trip_series table to include total_trips, trips_done, trips_remaining, trips_cancelled for recurring rides
  - Join with ride_notifications table to calculate has_unread_notifications boolean
  - Apply pagination using LIMIT and OFFSET parameters
  - Return all fields defined in DriverRide interface from design document
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_



- [ ] 2. Create priority check RPCs
  - Create RPC function `get_active_instant_ride` that finds active instant rides for a driver (schedule_type='INSTANT', status_group='ACTIVE', driver_id matches)
  - Create RPC function `get_imminent_scheduled_rides` that finds scheduled/recurring rides starting within specified window (default 30 minutes)
  - Create RPC function `activate_scheduled_ride` that validates no active rides exist, then updates ride to status_group='ACTIVE' and driver_state='OFFER_ACCEPTED'



  - Add validation in `activate_scheduled_ride` to return error if driver has any active instant or scheduled rides
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 3. Create data access service layer
  - Create `src/services/driverRidesApi.js` with function `fetchDriverRides(driverId, statusGroup, rideTypeFilter, scheduleFilter, page, pageSize)` that calls `get_driver_rides` RPC



  - Add function `fetchActiveInstantRide(driverId)` that calls `get_active_instant_ride` RPC
  - Add function `fetchImminentScheduledRides(driverId, windowMinutes)` that calls `get_imminent_scheduled_rides` RPC
  - Add function `activateScheduledRide(rideId, driverId)` that calls `activate_scheduled_ride` RPC
  - Add error handling and response transformation for all API functions
  - _Requirements: 10.1, 10.5_

- [x] 4. Create useDriverRidesFeed hook


  - Create `src/hooks/useDriverRidesFeed.js` hook that manages activeTab, rideTypeFilter, scheduleFilter, page, pageSize, rides, isLoading, totalCount state
  - Implement `fetchRidesForTab` function as the single source of truth for fetching rides, calling `fetchDriverRides` from driverRidesApi
  - Add `changeTab` function that updates activeTab, resets page to 1, and calls fetchRidesForTab
  - Add `changeRideTypeFilter` function that updates filter, resets page to 1, and calls fetchRidesForTab
  - Add `changeScheduleFilter` function that updates filter, resets page to 1, and calls fetchRidesForTab
  - Add `changePage` function that updates page and calls fetchRidesForTab


  - Add `refreshCurrentTab` function that re-fetches current tab with existing filters and page
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4_

- [ ] 5. Create useActiveRideCheck hook
  - Create `src/hooks/useActiveRideCheck.js` hook that manages activeInstantRide, scheduledAlerts, showActiveRideModal, hasActiveRideToast state
  - Implement `checkActiveInstantRide` function that calls `fetchActiveInstantRide` and updates state
  - Implement `checkImminentScheduledRides` function that calls `fetchImminentScheduledRides` and updates scheduledAlerts state



  - Add `dismissActiveRideToast` function that sets hasActiveRideToast to false
  - Add `dismissActiveRideModal` function that sets showActiveRideModal to false
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. Create RidesTabs component
  - Create `src/dashboards/driver/components/RidesTabs.jsx` presentational component



  - Accept props: activeTab, onTabChange, counts (available, bid, active, completed)
  - Render horizontal scrollable tab bar with four tabs: Available, Bids/Offers, Active/In Progress, Completed
  - Display icon, label, and count badge for each tab
  - Highlight active tab with colored border and background
  - Make tabs keyboard accessible with proper ARIA labels
  - _Requirements: 2.1_


- [ ] 7. Create RideFiltersBar component
  - Create `src/dashboards/driver/components/RideFiltersBar.jsx` presentational component
  - Accept props: rideTypeFilter, scheduleFilter, onRideTypeChange, onScheduleChange, page, totalPages, onPageChange
  - Render Ride Type dropdown with options: All, Taxi, Courier, Errands, School/Work Run
  - Render Schedule Type dropdown with options: All, Instant, Scheduled, Recurring
  - Render pagination controls showing current page and total pages with Previous/Next buttons
  - Make responsive for mobile (stack filters vertically on small screens)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Create RideList component


  - Create `src/dashboards/driver/components/RideList.jsx` presentational component
  - Accept props: rides, isLoading, activeInstantRide, onRideClick, onAcceptRide, onActivateRide
  - Display loading skeleton when isLoading is true
  - Display empty state message when rides array is empty and isLoading is false
  - Map rides array to RideCard components
  - Preserve existing bulk ride grouping logic (group rides by batch_id when booking_type='bulk')
  - Pass activeInstantRide to each RideCard to determine if accept button should be disabled
  - _Requirements: 2.2, 2.3, 2.4_



- [ ] 9. Enhance RideCard component
  - Modify existing RideCard component to accept new props: isAcceptDisabled, disabledTooltip, onActivate
  - Preserve all existing card information: pickup location, dropoff location, price, distance, time, service type badge, timing badge
  - Add Activate Ride button that displays when schedule_type is SCHEDULED or RECURRING and ride is not yet active
  - Disable Activate Ride button when activeInstantRide exists
  - Disable Accept button when isAcceptDisabled is true and show tooltip with disabledTooltip text


  - Preserve conditional contact details display (only show when ride is accepted)
  - Preserve bulk ride visual treatment with indigo border and background
  - Ensure all existing ride information fields remain visible
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ] 10. Create ActiveRideToast component
  - Create `src/dashboards/driver/components/ActiveRideToast.jsx` component
  - Accept props: ride, onView, onDismiss


  - Render fixed position toast at top of page with non-blocking styling
  - Display text "You have an ongoing instant trip"
  - Add View button that calls onView prop
  - Add Dismiss button that calls onDismiss prop
  - Ensure toast does not block interaction with page content below
  - _Requirements: 1.2, 1.3_





- [ ] 11. Create ScheduledAlertToast component
  - Create `src/dashboards/driver/components/ScheduledAlertToast.jsx` component
  - Accept props: rides, onViewAndActivate, onDismiss
  - Display count of upcoming trips in toast message
  - Render View & Activate button for each ride in the rides array
  - Add Dismiss button that calls onDismiss prop
  - Implement auto-dismiss after 30 seconds
  - _Requirements: 3.5_

- [ ] 12. Create NewAvailableRidesToast component
  - Create `src/dashboards/driver/components/NewAvailableRidesToast.jsx` component
  - Accept props: visible, onRefresh, onDismiss


  - Only render when visible prop is true
  - Display text "New rides available in your area"
  - Add Refresh button that calls onRefresh prop
  - Add Dismiss button that calls onDismiss prop
  - Auto-dismiss when onRefresh is called



  - _Requirements: 5.2, 5.3_

- [ ] 13. Implement real-time subscription for new rides
  - Create `src/hooks/useNewRidesSubscription.js` hook
  - Subscribe to Supabase real-time channel for INSERT events on rides table filtered by status='pending' and within driver radius
  - Set hasNewAvailableRides state to true when new ride is detected
  - Only subscribe when activeTab is AVAILABLE
  - Unsubscribe when component unmounts or tab changes away from AVAILABLE
  - Store lastAvailableFetchTs timestamp when Available tab is first loaded
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ] 14. Create DriverRidesPage container component
  - Create `src/dashboards/driver/DriverRidesPage.jsx` container component
  - Initialize useDriverRidesFeed hook to manage tab, filters, pagination, and rides state
  - Initialize useActiveRideCheck hook to manage priority UI state
  - Initialize useNewRidesSubscription hook for Available tab real-time updates
  - Implement page load sequence: fetch driver info, check active instant ride, check imminent scheduled rides, load default Available tab
  - Wire up RidesTabs component with activeTab state and changeTab handler
  - Wire up RideFiltersBar component with filter states and change handlers
  - Wire up RideList component with rides data and action handlers
  - Integrate preserved ActiveRideModal component with showActiveRideModal state
  - Integrate ActiveRideToast component with hasActiveRideToast state
  - Integrate ScheduledAlertToast component with scheduledAlerts state
  - Integrate NewAvailableRidesToast component with hasNewAvailableRides state
  - Implement handleActivateRide function that calls activateScheduledRide API and updates active ride state
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 15. Implement non-blocking modal behavior
  - Ensure ActiveRideModal renders with backdrop that allows clicks to pass through to page content
  - Verify tabs remain clickable when ActiveRideModal is open
  - Verify ride list remains scrollable when ActiveRideModal is open
  - Test that only accept buttons for instant rides are disabled when active instant ride exists, not view details buttons
  - _Requirements: 1.3, 1.4, 1.5_

- [ ] 16. Remove deprecated components and code
  - Delete `src/dashboards/driver/components/AvailableRidesView.jsx` (replaced by unified RideList)
  - Delete `src/dashboards/driver/components/PendingBidsView.jsx` (replaced by unified RideList)
  - Delete `src/dashboards/driver/components/ActiveTripsView.jsx` (replaced by unified RideList)
  - Delete `src/dashboards/driver/components/CompletedRidesView.jsx` (replaced by unified RideList)
  - Remove duplicate ride fetching logic from DriverRidesHub component
  - Update DriverRidesHub to use new DriverRidesPage component
  - Remove any duplicate status mapping logic from individual view components
  - Document which components were removed and which were preserved in a MIGRATION.md file
  - _Requirements: 10.1, 11.1, 11.3, 11.5_

- [ ] 17. Add error handling and recovery
  - Add try-catch blocks to all API calls in driverRidesApi service
  - Display error toast when fetchDriverRides fails with message "Failed to load rides. Please try again."
  - Display error toast when location permission is denied with message "Location access required to view available rides"
  - Display error toast when activateScheduledRide fails due to active ride conflict with message "You must complete your current ride first"
  - Implement retry button in error toasts that calls the failed operation again
  - Log all errors to console for debugging
  - Preserve user's current state (tab, filters, page) when errors occur
  - _Requirements: 9.2_

- [ ] 18. Verify radius filter for available rides
  - Test that Available tab only shows rides within 5km of driver's current location
  - Verify distance_to_driver_km is calculated correctly using PostGIS
  - Test that rides outside 5km radius are not displayed in Available tab
  - Verify that when driver location updates significantly (>200m), Available tab refreshes with new radius-filtered results
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 19. Verify priority logic on page load
  - Test page load with no active rides: should load Available tab with no priority UI
  - Test page load with active instant ride: should display ActiveRideModal and ActiveRideToast
  - Test page load with imminent scheduled rides: should display ScheduledAlertToast
  - Test page load with both active instant ride and imminent scheduled rides: should display all priority UI elements
  - Verify priority checks complete before default tab loads
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 20. Verify filter and pagination behavior
  - Test changing ride type filter resets page to 1 and fetches filtered results
  - Test changing schedule type filter resets page to 1 and fetches filtered results
  - Test changing page number fetches next page with current filters applied
  - Test that each tab maintains its own filter state independently
  - Verify pagination controls show correct current page and total pages
  - _Requirements: 6.1, 6.2, 6.3, 2.5_

- [ ] 21. Verify real-time updates
  - Test that new ride insertion triggers NewAvailableRidesToast when on Available tab
  - Test that clicking Refresh on NewAvailableRidesToast fetches updated rides and dismisses toast
  - Test that switching away from Available tab unsubscribes from real-time channel
  - Test that returning to Available tab re-subscribes to real-time channel
  - Verify real-time subscription only triggers for rides within driver's 5km radius
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 22. Verify scheduled ride activation
  - Test activating a scheduled ride when no active rides exist: should succeed and display ActiveRideModal
  - Test activating a scheduled ride when active instant ride exists: should fail with error message
  - Test that Activate Ride button is disabled when activeInstantRide exists
  - Test that activated ride moves from Available/Scheduled tab to Active tab
  - Verify activated ride shows correct driver_state of OFFER_ACCEPTED
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 23. Verify ride card display standards
  - Test that all ride cards show ride type badge (Taxi, Courier, Errands, School/Work Run)
  - Test that all ride cards show schedule type badge (Instant, Scheduled, Recurring)
  - Test that all ride cards show View Details button
  - Test that scheduled/recurring ride cards show Activate Ride button when not yet active
  - Test that accept button is disabled with tooltip when active instant ride exists
  - Test that contact details only appear on ride cards when ride is accepted
  - Test that all existing ride information (pickup, dropoff, price, distance, time) is preserved
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ] 24. Test mobile responsiveness
  - Test horizontal scrollable tabs on mobile viewport
  - Test that filters stack vertically on small screens
  - Test that ride cards are full-width on mobile
  - Test that toasts don't block content on mobile
  - Test touch interactions for dismissing toasts
  - Verify all touch targets are at least 44x44px
  - _Requirements: 1.3_

- [ ] 25. Verify accessibility compliance
  - Test keyboard navigation through all tabs using Tab and Enter keys
  - Test that all interactive elements have proper ARIA labels
  - Test focus management when opening and closing modals
  - Verify screen reader announces tab changes and status updates
  - Test color contrast for all text meets WCAG AA standards
  - Test that all buttons and links are keyboard accessible
  - _Requirements: 1.3, 2.1_
