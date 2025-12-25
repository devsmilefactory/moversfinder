# Location Detection Centralization

## Problem
Location detection was scattered across multiple files with duplicate code:
- `src/components/booking/LocationSection.jsx` - Had its own `getCurrentPosition` function
- `src/dashboards/driver/DriverRidesPage.jsx` - Custom location detection logic
- `src/dashboards/client/pages/BookRidePage.jsx` - Custom location detection
- Driver location tracking wasn't continuously updating while online

## Solution
Created a centralized location hook (`useCentralizedLocation`) that:
- Provides single source of truth for location detection
- Handles both one-time detection and continuous tracking
- Automatically updates driver location in database
- Includes error handling and permission management
- Supports Google Maps integration for reverse geocoding

## Changes Made

### 1. Created Centralized Hook (`src/hooks/useCentralizedLocation.js`)
**Features:**
- `detectLocation()` - One-time location detection with city/address
- `startTracking()` / `stopTracking()` - Continuous location tracking
- Automatic database updates for drivers
- Permission checking and error handling
- Google Maps integration for geocoding

**Usage:**
```javascript
const {
  currentLocation,
  isDetecting,
  locationError,
  detectLocation,
  startTracking,
  stopTracking
} = useCentralizedLocation({
  enableTracking: isOnline, // For drivers
  updateDatabase: isOnline, // Auto-update driver_locations table
  userId: user?.id,
  onLocationUpdate: (location) => { /* callback */ },
  onError: (error) => { /* error handler */ }
});
```

### 2. Updated Driver Location Tracking (`src/dashboards/driver/DriverRidesPage.jsx`)
- Now uses `useCentralizedLocation` hook
- Automatically tracks location when driver goes online
- Continuously updates `driver_locations` table every 30 seconds
- Stops tracking when driver goes offline
- Better error handling and user feedback

### 3. Fixed LocationSection Component (`src/components/booking/LocationSection.jsx`)
- Removed duplicate `getCurrentPosition` function
- Now uses centralized `getCurrentLocation` from `locationServices.js`
- Uses `detectCurrentLocationWithCity` for reverse geocoding

### 4. Passenger Location Detection
- Already using centralized `detectCurrentLocationWithCity` function
- No changes needed, but can be updated to use hook for consistency

## How It Works

### Driver Location Tracking:
1. Driver clicks "Go Online"
2. `detectLocation()` is called to get initial location
3. `startTracking()` begins continuous tracking
4. Location updates every 5 seconds via `watchPosition`
5. Database is updated every 30 seconds (configurable)
6. When driver goes offline, tracking stops

### Passenger Location Detection:
1. User opens booking page
2. `detectCurrentLocationWithCity()` is called
3. Gets coordinates + city/address via Google Maps
4. Sets pickup location (optional, user can change)

## Benefits

1. **Single Source of Truth**: All location logic in one place
2. **Consistency**: Same error handling and retry logic everywhere
3. **Automatic Updates**: Driver location updates automatically while online
4. **Better UX**: Proper error messages and loading states
5. **Maintainability**: Changes to location logic only need to be made in one place

## Files Changed

- `src/hooks/useCentralizedLocation.js` - New centralized hook
- `src/dashboards/driver/DriverRidesPage.jsx` - Uses centralized hook
- `src/components/booking/LocationSection.jsx` - Uses centralized service

## Testing

After rebuilding, verify:
1. ✅ Driver location updates continuously while online
2. ✅ Location appears in `driver_locations` table
3. ✅ Passenger location detection works on booking page
4. ✅ Error messages appear when location permission denied
5. ✅ Location tracking stops when driver goes offline


