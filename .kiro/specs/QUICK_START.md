# Quick Start Guide - TaxiCab Ride Management

## 🎯 What's Been Completed

### Ride Management Enhancements (100% Complete)
All 18 tasks completed for driver availability management, active ride notifications, and trip activation.

**Key Features:**
- ✅ Atomic bid acceptance (prevents race conditions)
- ✅ Active ride toast notifications (driver & passenger)
- ✅ Scheduled ride activation (30-minute window)
- ✅ Active trip indicator for drivers
- ✅ Real-time status updates
- ✅ Session persistence

**Location:** `.kiro/specs/ride-management-enhancements/`

### Recurring Trip Monitoring (Spec Ready)
Complete specification ready for implementation.

**Features to Build:**
- Track trips remaining in series
- Display next trip dates
- Send automated reminders
- Series management (pause/resume/cancel)
- Analytics and calendar view

**Location:** `.kiro/specs/recurring-trip-monitoring/`

## 🚀 Getting Started

### 1. Review Completed Work

```bash
# Read the implementation summary
cat .kiro/specs/ride-management-enhancements/IMPLEMENTATION_SUMMARY.md

# Check the requirements
cat .kiro/specs/ride-management-enhancements/requirements.md

# Review the design
cat .kiro/specs/ride-management-enhancements/design.md
```

### 2. Test Current Features

**Test Accounts:**
- Driver: `driver.test@bmtoa.co.zw` / `Drivere@123`
- Passenger: `user.test@taxicab.co.zw` / `User@123`

**Test Scenarios:**
1. **Driver Availability Check**
   - Driver accepts instant ride
   - Passenger tries to accept same driver's bid on another ride
   - Should see "Driver unavailable" error

2. **Active Ride Toast**
   - Login with active ride
   - Should see blue toast notification
   - Click toast → navigates to active rides

3. **Scheduled Ride Activation**
   - Driver views scheduled rides tab
   - Rides within 30 min have yellow background
   - Click "Activate Trip" button
   - Status changes to "driver_on_way"

4. **Active Trip Indicator**
   - Driver with active instant ride
   - Green indicator appears at top
   - Shows pickup/dropoff and fare
   - Click "View Details" opens modal

### 3. Start Recurring Trip Monitoring

**Step 1: Review Spec**
```bash
# Read requirements
cat .kiro/specs/recurring-trip-monitoring/requirements.md

# Read design
cat .kiro/specs/recurring-trip-monitoring/design.md

# Read tasks
cat .kiro/specs/recurring-trip-monitoring/tasks.md
```

**Step 2: Start with Database**
Begin with Phase 1 tasks:
- Task 1: Create `recurring_trip_series` table
- Task 2: Create `trip_reminders` table
- Task 3: Update `rides` table

**Step 3: Build Backend**
- Task 4-6: Create SQL functions
- Task 7-8: Create services

**Step 4: Build UI**
- Task 9-13: Create components
- Task 14-16: Integrate into dashboards

## 📁 Project Structure

```
src/
├── components/
│   ├── modals/
│   │   ├── RideDetailsModal.jsx (used for active rides)
│   │   └── ConfirmationModal.jsx
│   └── ui/
│       ├── ToastProvider.jsx
│       └── Modal.jsx
├── dashboards/
│   ├── client/
│   │   ├── components/
│   │   │   ├── ActiveRidesView.jsx ✅ (enhanced)
│   │   │   └── PassengerOffersPanel.jsx ✅ (enhanced)
│   │   ├── IndividualDashboard.jsx ✅ (enhanced)
│   │   └── CorporateDashboard.jsx ✅ (enhanced)
│   └── driver/
│       ├── components/
│       │   ├── DriverRidesHub.jsx ✅ (enhanced)
│       │   ├── ScheduledRidesView.jsx ✅ (new)
│       │   ├── ActiveTripIndicator.jsx ✅ (new)
│       │   └── ActiveTripsView.jsx ✅ (fixed)
│       └── pages/
│           └── RideRequestsPage.jsx
├── hooks/
│   ├── useActiveRideCheck.js ✅ (enhanced)
│   └── useRideRealtime.js ✅ (new)
├── services/
│   └── bidAcceptanceService.js ✅ (new)
└── lib/
    └── supabase.js

supabase/
└── migrations/
    ├── 20240116_accept_driver_bid_rpc.sql ✅ (new)
    └── 20240116_add_ride_management_indexes.sql ✅ (new)

.kiro/specs/
├── ride-management-enhancements/ ✅ (complete)
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   └── IMPLEMENTATION_SUMMARY.md
└── recurring-trip-monitoring/ 📋 (ready to implement)
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

## 🔧 Key Components

### useActiveRideCheck Hook
```javascript
import { useActiveRideCheck } from '../hooks/useActiveRideCheck';

