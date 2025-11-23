# Implementation Plan

## Overview
This implementation plan addresses ride management enhancements in the TaxiCab e-hailing PWA, focusing on driver availability management, active ride notifications, trip activation controls, and real-time synchronization. The tasks are organized to build incrementally without breaking existing functionality.

## Task List

- [x] 1. Create database RPC function for atomic bid acceptance


  - Create `accept_driver_bid` RPC function in Supabase
  - Implement driver availability check logic
  - Add transaction handling for atomic operations
  - Include notification creation for both driver and passenger
  - Add error handling and rollback logic
  - Test function with various scenarios (available driver, engaged driver, invalid data)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_





- [ ] 2. Add database indexes for performance
  - Create index for active instant rides query (`idx_rides_active_instant`)

  - Create index for passenger active rides query (`idx_rides_active_passenger`)
  - Create index for scheduled rides activation (`idx_rides_scheduled_activation`)
  - Verify index usage with EXPLAIN ANALYZE



  - _Requirements: Performance optimization_

- [ ] 3. Create bid acceptance service
  - Create `src/services/bidAcceptanceService.js`
  - Implement `acceptDriverBid` function that calls RPC



  - Add error handling for different error types
  - Add logging for debugging

  - Return structured response with success/error details
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 4. Update PassengerOffersPanel to use new bid acceptance


  - Update `src/dashboards/client/components/PassengerOffersPanel.jsx`
  - Replace direct database update with `acceptDriverBid` service call
  - Add error handling for driver unavailability
  - Show appropriate toast notifications for success/error
  - Remove unavailable offers from display on error
  - Add loading state during bid acceptance
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_







- [ ] 5. Create active ride check hook for passengers
  - Create `src/hooks/useActiveRideCheck.js`
  - Implement login-time active ride detection





  - Add toast notification with click handler
  - Ensure toast only shows once per session
  - Add navigation to active rides on toast click
  - Style toast with blue background and white text
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_




- [x] 6. Integrate active ride check in passenger dashboard

  - Update `src/dashboards/client/ClientDashboard.jsx`
  - Add `useActiveRideCheck` hook


  - Ensure check runs on component mount
  - Test with active and inactive ride scenarios
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 7. Implement active ride modal management in ActiveRidesView
  - Update `src/dashboards/client/components/ActiveRidesView.jsx`



  - Add automatic modal display for primary active ride
  - Implement session-based dismissal tracking
  - Add realtime subscription for ride status updates
  - Auto-close modal when ride completes or is cancelled
  - Update modal content in real-time
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_






