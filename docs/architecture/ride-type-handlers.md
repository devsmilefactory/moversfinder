# Ride Type Handler System

## Overview

The ride type handler system provides a modular, scalable approach to handling service-specific requirements across the application. Instead of scattered `if (service_type === 'errand')` checks throughout the codebase, each ride type defines its own handlers for common operations.

## Architecture

### Core Handler System

Located in `src/utils/rideTypeHandlers.js`, the system provides:

- **Base Handler**: Default implementations for all ride types
- **Service-Specific Handlers**: Override base methods for custom behavior
- **Handler Registry**: Centralized registration and lookup

### Handler Methods

Each handler can implement:

#### Display Methods
1. **`renderLocationDetails(ride)`** - Custom location display (errands show tasks instead of pickup/dropoff)
2. **`renderServiceDetails(ride)`** - Service-specific information (recipient info for courier, passenger count for taxi, etc.)
3. **`renderCardDetails(ride, context, options)`** - Service-specific card content for ride cards
4. **`getStatusDisplay(ride)`** - Custom status display configuration
5. **`getServiceTypeDisplay(serviceType)`** - Get service type display info (icon, label, colors)

#### Ride Creation & Validation
6. **`prepareRideData(formData, serviceData)`** - Prepare ride data for database insertion
7. **`validateBookingData(formData, serviceData)`** - Validate booking data before submission
8. **`validateRide(ride)`** - Service-specific validation rules

#### Pricing Methods
9. **`calculateFare(params)`** - Calculate fare for this ride type
10. **`getPricingRules(serviceType)`** - Get pricing rules configuration
11. **`getFareBreakdown(fareResult)`** - Get fare breakdown display
12. **`getCostBreakdown(ride)`** - Get cost breakdown for the ride

#### Progress & Status
13. **`getProgressInfo(ride)`** - Progress tracking information
14. **`getCardSummary(ride)`** - Get card summary text

#### Active Ride Actions
15. **`getActiveRideActions(ride, handlers)`** - Get available actions for active ride
16. **`handleActiveRideAction(ride, action, handlers)`** - Handle active ride action

#### Completion Logic
17. **`canComplete(ride)`** - Check if ride can be completed
18. **`prepareCompletionData(ride)`** - Prepare completion data
19. **`onComplete(ride, completionData)`** - Handle ride completion (service-specific logic)

## Current Implementation

### Implemented Handlers

- ✅ **Errand Handler** - Task list display, task progress tracking
- ✅ **Courier Handler** - Recipient information, package details
- ✅ **Taxi Handler** - Passenger count display
- ✅ **School Run Handler** - Student information, contact details

### Integrated Components

- ✅ `src/dashboards/client/components/RideDetailsModal.jsx` - Active ride modal
- ✅ `src/dashboards/client/components/PendingRideCard.jsx` - Uses handler for service type display
- ✅ `src/dashboards/client/components/ActiveRideCard.jsx` - Uses handler for service type display
- ✅ `src/dashboards/client/components/CompletedRideCard.jsx` - Uses handler for service type display
- ✅ `src/dashboards/client/components/CancelledRideCard.jsx` - Uses handler for service type display
- ✅ `src/dashboards/driver/components/DriverRideCard.jsx` - Uses handler for service-specific logic
- ✅ `src/dashboards/driver/components/DriverRideDetailsModal.jsx` - Uses handler for service display
- ✅ `src/dashboards/driver/components/activeRide/StatusUpdateActions.jsx` - Uses handler for completion checks
- ✅ `src/hooks/useBookingSubmission.js` - Uses handler for fare calculation
- ✅ `src/dashboards/client/components/UnifiedBookingModal.jsx` - Uses handler for fare calculation

## Migration Status

### ✅ Completed Migrations

#### 1. Active Ride Modal (✅ Complete)
**File**: `src/dashboards/client/components/RideDetailsModal.jsx`
**Status**: ✅ Implemented
**Notes**: Now uses `getRideTypeHandler()` for location and service details

