# Implementation Plan

- [ ] 1. Fix ActiveRideToast z-index and positioning issues
  - Update ActiveTripIndicator component CSS to use fixed positioning at top: 80px
  - Set z-index to 50 (above content, below modal which is 9999)
  - Ensure pointer-events: auto so elements remain clickable
  - Add max-width and center alignment
  - Test that tabs remain accessible when toast is visible
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Fix ActiveRideOverlay z-index to prevent tab blocking
  - Verify ActiveRideOverlay uses z-index: 9999 for modal
  - Ensure modal backdrop doesn't interfere with dismissal
  - Test that dismiss button works correctly
  - Verify dismissal state persists correctly in sessionStorage
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 3. Implement priority check system in DriverRidesHub
  - Add checkActiveInstantRide() function that queries for active instant rides first
  - Add checkScheduledNotifications() function for upcoming scheduled rides
  - Update useEffect to run priority checks before loading tab data
  - Add priorityCheckComplete state flag
  - Ensure priority checks complete before rendering main content
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4. Fix tab loading to automatically load data on selection
  - Update handleTabChange to call loadTabData immediately
  - Add tabDataLoading state to show loading indicators
  - Ensure each tab view (Available, Pending, Active, Completed) loads data in useEffect
  - Fix empty state logic to only show when query returns zero results
  - Add proper loading skeletons for each tab
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 5. Implement 5km radius filter for available rides
  - Update AvailableRidesView query to use ST_DWithin with 5000 meters
  - Ensure driver location is available before querying
  - Add fallback behavior if location unavailable
  - Display radius information in UI
  - Test with different driver locations
  - _Requirements: 5.3_

- [ ] 6. Add "New rides available" toast notification
  - Create NewRidesToast component
  - Implement real-time subscription for new pending rides in AvailableRidesView
  - Add distance check to only show toast for rides within 5km
  - Implement toast batching (10 second window)
  - Make toast dismissable
  - Add click handler to refresh feed
  - Prevent automatic feed refresh on new rides
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 7. Integrate FilterBar into AvailableRidesView
  - Import existing FilterBar component
  - Add rideTimingFilter state to AvailableRidesView
  - Pass filter to loadAvailableRides query
  - Update query to filter by ride_timing when not 'all'
  - Calculate and pass filter counts to FilterBar
  - Position FilterBar below tab navigation
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 8. Integrate FilterBar into PendingBidsView
  - Import existing FilterBar component
  - Add rideTimingFilter state to PendingBidsView
  - Update loadPendingBids query to join rides table and filter by ride_timing
  - Calculate and pass filter counts to FilterBar
  - Position FilterBar consistently
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 9. Integrate FilterBar into ActiveTripsView
  - Import existing FilterBar component
  - Add rideTimingFilter state to ActiveTripsView
  - Update loadActiveTrips query to filter by ride_timing
  - Calculate and pass filter counts to FilterBar
  - Position FilterBar consistently
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 10. Integrate FilterBar into CompletedRidesView
  - Import existing FilterBar component
  - Add rideTimingFilter state to CompletedRidesView
  - Update loadCompletedRides query to filter by ride_timing
  - Calculate and pass filter counts to FilterBar
  - Position FilterBar consistently
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 11. Add ride type and scheduling badges to all ride cards
  - Verify RideTypeBadge displays correctly (🚕 Taxi, 📦 Courier, 🛒 Errands, 🎒 School Run)
  - Verify SchedulingBadge displays correctly (⚡ Instant, 📅 Scheduled, 🔄 Recurring)
  - Ensure badges are visible in AvailableRidesView cards
  - Ensure badges are visible in PendingBidsView cards
  - Ensure badges are visible in ActiveTripsView cards
  - Ensure badges are visible in CompletedRidesView cards
  - Use consistent positioning and styling across all views
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 12. Add "View Details" CTA to ride cards
  - Verify "View Details" button exists on AvailableRidesView cards
  - Verify "View Details" button exists on PendingBidsView cards
  - Verify "View Details" button exists on ActiveTripsView cards
  - Verify "View Details" button exists on CompletedRidesView cards
  - Ensure clicking opens appropriate modal with full ride information
  - Test modal displays all required information (addresses, passenger, instructions)
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ] 13. Verify and enhance sub-state progression in ActiveTripsView
  - Verify existing sub-state progression works (accepted → driver_on_way → driver_arrived → trip_started → completed)
  - Ensure status stepper UI is clear and intuitive
  - Test transition validation prevents invalid state changes
  - Verify database updates correctly for each transition
  - Test that UI updates immediately after status change
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 14. Add "Activate Ride" button for scheduled rides
  - Add canActivateScheduledRide() function to check if ride can be activated (within 15 min of scheduled time)
  - Add handleActivateRide() function to transition scheduled ride to active state
  - Display "Activate Ride" button in ActiveTripsView for scheduled rides when time is appropriate
  - Disable button if more than 15 minutes before scheduled time
  - Test activation transitions ride to active instant ride state
  - Verify modal appears after activation
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 15. Add recurring trip progress display
  - Create RecurringTripProgress component showing series information
  - Display total trips, completed trips, remaining trips, cancelled trips
  - Add progress bar visualization
  - Show next trip date
  - Integrate into ActiveTripsView for recurring rides
  - Integrate into CompletedRidesView for completed series
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 16. Consolidate duplicate query logic
  - Create src/services/driverRideQueryService.js
  - Move loadAvailableRides query to service
  - Move loadPendingBids query to service
  - Move loadActiveTrips query to service
  - Move loadCompletedRides query to service
  - Export reusable query functions with filter support
  - Update all components to use centralized service
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 17. Consolidate real-time subscription logic
  - Create src/hooks/useDriverRideRealtime.js
  - Move real-time subscription setup to hook
  - Support tab-specific subscriptions
  - Implement selective subscription based on active tab
  - Add debouncing for update events (500ms)
  - Export single hook for all components
  - Update DriverRidesHub to use centralized hook
  - _Requirements: 13.3, 14.2_

