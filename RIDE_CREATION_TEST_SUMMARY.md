# Ride Creation Testing Summary

## Overview
This document summarizes the ride creation process, what data is submitted to the database for each ride type, and testing observations.

## Database Schema (Rides Table)

### Key Fields for All Ride Types
- `user_id` (uuid) - User creating the ride
- `service_type` (text) - 'taxi', 'courier', 'school_run', 'errands'
- `ride_type` (text) - Same as service_type typically
- `ride_timing` (text) - 'instant', 'scheduled_single', 'scheduled_recurring'
- `booking_source` (text) - 'individual' or 'corporate'
- `pickup_location` (text) - Address string
- `pickup_coordinates` (jsonb) - GeoJSON Point
- `dropoff_location` (text) - Address string
- `dropoff_coordinates` (jsonb) - GeoJSON Point
- `pickup_address` (text) - Duplicate of pickup_location
- `dropoff_address` (text) - Duplicate of dropoff_location
- `distance_km` (numeric) - Calculated distance
- `estimated_duration_minutes` (integer) - Estimated trip duration
- `estimated_cost` (numeric) - Calculated fare
- `vehicle_type` (text) - 'sedan', 'mpv', 'suv', 'van', etc.
- `payment_method` (text) - 'cash', 'card', 'ecocash', etc.
- `special_requests` (text) - Optional instructions
- `ride_status` (text) - 'pending', 'accepted', 'driver_on_way', etc.
- `state` (ride_state enum) - 'PENDING', 'ACTIVE_PRE_TRIP', etc.
- `execution_sub_state` (execution_sub_state enum) - 'NONE', 'DRIVER_ON_THE_WAY', etc.
- `created_at` (timestamptz) - Creation timestamp

## Ride Type Specific Fields

### 1. TAXI Rides
**Service Type:** `taxi`

**Additional Fields:**
- `number_of_passengers` (integer) - Number of passengers (default: 1)
- `is_round_trip` (boolean) - Whether it's a round trip (default: false)

**Example Database Record:**
```json
{
  "service_type": "taxi",
  "ride_type": "taxi",
  "ride_timing": "instant",
  "number_of_passengers": 1,
  "is_round_trip": false,
  "vehicle_type": "sedan",
  "pickup_location": "123 Main Street, Harare, Zimbabwe",
  "dropoff_location": "456 Airport Road, Harare, Zimbabwe"
}
```

**Code Location:**
- Preparation: `src/hooks/useBookingSubmission.js` - `prepareBookingData()` function
- Submission: `src/dashboards/client/components/UnifiedBookingModal.jsx` - Lines 916-919

### 2. COURIER Rides
**Service Type:** `courier`

**Additional Fields:**
- `courier_packages` (text) - JSON stringified array of package objects
- `package_size` (text) - 'small', 'medium', 'large', 'extra_large'
- `recipient_name` (text) - Name of package recipient
- `recipient_phone` (text) - Phone number of recipient

**Package Object Structure:**
```json
{
  "packageSize": "medium",
  "recipientName": "John Doe",
  "recipientPhone": "+263771234567",
  "description": "Package description"
}
```

**Example Database Record:**
```json
{
  "service_type": "courier",
  "ride_type": "courier",
  "ride_timing": "instant",
  "courier_packages": "[{\"packageSize\":\"medium\",\"recipientName\":\"John Doe\",\"recipientPhone\":\"+263771234567\"}]",
  "package_size": "medium",
  "recipient_name": "John Doe",
  "recipient_phone": "+263771234567"
}
```

**Code Location:**
- Preparation: `src/dashboards/client/components/UnifiedBookingModal.jsx` - Lines 922-928

### 3. ERRANDS Rides
**Service Type:** `errands`

**Additional Fields:**
- `number_of_tasks` (integer) - Total number of errand tasks
- `errand_tasks` (jsonb) - JSON array of task objects
- `completed_tasks_count` (integer) - Number of completed tasks (default: 0)
- `remaining_tasks_count` (integer) - Remaining tasks (default: same as number_of_tasks)
- `active_errand_task_index` (integer) - Current active task index (default: 0)

**Task Object Structure:**
```json
{
  "id": "1",
  "order": 0,
  "title": "Task description",
  "pickup": "Pickup address",
  "dropoff": "Dropoff address",
  "pickup_location": "Pickup address",
  "dropoff_location": "Dropoff address",
  "description": "Task description",
  "durationMinutes": 15,
  "cost": 14,
  "distanceKm": 27.5
}
```

**Example Database Record:**
```json
{
  "service_type": "errands",
  "ride_type": "errands",
  "ride_timing": "instant",
  "number_of_tasks": 2,
  "errand_tasks": "[{\"id\":\"1\",\"order\":0,\"title\":\"Task 1\",...},{\"id\":\"2\",\"order\":1,\"title\":\"Task 2\",...}]",
  "completed_tasks_count": 0,
  "remaining_tasks_count": 2,
  "active_errand_task_index": 0
}
```