#### 2. Ride Cards (✅ Complete)
**Files**:
- ✅ `src/dashboards/client/components/PendingRideCard.jsx` - Migrated to use `getServiceTypeDisplay()`
- ✅ `src/dashboards/client/components/ActiveRideCard.jsx` - Migrated to use `getServiceTypeDisplay()`
- ✅ `src/dashboards/client/components/CompletedRideCard.jsx` - Migrated to use `getServiceTypeDisplay()`
- ✅ `src/dashboards/client/components/CancelledRideCard.jsx` - Migrated to use `getServiceTypeDisplay()`
- ✅ `src/dashboards/driver/components/DriverRideCard.jsx` - Migrated to use handler system

**Changes Made**:
- Removed hardcoded `serviceMap` objects
- Replaced with `handler.getServiceTypeDisplay(ride.service_type)`
- All cards now use consistent handler methods

#### 3. Fare Calculation (✅ Complete)
**Files**:
- ✅ `src/hooks/useBookingSubmission.js` - Migrated to use `handler.calculateFare()`
- ✅ `src/dashboards/client/components/UnifiedBookingModal.jsx` - Migrated to use `handler.calculateFare()`

**Changes Made**:
- Removed switch statements and if/else chains
- All fare calculations now go through handler system
- Service-specific handlers implement `calculateFare()` method

#### 4. Driver Components (✅ Complete)
**Files**:
- ✅ `src/dashboards/driver/components/DriverRideDetailsModal.jsx` - Uses handler for service display
- ✅ `src/dashboards/driver/components/activeRide/StatusUpdateActions.jsx` - Uses handler for completion checks

**Changes Made**:
- StatusUpdateActions now uses `handler.canComplete()` before allowing completion
- StatusUpdateActions uses `handler.onComplete()` for service-specific completion logic
- DriverRideDetailsModal uses `handler.getServiceTypeDisplay()` for service name

#### 5. Ride Cost Display (✅ Already Using Handlers)
**File**: `src/utils/rideCostDisplay.js`
**Status**: ✅ Already integrated
**Notes**: Uses handlers via `getRideCostDisplay()` which calls `handler.getCostBreakdown()`

#### 6. Ride Progress Tracking (✅ Already Using Handlers)
**File**: `src/utils/rideProgressTracking.js`
**Status**: ✅ Already integrated
**Notes**: Uses handlers via `getRideProgress()` which calls `handler.getProgressInfo()`

### 6. Booking Forms
**Files**:
- `src/components/booking/forms/*.jsx`
- `src/dashboards/client/components/UnifiedBookingModal.jsx`

**Current Issues**:
- Each service has its own form component
- Validation logic is scattered

