# Booking Information Analysis Summary

## Overview
Analysis of how booking information is handled in the database and UI, based on Supabase MCP queries and codebase review.

---

## ✅ 1. Round Trip - PROPERLY HANDLED

**Database Fields:**
- `is_round_trip` (BOOLEAN)
- `trip_leg_type` ('outbound', 'return', 'single')
- `round_trip_leg_number` (1 or 2)
- `outbound_cost`, `return_cost`
- `active_leg` ('outbound', 'return', 'completed')

**Status:** ✅ Fully implemented in database and UI
- Round trip creates two separate ride records
- Driver feed displays round trip leg information
- Both driver and passenger feeds show round trip status

---

## ❌ 2. Vehicle Type → Passenger Count - NEEDS FIX

**Current State:**
- Vehicle type and passenger count are **independent fields**
- No automatic relationship between them
- UI allows manual passenger entry regardless of vehicle type

**Required Changes:**
1. **Remove "combi/hiace" option** from vehicle type selection
2. **Implement automatic passenger limits:**
   - Sedan/Hatchback: **<3 passengers** (max 2)
   - MPV: **4-5 passengers**
   - Large MPV: **5-7 passengers**
3. **Auto-populate passenger field** when vehicle type is selected
4. **Add validation** to prevent exceeding capacity

**Database Fields:**
- `vehicle_type` (TEXT) - Current values: 'sedan', 'mpv', 'large-mpv', 'combi'
- `number_of_passengers` (INTEGER, default: 1)

**Files to Update:**
- `src/components/booking/forms/TaxiBookingForm.jsx` (lines 59-82)
- `src/dashboards/client/components/UnifiedBookingModal.jsx`
- Add validation logic in booking submission

---

## ⚠️ 3. Special Instructions - SCHEMA MISMATCH

**Issue:**
- **Migration schema** defines `special_instructions` field
- **Database** only has `special_requests` field
- **Code** uses `special_instructions` throughout

**Current Database:**
- `special_requests` (TEXT) ✅ Exists
- `special_instructions` (TEXT) ❌ Does NOT exist (but defined in migration)

**Code References:**
- `UnifiedBookingModal.jsx` uses `formData.specialInstructions`
- `useBookingSubmission.js` maps to `special_instructions`
- `DriverRideDetailsModal.jsx` displays `ride.special_instructions`

**Action Required:**
1. Apply migration to add `special_instructions` column, OR
2. Update all code to use `special_requests` consistently

**Visibility:**
- ✅ Shown in driver details modal
- ✅ Shown in passenger feed
- ❌ **MISSING**: Should be shown in driver feed card (not just details modal)

---

## ⚠️ 4. Courier Information - PARTIALLY CORRECT

### Recipient Name & Phone
**Current Implementation:**
- ✅ **NOT shown in driver feed** (`DriverRideCard.jsx`) - Correct behavior
- ✅ **Only shown after acceptance** in details modal when `isActive = true`
- ✅ **Visible to passenger** (booker) in their feed

**Status:** ✅ **CORRECT** - Recipient info only visible to accepted drivers

### Package Details, Vehicle, Size, Special Instructions
**Current Implementation:**
- ✅ Package size shown in driver feed (`DriverRideCard.jsx` line 158)
- ✅ Package details shown in driver feed (line 156)
- ❌ **MISSING**: Special instructions not shown in driver feed
- ❌ **MISSING**: Preferred vehicle (`vehicle_type`) not shown in courier feed

**Database Fields:**
- `recipient_name` (TEXT) ✅
- `recipient_phone` (TEXT) ✅
- `package_size` (TEXT) ✅
- `courier_package_details` (TEXT) ✅
- `vehicle_type` (TEXT) ✅ (exists but not displayed for courier)

**Action Required:**
1. Add special instructions display to `DriverRideCard.jsx` for courier bookings
2. Add vehicle type/preferred vehicle display to courier feed
3. Ensure all courier info (except recipient name/phone) is visible in feed

---

## ⚠️ 5. Errand Feed Display - PARTIALLY IMPLEMENTED

**Current Display:**
- ✅ Total tasks (shown)
- ✅ Total cost (shown)
- ✅ Average cost per errand (shown as "avg per task")
- ❌ **MISSING**: Total distance
- ❌ **MISSING**: Average distance per errand
- ✅ Does NOT show pickup/dropoff (correct - uses task list instead)

**Current Implementation:**
- `ErrandTaskList.jsx` shows:
  - Total tasks count
  - Completed/remaining counts
  - Total cost
  - Average cost per task (line 174)
- `DriverRideCard.jsx` uses `ErrandTaskList` for errand rides

**Database Fields:**
- `errand_tasks` (JSONB) - Contains task array with pickup/dropoff per task
- `number_of_tasks` (INTEGER)
- `estimated_cost` (NUMERIC)
- `distance_km` (NUMERIC) - NULL for errands (no single route)

**Action Required:**
1. Calculate total distance from all errand tasks
2. Calculate average distance per errand (total distance / number of tasks)
3. Display both metrics in `ErrandTaskList.jsx` component
4. Update `DriverRideCard.jsx` to show distance metrics

**Files to Update:**
- `src/components/cards/ErrandTaskList.jsx`
- `src/utils/errandCostHelpers.js` (add distance calculation)
- `src/dashboards/driver/components/DriverRideCard.jsx`

---

## Summary of Required Actions

### High Priority
1. **Vehicle Type → Passenger Count**
   - Remove "combi/hiace" option
   - Auto-set passenger limits: Sedan<3, MPV 4-5, Large MPV 5-7
   - Add validation

2. **Special Instructions**
   - Fix schema mismatch (add column or update code)
   - Display in driver feed (not just details modal)

3. **Courier Feed Display**
   - Add special instructions to feed
   - Add preferred vehicle type to feed
   - Keep recipient name/phone hidden until acceptance ✅

4. **Errand Feed Display**
   - Calculate and display total distance
   - Calculate and display average distance per errand

### Medium Priority
- Ensure special instructions visible in both driver and passenger feeds
- Add vehicle capacity validation
- Update booking forms to auto-populate passenger count

---

## Database Query Results

**Sample Data Found:**
- Round trips: ✅ Properly stored with leg information
- Vehicle types: 'sedan' (most common), 'mpv', 'large-mpv', 'combi'
- Passenger counts: Mostly 1, independent of vehicle type
- Special instructions: Field name mismatch issue
- Courier: Fields exist but visibility rules partially implemented
- Errands: Tasks stored in JSONB, distance calculations missing

---

## Files Requiring Updates

1. `src/components/booking/forms/TaxiBookingForm.jsx` - Vehicle type options
2. `src/dashboards/driver/components/DriverRideCard.jsx` - Courier info display
3. `src/components/cards/ErrandTaskList.jsx` - Distance calculations
4. `src/utils/errandCostHelpers.js` - Distance calculation helpers
5. `src/hooks/useBookingSubmission.js` - Special instructions field mapping
6. Database migration - Add `special_instructions` or standardize on `special_requests`

---

## Next Steps

1. Review and approve this analysis
2. Prioritize required changes
3. Create implementation tickets for each item
4. Test changes in development environment
5. Update database schema if needed