- [ ] 8. Create ActiveRideModal component
  - Create `src/components/modals/ActiveRideModal.jsx`
  - Display ride details (pickup, dropoff, driver info, status)
  - Show interactive map with driver location
  - Display status timeline


  - Add close/dismiss button
  - Make modal responsive
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 9. Implement real-time status toast notifications
  - Update `src/dashboards/client/components/ActiveRidesView.jsx`


  - Add toast notifications for status changes (accepted, driver_on_way, driver_arrived, trip_started)
  - Make toasts clickable to navigate to active ride modal
  - Position toasts at top of screen
  - Use Supabase Realtime for instant updates
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 10. Create scheduled rides view for drivers


  - Create `src/dashboards/driver/components/ScheduledRidesView.jsx`
  - Load accepted scheduled rides from database
  - Display rides ordered by scheduled time
  - Show scheduled datetime for each ride
  - Highlight rides within 30 minutes of scheduled time
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [ ] 11. Implement trip activation button logic
  - Update `src/dashboards/driver/components/ScheduledRidesView.jsx`


  - Add `canActivateRide` function (checks if within 30 minutes)
  - Implement `handleActivateTrip` function
  - Update ride status to 'driver_on_way' on activation
  - Change button text to "Trip Active" after activation
  - Disable button after activation


  - Add "View Details" button when trip is active
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [ ] 12. Create driver active trip indicator component
  - Create `src/dashboards/driver/components/ActiveTripIndicator.jsx`
  - Display prominent indicator at top of driver dashboard


  - Show pickup and dropoff locations
  - Display current status and fare
  - Add "View Details" button
  - Only show for active instant rides
  - Style with green gradient background
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [ ] 13. Integrate active trip indicator in DriverRidesHub
  - Update `src/dashboards/driver/components/DriverRidesHub.jsx`
  - Add check for active instant trip
  - Display ActiveTripIndicator component
  - Update indicator in real-time when trip status changes
  - Remove indicator when trip completes
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [ ] 14. Create centralized realtime hook
  - Create `src/hooks/useRideRealtime.js`
  - Implement subscriptions for rides, offers, and notifications
  - Support both passenger and driver modes
  - Add proper cleanup on unmount
  - Add error handling and reconnection logic
  - Log all realtime events for debugging
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [ ] 15. Update existing components to use centralized realtime hook
  - Update ActiveRidesView to use `useRideRealtime`
  - Update DriverRidesHub to use `useRideRealtime`
  - Remove duplicate subscription code
  - Verify all realtime functionality still works
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 16. Implement active ride persistence across sessions
  - Ensure active ride state is queried from database on load
  - Remove any localStorage/sessionStorage for active ride state
  - Verify active ride persists after browser close/reopen
  - Test with page refresh scenarios
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 17. Add comprehensive error handling
  - Implement error handlers for bid acceptance failures
  - Add error handlers for realtime connection issues
  - Implement error handlers for trip activation failures
  - Add user-friendly error messages
  - Log all errors for debugging
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [ ] 18. Implement real-time offer availability updates
  - Subscribe to driver availability changes
  - Remove offers when driver becomes unavailable
  - Show brief message when offers are removed
  - Prevent clicks on offers being removed
  - Handle removal gracefully without UI flicker
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [ ] 19. End-to-end testing and validation
  - [ ] 19.1 Test driver availability check
    - Driver A accepts instant ride
    - Passenger tries to accept Driver A's bid on another ride
    - Verify bid rejection with error message
    - Verify Driver A receives notification
    - Verify unavailable offer is removed from passenger's view
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 19.2 Test active ride toast notification
    - Passenger logs in with active ride
    - Verify toast appears at top of screen
    - Verify toast has blue background and white text
    - Click toast and verify navigation to active rides
    - Log out and log back in
    - Verify toast only shows once per session
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ] 19.3 Test active ride modal
    - Passenger navigates to rides feed with active ride
    - Verify modal displays automatically
    - Verify modal shows correct ride details
    - Dismiss modal and verify it stays dismissed
    - Refresh page and verify modal doesn't reappear
    - Driver updates status and verify modal updates in real-time
    - Ride completes and verify modal closes automatically
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [ ] 19.4 Test trip activation
    - Driver has scheduled ride 25 minutes away
    - Verify ride is highlighted with yellow background
    - Verify "Activate Trip" button is enabled
    - Click button and verify status changes to "driver_on_way"
    - Verify button changes to "Trip Active" (disabled)
    - Verify "View Details" button appears
    - Click "View Details" and verify modal opens
    - Verify passenger receives real-time status update
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_
  
  - [ ] 19.5 Test driver active trip indicator
    - Driver accepts instant ride
    - Verify indicator appears at top of dashboard
    - Verify indicator shows pickup and dropoff locations
    - Verify indicator shows current status and fare
    - Click "View Details" and verify modal opens
    - Complete trip and verify indicator disappears
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  
  - [ ] 19.6 Test real-time synchronization
    - Open passenger and driver dashboards in separate browsers
    - Driver accepts bid
    - Verify passenger sees update within 2 seconds
    - Verify passenger receives toast notification
    - Driver updates trip status
    - Verify passenger sees status change in real-time
    - Verify passenger receives toast notification for each status change
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [ ] 19.7 Test concurrent bid acceptance
    - Two passengers try to accept same driver's bid simultaneously
    - Verify only one succeeds
    - Verify other receives "driver unavailable" error
    - Verify unavailable offer is removed from display
    - Verify driver receives only one acceptance notification
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  
  - [ ] 19.8 Test session persistence
    - Passenger has active ride
    - Close browser completely
    - Reopen browser and log in
    - Verify active ride toast appears
    - Navigate to rides feed
    - Verify active ride modal displays
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

## Testing Accounts
- Driver: driver.test@bmtoa.co.zw / Drivere@123
- Passenger: user.test@taxicab.co.zw / User@123
- Local server: http://localhost:4030

## Notes
- All database changes should be tested in development before production
- Use Supabase MCP to verify RPC function creation and execution
- Use Chrome DevTools MCP to inspect realtime subscriptions and network traffic
- All realtime subscriptions must be properly cleaned up on component unmount
- Error handling should be user-friendly with clear messages
- Loading states should be shown during async operations
- Toast notifications should not overlap or stack excessively
- Modal dismissal state should be stored in sessionStorage, not localStorage
- Active ride state should always be queried from database, never cached locally