- [ ] 18. Implement query result caching
  - Create useRideCache hook with Map-based cache
  - Set cache TTL to 30 seconds
  - Implement getCachedRides and setCachedRides functions
  - Integrate caching into driverRideQueryService
  - Test cache invalidation on real-time updates
  - Measure performance improvement
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 19. Add database indexes for query optimization
  - Create migration file for new indexes
  - Add composite index on (driver_id, ride_status, ride_timing)
  - Add spatial index on pickup_coordinates for pending rides
  - Add index on (driver_id, offer_status) for ride_offers
  - Add index on (series_id, ride_status) for recurring rides
  - Test query performance before and after indexes
  - _Requirements: 14.1, 14.5_

- [ ] 20. Implement pagination for available rides
  - Add pagination state (page, pageSize) to AvailableRidesView
  - Update query to use LIMIT and OFFSET
  - Add "Load More" button at bottom of list
  - Implement infinite scroll as alternative
  - Show loading indicator while loading more
  - Test with large datasets
  - _Requirements: 5.2, 14.3_

- [ ] 21. Add filter persistence across tab switches
  - Store filter state in sessionStorage
  - Restore filter state on component mount
  - Implement per-tab filter persistence
  - Clear filters on logout
  - Test filter persistence when switching tabs
  - Test filter persistence on page refresh
  - _Requirements: 10.6_

- [ ] 22. Remove duplicate and unused code
  - Search for duplicate component definitions
  - Remove unused imports across all driver components
  - Remove deprecated code and commented-out sections
  - Consolidate duplicate helper functions
  - Remove unused state variables
  - Clean up console.log statements
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 23. Standardize naming conventions
  - Ensure all components use PascalCase
  - Ensure all hooks use camelCase with 'use' prefix
  - Ensure all services use camelCase
  - Ensure all constants use UPPER_SNAKE_CASE
  - Update imports to match new naming
  - Update file names if necessary
  - _Requirements: 13.5_

- [ ] 24. Add comprehensive error handling
  - Add try-catch blocks to all async functions
  - Implement error toast notifications
  - Add retry logic for failed queries
  - Add fallback UI for error states
  - Log errors to console with context
  - Test error scenarios (network failure, invalid data, etc.)
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 25. Test complete driver flow end-to-end
  - Test driver going online
  - Test viewing available rides with filters
  - Test placing bid on instant ride
  - Test placing bid on scheduled ride
  - Test bid acceptance and modal appearance
  - Test progressing through sub-states
  - Test completing ride
  - Test ride appearing in completed tab
  - Test scheduled ride activation
  - Test recurring ride progress tracking
  - _Requirements: All_

- [ ] 26. Optimize component re-renders
  - Add React.memo to RideCard components
  - Add useMemo for filtered ride lists
  - Add useCallback for event handlers
  - Implement proper dependency arrays in useEffect
  - Test performance with React DevTools Profiler
  - Measure and document performance improvements
  - _Requirements: 14.1, 14.2, 14.3_

- [ ] 27. Add accessibility improvements
  - Add ARIA labels to all interactive elements
  - Implement keyboard navigation for filters
  - Add focus management for modals
  - Test with screen reader
  - Ensure minimum touch target sizes (44x44px)
  - Add high contrast mode support
  - Test keyboard-only navigation
  - _Requirements: All (accessibility is cross-cutting)_

- [ ] 28. Document code and add comments
  - Add JSDoc comments to all functions
  - Document component props with PropTypes or TypeScript
  - Add inline comments for complex logic
  - Update README with driver rides hub documentation
  - Document filter behavior
  - Document priority check system
  - Document real-time subscription architecture
  - _Requirements: 13.5_
