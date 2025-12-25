# Errand Task Handling Documentation

## Overview
Errand rides consist of multiple tasks that must be completed individually. The ride is only considered complete when ALL tasks have been completed or the ride is cancelled.

## Task Completion Flow

### Individual Task Completion
1. **Task States**: Each task progresses through states:
   - `pending` → `activated` → `driver_on_way` → `driver_arrived` → `started` → `completed`

2. **Advancing Tasks**: 
   - Driver uses action button in ActiveRideOverlay to advance current active task
   - `advanceErrandTask()` service advances the task to next state
   - Each state change sends notification to passenger

3. **Active Task**: Only one task is "active" at a time (the first non-completed task)

### Ride Completion
- **Automatic Completion**: When the last task is completed (`result.summary?.remaining === 0`), the ride is automatically marked as `trip_completed`
- **Location**: `src/dashboards/driver/components/ActiveRideOverlay.jsx` lines 227-253
- **Logic**: 
  ```javascript
  if (result.summary?.remaining === 0 && localRide.ride_status !== RIDE_STATUSES.TRIP_COMPLETED) {
    await completeRide({ rideId, passengerId, notifyPassenger: true });
  }
  ```

## Cancel Button Behavior

### In Modal (RideDetailsModal)
- **Location**: `src/dashboards/client/components/RideDetailsModal.jsx`
- **Method**: Uses `transition_ride_status` RPC function
- **Flow**: 
  1. Shows `window.confirm()` confirmation
  2. Calls RPC to transition ride to `CANCELLED` state
  3. Closes modal on success
- **Scope**: Cancels entire ride (all tasks)

### In List View (ActiveRidesView)
- **Location**: `src/dashboards/client/components/ActiveRidesView.jsx`
- **Method**: Uses `useCancelRide` hook with `SharedCancelRideModal`
- **Flow**:
  1. Opens `SharedCancelRideModal` for reason selection
  2. User selects cancellation reason
  3. Calls `cancelRide()` hook which updates ride status
  4. Sends notification to driver (if applicable)
- **Scope**: Cancels entire ride (all tasks)

### Key Difference
- **Modal**: Simple confirmation dialog, direct RPC call
- **List**: Reason selection modal, uses shared hook with notification

**Important**: For errand rides, cancelling cancels the ENTIRE ride and all its tasks. Individual tasks cannot be cancelled separately - only the whole ride.

## Display Components

### Driver Feed (DriverRideCard)
- **Location**: `src/dashboards/driver/components/DriverRideCard.jsx`
- **Component**: Uses `ErrandTaskList` with `compact={true}`
- **Shows**: Summary with task count, completion status, costs, distances

### Active Ride Overlay
- **Location**: `src/dashboards/driver/components/ActiveRideOverlay.jsx`
- **Component**: Uses `ErrandTaskList` with `compact={false}`
- **Shows**: Full structured task list with:
  - Task number and name
  - Pickup and drop-off addresses
  - Distance, time, and cost per task
  - Task status indicators
  - Action button to advance current task

### Structured Task Display Format
Matches booking confirmation format:
- Summary: "{total} tasks • {distance} km combined • {duration} min estimated"
- Each task:
  - "{index + 1}. {task title}"
  - "Pickup: {address}"
  - "Drop-off: {address}"
  - "≈ {distance} km • {duration} min • ${cost}"

## Service Functions

### `advanceErrandTask()`
- **Location**: `src/services/errandTaskService.js`
- **Purpose**: Advances a single task to its next state
- **Returns**: Updated tasks array and summary with completion counts
- **Updates**: `errand_tasks`, `completed_tasks_count`, `remaining_tasks_count`, `active_errand_task_index`

### `fetchErrandTasksForRide()`
- **Location**: `src/services/errandTaskService.js`
- **Purpose**: Fetches current task state from database
- **Returns**: Parsed tasks and summary

## Database Fields
- `errand_tasks`: JSON array of task objects with state
- `completed_tasks_count`: Number of completed tasks
- `remaining_tasks_count`: Number of remaining tasks
- `active_errand_task_index`: Index of current active task


