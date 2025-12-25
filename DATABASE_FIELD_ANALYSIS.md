# Database Field Analysis - Booking Information Handling

## Analysis Date: 2025-01-27

This document analyzes how booking information is currently handled in the database and UI for:
1. Round trip bookings
2. Vehicle type and passenger count relationship
3. Special instructions
4. Courier recipient information visibility
5. Errand feed display

---

## 1. Round Trip Handling

### Database Schema
- **Field**: `is_round_trip` (BOOLEAN, default: false)
- **Field**: `trip_leg_type` (TEXT, values: 'outbound', 'return', 'single')
- **Field**: `round_trip_leg_number` (INTEGER, values: 1, 2)
- **Field**: `round_trip_occurrence_number` (INTEGER)
- **Field**: `outbound_cost` (NUMERIC)
- **Field**: `return_cost` (NUMERIC)
- **Field**: `active_leg` (TEXT, values: 'outbound', 'return', 'completed')
- **Field**: `outbound_completed_at` (TIMESTAMPTZ)
- **Field**: `return_completed_at` (TIMESTAMPTZ)

### Current Implementation
✅ **Database**: Round trip fields are properly defined
✅ **UI**: Round trip option exists in booking forms (`TaxiBookingForm.jsx`)
✅ **UI**: Round trip display exists in driver feed (`DriverRideCard.jsx` shows round trip leg info)
✅ **Backend**: Round trip creates two separate ride records (outbound and return legs)

### Sample Data from Database
```json
{
  "is_round_trip": true,
  "trip_leg_type": "outbound",
  "round_trip_leg_number": 1,
  "estimated_cost": "7.75",
  "distance_km": "14.31"
}
```

### Status
**✅ PROPERLY HANDLED** - Round trip functionality is implemented in both database and UI.

---

## 2. Vehicle Type and Passenger Count Relationship

### Database Schema
- **Field**: `vehicle_type` (TEXT) - Currently stores: 'sedan', 'mpv', 'large-mpv', 'combi'
- **Field**: `number_of_passengers` (INTEGER, default: 1, CHECK > 0)

### Current Implementation
❌ **ISSUE**: Vehicle type does NOT automatically determine passenger count
- Vehicle type and passenger count are separate fields
- No database constraint linking vehicle type to passenger capacity
- UI allows manual entry of passenger count independent of vehicle type

### Current UI Options (TaxiBookingForm.jsx)
```javascript
options={[
  { value: 'sedan', label: 'Sedan (1-3 passengers)' },
  { value: 'mpv', label: 'MPV/SUV (1-5 passengers)' },
  { value: 'large-mpv', label: 'Large MPV (1-7 passengers)' },
  { value: 'combi', label: 'Combi/Hiace (1-14 passengers)' }
]}
```

### Required Changes
1. **Remove "combi/hiace" option** as requested
2. **Implement automatic passenger count** based on vehicle type:
   - Sedan/Hatchback: <3 passengers (max 2)
   - MPV: 4-5 passengers
   - Large MPV: 5-7 passengers
3. **Add validation** to prevent passenger count exceeding vehicle capacity
4. **Update UI** to auto-populate passenger field when vehicle type is selected

### Sample Data from Database
```json
{
  "vehicle_type": "sedan",
  "number_of_passengers": 1
}
```

### Status
**❌ NEEDS IMPROVEMENT** - Vehicle type should automatically determine passenger count limits.

---

## 3. Special Instructions

### Database Schema
- **Field**: `special_requests` (TEXT, nullable)
- **Field**: `notes` (TEXT, nullable)
- **Field**: `special_instructions` (TEXT) - **DOES NOT EXIST IN DATABASE**

### Current Implementation
⚠️ **INCONSISTENCY**: Code uses `special_instructions` but database has `special_requests`
- Frontend code references `special_instructions` in multiple places
- Database stores in `special_requests` field
- Migration schema shows `special_instructions` field exists in newer schema

### Code References
- `UnifiedBookingModal.jsx`: Uses `formData.specialInstructions`
- `useBookingSubmission.js`: Maps to `special_instructions` field
- `PlaceBidModal.jsx`: Displays `ride.special_instructions`
- `RideDetailsModal.jsx`: Shows `ride.specialInstructions`

### Database Query Result
- All sample rides have `special_requests: null`
- No `special_instructions` column found in current database

### Status
**⚠️ SCHEMA MISMATCH** - Migration schema defines `special_instructions` (line 161), but database query shows it doesn't exist.
- **Migration file** (`20251211000001_consolidated_ride_system_schema.sql`) defines both:
  - `special_requests TEXT` (line 160)
  - `special_instructions TEXT` (line 161)
- **Database** only has `special_requests` column
- **Code** uses `special_instructions` throughout

**Action Required**: Apply migration or verify schema sync between migration file and actual database.

---

## 4. Courier Recipient Information

### Database Schema
- **Field**: `recipient_name` (TEXT, nullable)
- **Field**: `recipient_phone` (TEXT, nullable)
- **Field**: `recipient_email` (TEXT, nullable)
- **Field**: `package_size` (TEXT, CHECK: 'small', 'medium', 'large', 'extra_large')
- **Field**: `courier_package_details` (TEXT, nullable)
- **Field**: `package_details` (TEXT, nullable) - Legacy compatibility

### Current Implementation

#### Driver Feed Display
**Location**: `DriverRideCard.jsx` (lines 150-164)
- ✅ Shows package details and size
- ❌ **MISSING**: Recipient name and phone are NOT displayed in driver feed
- ❌ **MISSING**: Only shown in details modal after acceptance