**Recommended Approach**:
- Keep separate form components (they're complex enough)
- Use handler's `validateRide()` for consistent validation
- Consider form field configuration from handlers

### 7. Ride Details Modal (Shared)
**File**: `src/dashboards/shared/RideDetailsModal.jsx`
**Current Issues**:
- Has service-specific rendering logic
- Similar to client RideDetailsModal but not using handlers

**Recommended Approach**:
- Migrate to use handler system like client modal

### 8. Feed Helpers
**File**: `src/services/feedHelpers.js`
**Current Issues**:
- Has `isErrandRide()` function
- Could use handler system for ride type detection

**Recommended Approach**:
- Add `isRideType(ride, serviceType)` to handler system
- Use handler registry for type checking

## Migration Strategy

### Phase 1: Core System (✅ Complete)
- [x] Create handler system
- [x] Implement base handler
- [x] Implement errand handler
- [x] Implement other service handlers
- [x] Integrate with active ride modal

### Phase 2: Handler Methods (✅ Complete)
- [x] Add `prepareRideData()` method
- [x] Add `validateBookingData()` method
- [x] Add `calculateFare()` method
- [x] Add `getPricingRules()` method
- [x] Add `getActiveRideActions()` method
- [x] Add `handleActiveRideAction()` method
- [x] Add `canComplete()` method
- [x] Add `prepareCompletionData()` method
- [x] Add `onComplete()` method
- [x] Add `getServiceTypeDisplay()` method

### Phase 3: Ride Cards (✅ Complete)
- [x] Add `renderCardDetails()` method to handlers
- [x] Update PendingRideCard
- [x] Update ActiveRideCard
- [x] Update CompletedRideCard
- [x] Update CancelledRideCard
- [x] Update DriverRideCard

### Phase 4: Fare Calculation (✅ Complete)
- [x] Migrate useBookingSubmission hook
- [x] Migrate UnifiedBookingModal
- [x] Implement calculateFare for all handlers

### Phase 5: Driver Components (✅ Complete)
- [x] Update StatusUpdateActions to use handlers
- [x] Update DriverRideDetailsModal
- [x] Migrate completion logic to handlers

### Phase 6: Utilities (✅ Already Integrated)
- [x] Ride progress tracking uses handlers
- [x] Cost display uses handlers

### Remaining Work
- [ ] Update shared RideDetailsModal (if needed)
- [ ] Standardize validation across forms (optional enhancement)

## Benefits

1. **Scalability**: Adding new ride types requires only creating a new handler
2. **Consistency**: All components use the same handler methods
3. **Maintainability**: Service-specific logic is centralized
4. **Testability**: Handlers can be tested independently
5. **Flexibility**: Easy to override behavior for specific contexts

## Example Usage

### Basic Component Usage

```javascript
import { getRideTypeHandler } from '../utils/rideTypeHandlers';

function MyRideComponent({ ride }) {
  const handler = getRideTypeHandler(ride.service_type);
  
  return (
    <div>
      {/* Location details - automatically handles errands vs others */}
      {handler.renderLocationDetails(ride)}
      
      {/* Service-specific details */}
      {handler.renderServiceDetails(ride)}
      
      {/* Status display */}
      <StatusBadge {...handler.getStatusDisplay(ride)} />
      
      {/* Progress */}
      <ProgressBar {...handler.getProgressInfo(ride)} />
    </div>
  );
}
```

### Service Type Display

```javascript
const handler = getRideTypeHandler(ride.service_type);
const serviceInfo = handler.getServiceTypeDisplay(ride.service_type);
// Returns: { icon, label, color, bgColor, borderColor }

const ServiceIcon = serviceInfo.icon;
return (
  <div className={serviceInfo.bgColor}>
    <ServiceIcon className={serviceInfo.color} />
    <span>{serviceInfo.label}</span>
  </div>
);
```

### Fare Calculation

```javascript
const handler = getRideTypeHandler(selectedService);
const fareResult = await handler.calculateFare({
  distanceKm: 10,
  formData: { isRoundTrip: false, numberOfTrips: 1 },
  serviceData: { vehicleType: 'sedan' },
  numberOfTrips: 1
});
// Returns: { totalFare, breakdown, metadata }
```

### Completion Checks

```javascript
const handler = getRideTypeHandler(ride.service_type);
const canComplete = handler.canComplete(ride);
if (!canComplete.canComplete) {
  console.error(canComplete.reason);
  return;
}

const completionData = handler.prepareCompletionData(ride);
const result = await handler.onComplete(ride, completionData);
```

## Adding a New Ride Type

1. Create handler object extending base handler:
```javascript
const newServiceHandler = {
  ...baseHandler,
  renderServiceDetails: (ride) => {
    // Custom rendering
  }
};
```

2. Register in handler registry:
```javascript
registerRideTypeHandler('new_service', newServiceHandler);
```

3. All components using handlers will automatically support the new type!

## Notes

- Handlers are pure functions - no side effects
- Handlers return JSX or data objects, not stateful components
- Each handler method should handle null/undefined ride gracefully
- Base handler provides sensible defaults for all methods