// For passengers
const { activeRide } = useActiveRideCheck(user?.id, 'passenger');

// For drivers
const { activeRide } = useActiveRideCheck(user?.id, 'driver');
```

### Bid Acceptance Service
```javascript
import { acceptDriverBid } from '../services/bidAcceptanceService';

const result = await acceptDriverBid(rideId, offerId, driverId, passengerId);

if (result.success) {
  // Bid accepted
} else {
  // Handle error: result.error, result.message
}
```

### Scheduled Rides View
```javascript
import ScheduledRidesView from './components/ScheduledRidesView';

<ScheduledRidesView onRideUpdate={loadCounts} />
```

### Active Trip Indicator
```javascript
import ActiveTripIndicator from './components/ActiveTripIndicator';

<ActiveTripIndicator
  activeTrip={activeInstantRide}
  onViewDetails={handleViewDetails}
/>
```

## 🗄️ Database

### Key Tables
- `rides` - Main rides table (enhanced with indexes)
- `ride_offers` - Driver bids (enhanced with indexes)
- `notifications` - User notifications
- `driver_locations` - Driver GPS tracking

### Key Functions
- `accept_driver_bid()` - Atomic bid acceptance with availability check

### Key Indexes
- `idx_rides_active_instant` - Fast driver availability checks
- `idx_rides_active_passenger` - Fast passenger active rides
- `idx_rides_scheduled_activation` - Scheduled ride queries

## 🐛 Troubleshooting

### Issue: Toast not showing
**Check:**
1. User ID is valid
2. Active ride exists in database
3. Session storage not blocking (`active-ride-toast-shown-{userType}`)

**Fix:**
```javascript
// Clear session storage
sessionStorage.removeItem('active-ride-toast-shown-passenger');
sessionStorage.removeItem('active-ride-toast-shown-driver');
```

### Issue: Activate button disabled
**Check:**
1. Scheduled time is within 30 minutes
2. Ride status is 'accepted'
3. Ride timing is 'scheduled_single' or 'scheduled_recurring'

**Debug:**
```javascript
const scheduledTime = new Date(ride.scheduled_datetime);
const now = new Date();
const diffMinutes = (scheduledTime - now) / (1000 * 60);
console.log('Minutes until scheduled:', diffMinutes);
// Should be <= 30 and >= -5
```

### Issue: Driver can accept multiple rides
**Check:**
1. RPC function `accept_driver_bid` exists
2. Migration applied successfully
3. Using `acceptDriverBid` service (not direct database update)

**Verify:**
```sql
-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'accept_driver_bid';
```

## 📊 Monitoring

### Check Active Rides
```sql
SELECT 
  id,
  user_id,
  driver_id,
  ride_status,
  ride_timing,
  created_at
FROM rides
WHERE ride_status IN ('accepted', 'driver_on_way', 'driver_arrived', 'trip_started')
ORDER BY created_at DESC;
```

### Check Scheduled Rides
```sql
SELECT 
  id,
  driver_id,
  ride_status,
  ride_timing,
  scheduled_datetime,
  pickup_address
FROM rides
WHERE ride_timing IN ('scheduled_single', 'scheduled_recurring')
  AND ride_status = 'accepted'
ORDER BY scheduled_datetime ASC;
```

### Check Pending Offers
```sql
SELECT 
  ro.id,
  ro.ride_id,
  ro.driver_id,
  ro.quoted_price,
  ro.offer_status,
  r.ride_status
FROM ride_offers ro
JOIN rides r ON r.id = ro.ride_id
WHERE ro.offer_status = 'pending'
ORDER BY ro.offered_at DESC;
```

## 🎓 Learning Resources

### Supabase Realtime
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- Pattern: Subscribe → Handle updates → Cleanup

### React Hooks
- `useEffect` for subscriptions
- `useState` for local state
- `useCallback` for memoized functions

### Database Transactions
- RPC functions for atomic operations
- Triggers for automatic updates
- Indexes for performance

## 📞 Support

### Documentation
- Implementation Summary: `.kiro/specs/ride-management-enhancements/IMPLEMENTATION_SUMMARY.md`
- Requirements: `.kiro/specs/ride-management-enhancements/requirements.md`
- Design: `.kiro/specs/ride-management-enhancements/design.md`

### Next Steps
1. Test all completed features
2. Review recurring trip monitoring spec
3. Start Phase 1 of recurring trips (database)
4. Build incrementally following tasks.md

---

**Last Updated:** January 17, 2025
**Status:** Ride Management Complete ✅ | Recurring Trips Ready 📋