#### Passenger Feed Display
**Location**: `ActiveRideCard.jsx` (lines 278-301)
- ✅ Shows package details, size, recipient name and phone
- ✅ Visible to passenger (booker)

#### Driver Details Modal
**Location**: `DriverRideDetailsModal.jsx` (lines 174-179)
- ✅ Shows package details and size
- ⚠️ Recipient info only visible after acceptance (when `isActive` is true)

### Required Changes
1. **Recipient name and phone** should ONLY be visible to **accepted drivers**
2. **Package details, preferred vehicle, package size, special instructions** should be visible in driver feed
3. Update `DriverRideCard.jsx` to show courier package information in feed

### Sample Data from Database
```json
{
  "service_type": "courier",
  "recipient_name": null,
  "recipient_phone": null,
  "package_size": null,
  "courier_package_details": null
}
```

### Status
**✅ PARTIALLY CORRECT** - Current implementation:
- ✅ Recipient info NOT shown in driver feed card (`DriverRideCard.jsx`)
- ✅ Recipient info only shown in details modal when `isActive` is true (after acceptance)
- ❌ **MISSING**: Package details, size, and special instructions should be visible in driver feed (currently only shown in details modal)
- ❌ **MISSING**: Preferred vehicle field not found in database schema

**Action Required**: 
1. Add package details display to `DriverRideCard.jsx` feed view (already shows package size)
2. Add special instructions display to driver feed
3. Verify preferred vehicle field exists or needs to be added

---

## 5. Errand Feed Display

### Database Schema
- **Field**: `errand_tasks` (JSONB) - Stores array of task objects
- **Field**: `number_of_tasks` (INTEGER, default: 0)
- **Field**: `completed_tasks_count` (INTEGER, default: 0)
- **Field**: `remaining_tasks_count` (INTEGER, default: 0)
- **Field**: `estimated_cost` (NUMERIC)
- **Field**: `distance_km` (NUMERIC) - **NULL for errands** (no single pickup/dropoff)

### Current Implementation

#### Driver Feed Display
**Location**: `DriverRideCard.jsx` (lines 135-141)
- ✅ Uses `ErrandTaskList` component instead of `RouteDisplay`
- ✅ Shows task summary (total, completed, remaining)
- ✅ Shows total cost
- ✅ Does NOT show pickup/dropoff (correct behavior)
- ❌ **MISSING**: Average cost per errand
- ❌ **MISSING**: Average distance per errand
- ❌ **MISSING**: Total distance (sum of all task distances)

#### ErrandTaskList Component
**Location**: `ErrandTaskList.jsx`
- ✅ Shows total tasks
- ✅ Shows total cost
- ✅ Shows average cost per task (line 174)
- ❌ **MISSING**: Total distance calculation
- ❌ **MISSING**: Average distance per task

### Required Changes
1. **Calculate total distance** from all errand tasks
2. **Calculate average distance per errand** (total distance / number of tasks)
3. **Display in feed**:
   - Total tasks ✅ (already shown)
   - Total cost ✅ (already shown)
   - Total distance ❌ (needs to be added)
   - Average cost per errand ✅ (already shown as "avg per task")
   - Average distance per errand ❌ (needs to be added)

### Sample Data from Database
```json
{
  "service_type": "errands",
  "errand_tasks": "[{\"pickup\":\"...\",\"dropoff\":\"...\",\"distance\":null}]",
  "number_of_tasks": 2,
  "estimated_cost": "32.00",
  "distance_km": null
}
```

### Status
**⚠️ PARTIALLY IMPLEMENTED** - Missing distance calculations and display.

---

## Summary of Required Changes

### High Priority
1. **Vehicle Type → Passenger Count**: Implement automatic passenger count based on vehicle type
   - Remove "combi/hiace" option
   - Sedan/Hatchback: <3 (max 2)
   - MPV: 4-5 passengers
   - Large MPV: 5-7 passengers

2. **Special Instructions**: Fix field name inconsistency
   - Either add `special_instructions` column or update code to use `special_requests`

3. **Courier Recipient Info**: Implement visibility rules
   - Recipient name/phone only visible to accepted drivers
   - Package details, size, special instructions visible in feed

4. **Errand Feed Display**: Add missing metrics
   - Total distance (sum of all task distances)
   - Average distance per errand

### Medium Priority
1. Ensure special instructions are displayed in both driver and passenger feeds
2. Add validation to prevent passenger count exceeding vehicle capacity
3. Update UI to auto-populate passenger count when vehicle type is selected

---

## Database Query Results

### Sample Rides Data
- **Round Trip**: ✅ Properly stored with `is_round_trip`, `trip_leg_type`, `round_trip_leg_number`
- **Vehicle Type**: ✅ Stored in `vehicle_type` field (values: 'sedan', 'mpv', etc.)
- **Passenger Count**: ✅ Stored in `number_of_passengers` (but not linked to vehicle type)
- **Special Instructions**: ⚠️ Field name mismatch (`special_requests` in DB, `special_instructions` in code)
- **Courier Info**: ✅ Fields exist but visibility rules not implemented
- **Errand Tasks**: ✅ Stored in JSONB format with task details

---

## Recommendations

1. **Create migration** to add `special_instructions` column (or standardize on `special_requests`)
2. **Add database constraint** or application-level validation for vehicle type → passenger count
3. **Update DriverRideCard** to show courier package info in feed
4. **Add distance calculation** for errand tasks
5. **Implement RLS policies** or application logic to hide recipient info from non-accepted drivers
6. **Update booking forms** to auto-populate passenger count based on vehicle type selection