**Code Location:**
- Preparation: `src/dashboards/client/components/UnifiedBookingModal.jsx` - Lines 905-914
- Post-processing: `src/hooks/useBookingSubmission.js` - Lines 474-483 (inserts into errand_tasks table)

### 4. SCHOOL RUN Rides
**Service Type:** `school_run`

**Additional Fields:**
- `passenger_name` (text) - Name of student/passenger
- `contact_number` (text) - Guardian/contact phone number
- `is_round_trip` (boolean) - Whether it's a round trip (default: false)

**Example Database Record:**
```json
{
  "service_type": "school_run",
  "ride_type": "school_run",
  "ride_timing": "instant",
  "passenger_name": "Jane Doe",
  "contact_number": "+263771234567",
  "is_round_trip": false
}
```

**Code Location:**
- Preparation: `src/dashboards/client/components/UnifiedBookingModal.jsx` - Lines 930-935

## Instant-Only Mode Constraints

Based on `src/config/featureFlags.js`:
- `SCHEDULED_RIDES_ENABLED: false`
- `RECURRING_RIDES_ENABLED: false`
- `ROUND_TRIPS_ENABLED: false`

**Enforcement:**
- All rides are forced to `ride_timing: 'instant'`
- `scheduled_datetime: null`
- `recurrence_pattern: null`
- `is_round_trip: false` (forced)

**Code Location:**
- `src/lib/database.js` - Lines 64-69
- `src/hooks/useBookingSubmission.js` - Line 334 (`enforceInstantOnly()`)

## Data Flow

### 1. Form Submission
- User fills form in `UnifiedBookingModal.jsx`
- Form data collected in component state

### 2. Validation
- `validateBookingData()` in `useBookingSubmission.js`
- Service-specific validations applied

### 3. Route Calculation
- `calculateRouteDetails()` calculates distance and duration
- Uses Google Maps API or Haversine fallback

### 4. Fare Calculation
- `calculateFinalFare()` uses service-specific calculators:
  - `calculateTaxiFare()`
  - `calculateCourierFare()`
  - `calculateSchoolRunFare()`
  - `calculateErrandsFare()`

### 5. Data Preparation
- `prepareBookingData()` in `useBookingSubmission.js` OR
- Direct preparation in `UnifiedBookingModal.jsx` (lines 806-944)
- Service-specific fields added conditionally

### 6. Database Insertion
- Direct Supabase insert: `supabase.from('rides').insert([bookingData])`
- Location: `src/hooks/useBookingSubmission.js` - Lines 463-467
- OR: `src/dashboards/client/components/UnifiedBookingModal.jsx` - Lines 1240-1244

### 7. Post-Processing
- **Errands:** Insert tasks into `errand_tasks` table (Lines 474-483)
- **Instant Rides:** Broadcast to nearby drivers (Lines 500-507)
- **Recurring:** Create recurring series (if enabled) (Lines 485-498)

## Console Logging

Key console logs to watch for:
- `✅ Instant ride created - notifications will be sent via edge function`
- `✅ Ride created successfully:` (with ride data)
- `✅ Ride broadcast to X drivers`
- `⚠️ No nearby drivers found`
- `❌ Database insertion failed: [error message]`

## Network Requests

Watch for these Supabase API calls:
- `POST /rest/v1/rides` - Main ride creation
- `POST /rest/v1/errand_tasks` - Errand tasks insertion (for errands only)
- `POST /functions/v1/broadcast-ride-to-drivers` - Driver notification (via trigger)

## Testing Checklist

### Taxi Ride
- [x] Verify `service_type: 'taxi'`
- [x] Verify `number_of_passengers` is set
- [x] Verify `is_round_trip: false` (forced in instant-only mode)
- [x] Verify `ride_timing: 'instant'`
- [x] Verify coordinates in GeoJSON format

### Courier Ride
- [ ] Verify `service_type: 'courier'`
- [ ] Verify `courier_packages` JSON string
- [ ] Verify `recipient_name` and `recipient_phone`
- [ ] Verify `package_size` is set

### Errands Ride
- [x] Verify `service_type: 'errands'`
- [x] Verify `number_of_tasks` matches task count
- [x] Verify `errand_tasks` JSON array
- [x] Verify tasks inserted into `errand_tasks` table
- [x] Verify `completed_tasks_count: 0` and `remaining_tasks_count` set

### School Run Ride
- [ ] Verify `service_type: 'school_run'`
- [ ] Verify `passenger_name` is set
- [ ] Verify `contact_number` is set
- [ ] Verify `is_round_trip: false` (forced in instant-only mode)

## Common Issues

1. **Location Validation:** Form requires valid location selection (not just text input)
2. **GeoJSON Format:** Coordinates must be in GeoJSON Point format: `{"type": "Point", "coordinates": [lng, lat]}`
3. **Instant-Only Enforcement:** All timing fields forced to instant regardless of form input
4. **Round Trip Disabled:** `is_round_trip` always false in current phase

## Next Steps for Testing

1. Complete form submission for each ride type
2. Verify data in Supabase database
3. Check console for errors/warnings
4. Verify driver broadcast for instant rides
5. Test errand tasks insertion separately



