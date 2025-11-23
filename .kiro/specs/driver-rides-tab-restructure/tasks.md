# Implementation Plan

- [x] 1. Create FilterBar component for ride timing filters


  - Create new FilterBar component with filter options (All, Instant, Scheduled, Recurring)
  - Implement filter button styling with icons and active states
  - Add optional count badges for each filter option
  - Handle filter selection and callback to parent
  - Make component responsive with horizontal scroll on mobile
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.2_




- [ ] 2. Add filter state management to DriverRidesHub
  - Add rideTimingFilter state ('all' | 'instant' | 'scheduled' | 'recurring')
  - Implement handleFilterChange function
  - Persist filter selection in session storage



  - Pass filter prop to all child view components
  - Update real-time subscription handlers to respect filter
  - _Requirements: 2.5, 2.6, 2.7_

- [ ] 3. Refactor AvailableRidesView to support filtering
  - Add rideTimingFilter prop to component interface



  - Update loadAvailableRides query to filter by ride_timing
  - Implement recurring ride grouping by series_id
  - Add timing badges to ride cards (⚡📅🔄)
  - Display series information for recurring rides
  - Update empty state to reflect active filter
  - _Requirements: 2.1, 4.1, 4.2, 4.3, 4.4, 4.5, 8.1, 8.2, 8.4_




- [ ] 4. Refactor PendingBidsView to support filtering
  - Add rideTimingFilter prop to component interface
  - Update loadPendingBids query to join rides table and filter by ride_timing
  - Implement recurring bid grouping by series_id
  - Add timing badges to bid cards
  - Display series information for recurring bids
  - Update empty state to reflect active filter




  - _Requirements: 2.2, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.4_

- [ ] 5. Refactor ActiveRidesView (ActiveTripsView) to support filtering
  - Add rideTimingFilter prop to component interface
  - Update loadActiveRides query to filter by ride_timing
  - Join with recurring_trip_series table for recurring rides
  - Display series progress for recurring rides (trips completed/remaining)
  - Show next trip date for recurring rides
  - Add timing badges to ride cards

  - Sort rides by urgency (trip_started > driver_arrived > driver_on_way > accepted)
  - Update empty state to reflect active filter
  - _Requirements: 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.1, 8.2, 8.3, 8.4_

- [ ] 6. Create CompletedRidesView component
  - Create new CompletedRidesView component file
  - Add rideTimingFilter prop to component interface
  - Implement loadCompletedRides query with ride_timing filter
  - Join with recurring_trip_series for recurring rides
  - Display ride cards with completion date and earnings
  - Show series summary for completed recurring rides
  - Calculate and display total earnings by filter
  - Implement pagination or infinite scroll for large lists
  - Add timing badges to completed ride cards
  - Create empty state for no completed rides
  - _Requirements: 2.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.4_




- [ ] 7. Create RecurringRideCard component
  - Create new RecurringRideCard component for series display
  - Add props for series data, current ride, and context (available/pending/active/completed)
  - Display frequency badge (Daily, Weekly, Monthly)
  - Implement progress bar showing trips completed/total



  - Show next trip date and time
  - Display pickup/dropoff locations

  - Show bid amount for pending context
  - Add series status indicator
  - Make card clickable to view series details
  - _Requirements: 3.3, 3.4, 3.5, 4.5, 8.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 8. Update tab navigation in DriverRidesHub
  - Remove "Scheduled" tab from tab navigation array
  - Update tab state to only include 'available', 'pending', 'active', 'completed'
  - Update tab button rendering to exclude scheduled tab

  - Update activeTab state initialization
  - Remove ScheduledRidesView import and usage
  - Update tab content rendering logic
  - _Requirements: 1.1, 1.2_

- [ ] 9. Update count calculation logic
  - Modify loadCounts function to count by ride state, not timing
  - Update availableCount query to count all pending rides regardless of ride_timing
  - Update pendingCount query to count all pending offers regardless of ride_timing

  - Update activeCount query to count all active rides regardless of ride_timing
  - Update completedCount query to count all completed rides regardless of ride_timing
  - Ensure recurring rides are counted once per series, not per trip
  - Update real-time subscription handlers to refresh counts correctly
  - _Requirements: 1.5, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4_

- [ ] 10. Integrate FilterBar into all tab views
  - Add FilterBar component to AvailableRidesView
  - Add FilterBar component to PendingBidsView

  - Add FilterBar component to ActiveRidesView
  - Add FilterBar component to CompletedRidesView
  - Position FilterBar consistently at top of each tab content
  - Calculate and pass filter counts to FilterBar
  - Wire up filter change handlers
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 11. Implement recurring series handling logic

  - Create utility function to group rides by series_id
  - Implement logic to show one entry per series in Available tab
  - Implement logic to show one entry per series in My Bids tab
  - Implement logic to show one entry per series in In Progress tab
  - Implement logic to show one entry per series in Completed tab
  - Handle series without series_id gracefully (show as individual rides)
  - Add series detail modal or expandable section
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_


- [ ] 12. Add timing badges and visual indicators
  - Create TimingBadge component with icon and label
  - Add instant badge (⚡ blue) to instant rides
  - Add scheduled badge (📅 purple) to scheduled rides
  - Add recurring badge (🔄 green) to recurring rides
  - Display scheduled date/time prominently on scheduled rides
  - Display frequency and progress on recurring rides
  - Ensure consistent styling across all tabs
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_



- [ ] 13. Handle recurring ride state transitions
  - Update bid acceptance logic to move recurring series to In Progress
  - Ensure recurring series stays in In Progress while trips remain
  - Update series progress when individual trips complete
  - Move series to Completed when all trips are done
  - Handle series cancellation and move to Completed with status
  - Update next trip date calculation after each trip
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 14. Implement empty states for filtered views
  - Create EmptyFilterState component
  - Add empty state for Available tab with no rides matching filter
  - Add empty state for My Bids tab with no bids matching filter
  - Add empty state for In Progress tab with no rides matching filter
  - Add empty state for Completed tab with no rides matching filter
  - Include "View All" button to reset filter
  - Show appropriate messaging based on active filter
  - _Requirements: 1.3, 2.5_

- [ ] 15. Add loading states and optimizations
  - Add skeleton loaders for ride cards while loading
  - Implement shimmer effect on loading cards
  - Preserve filter selection during data refresh
  - Add "Refreshing..." indicator for real-time updates
  - Implement React.memo for FilterBar component
  - Implement React.memo for ride card components
  - Use useMemo for filtered ride lists
  - Debounce count updates to 500ms
  - _Requirements: 9.5_

- [ ] 16. Update real-time subscriptions for filtered views
  - Modify ride_offers subscription to handle filter state
  - Modify rides subscription to handle filter state
  - Filter real-time events client-side by ride_timing
  - Update counts only when events match current filter or filter is 'all'
  - Ensure recurring series updates trigger proper re-renders
  - Test real-time updates with different filters active
  - _Requirements: 1.3, 2.5, 9.5_

- [ ] 17. Implement responsive design for filters and tabs
  - Make tab navigation horizontally scrollable on mobile
  - Make FilterBar horizontally scrollable on mobile
  - Adjust ride card layout for mobile (single column)
  - Adjust ride card layout for tablet (two columns)
  - Adjust ride card layout for desktop (three columns)
  - Ensure timing badges are readable on all screen sizes
  - Test touch interactions on mobile devices
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 18. Add session storage for filter persistence
  - Save selected filter to session storage on change
  - Restore filter from session storage on component mount
  - Clear filter from session storage on logout
  - Handle missing or invalid filter values gracefully
  - Ensure filter persists when navigating away and back
  - _Requirements: 2.6_

- [ ] 19. Update route handling and redirects
  - Add URL parameter support for filter (?filter=instant)
  - Redirect old scheduled tab route to active tab with scheduled filter
  - Handle deep links with tab and filter parameters
  - Update browser history when filter changes
  - Ensure back button works correctly with filters
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 20. Test complete driver flow with new tab structure
  - Test driver viewing available rides with all filters
  - Test driver placing bids on instant, scheduled, and recurring rides
  - Test bids appearing in My Bids tab with correct filter
  - Test accepted bids moving to In Progress tab
  - Test recurring series staying in In Progress until complete
  - Test completed rides appearing in Completed tab
  - Test tab counts updating correctly throughout flow
  - Test real-time updates with different filters active
  - Verify no duplicate entries for recurring series
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 5.6, 5.7, 6.1, 10.1, 10.2, 10.3, 10.4_
