# Design Document

## Overview

This design addresses two critical issues: the failing ride completion logic and the inadequate notification system. The ride completion flow was using incorrect status values, and the notification system was not sending real-time updates to passengers during active rides.

## Architecture

### Ride Completion Flow

```
Driver clicks "Complete Trip"
    ↓
updateTripStatus('completed')
    ↓
Validate transition (trip_started → completed)
    ↓
Update database:
    - ride_status = 'completed'
    - completed_at = timestamp
    - actual_dropoff_time = timestamp
    - payment_status = 'paid'
    ↓
Send notification to passenger
    ↓
Update driver availability
    ↓
Dismiss overlay
    ↓
Refresh driver's ride list
```

### Notification System Architecture

```
Driver updates ride status
    ↓
Insert notification into notifications table
    ↓
Supabase Realtime broadcasts change
    ↓
Passenger's subscription receives update
    ↓
Display notification in UI
```

## Components and Interfaces

### 1. ActiveRideOverlay Component (Driver Side)

**Location**: `src/dashboards/driver/components/ActiveRideOverlay.jsx`

**Key Functions**:
- `updateTripStatus(newStatus)`: Updates ride status and sends notifications
- `getNextAction()`: Determines the next available action for the current ride status

**Status Transitions**:
- `accepted` → `driver_on_way`
- `driver_on_way` → `driver_arrived`
- `driver_arrived` → `trip_started`
- `trip_started` → `completed`

**Notification Messages**:
```javascript
{
  driver_on_way: {
    title: '🚗 Driver En Route',
    message: 'Your driver is on the way to pick you up!'
  },
  driver_arrived: {
    title: '📍 Driver Arrived',
    message: 'Your driver has arrived at the pickup location.'
  },
  trip_started: {
    title: '🎯 Journey Started',
    message: 'Your trip has started. Have a safe journey!'
  },
  completed: {
    title: '✅ Trip Completed',
    message: 'Your ride has been completed. Thank you for riding with us!'
  }
}
```

### 2. Notification Service

**Database Table**: `notifications`

**Schema**:
```sql
{
  id: uuid,
  user_id: uuid,
  title: text,
  message: text,
  type: text,
  action_url: text,
  created_at: timestamp,
  read_at: timestamp
}
```

**Notification Creation**:
```javascript
await supabase.from('notifications').insert({
  user_id: ride.user_id,
  title: notification.title,
  message: notification.message,
  type: 'ride',
  action_url: `/user/rides/${ride.id}`,
  created_at: new Date().toISOString()
});
```

### 3. Real-time Subscription Hook (Passenger Side)

**Location**: `src/hooks/useRideNotifications.js` (to be created)

**Purpose**: Subscribe to ride status changes and notifications in real-time

**Implementation**:
```javascript
export function useRideNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel(`ride-notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        // Handle new notification
        setNotifications(prev => [payload.new, ...prev]);
        // Show toast notification
      })
      .subscribe();
      
    return () => channel.unsubscribe();
  }, [userId]);
  
  return { notifications };
}
```

## Data Models

### Ride Status Values

**Correct Status Values**:
- `pending`: Ride is awaiting driver offers
- `accepted`: Driver has accepted the ride
- `driver_on_way`: Driver is en route to pickup
- `driver_arrived`: Driver has arrived at pickup
- `trip_started`: Trip is in progress
- `completed`: Trip is finished
- `cancelled`: Trip was cancelled

**Important**: The status value is `'completed'`, NOT `'trip_completed'`

### Notification Model

```typescript
interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'ride' | 'payment' | 'system';
  action_url?: string;
  created_at: string;
  read_at?: string;
}
```

## Error Handling

### Ride Completion Errors

**Potential Errors**:
1. Invalid status transition
2. Database update failure
3. Driver availability update failure
4. Notification send failure

**Handling Strategy**:
```javascript
try {
  // Update ride status
  const { error } = await supabase.from('rides').update(...);
  if (error) throw error;
  
  // Send notification (non-blocking)
  try {
    await supabase.from('notifications').insert(...);
  } catch (e) {
    console.error('Error sending notification:', e);
    // Don't fail the entire operation
  }
  
  // Update driver availability (non-blocking)
  try {
    await supabase.from('driver_locations').update(...);
  } catch (e) {
    console.error('Error updating driver availability:', e);
  }
  
} catch (e) {
  console.error('Error updating trip status:', e);
  addToast({ 
    type: 'error', 
    title: 'Failed to update status', 
    message: e.message 
  });
}
```

### Notification Delivery Errors

**Retry Logic**: Not implemented in initial version (notifications are fire-and-forget)

**Logging**: All notification errors are logged to console for debugging

## Testing Strategy

### Manual Testing

1. **Ride Completion Flow**:
   - Start a ride as driver
   - Progress through all statuses
   - Verify each status update succeeds
   - Verify ride reaches 'completed' status
   - Verify driver becomes available again

2. **Notification Delivery**:
   - Have passenger logged in during active ride
   - Update ride status as driver
   - Verify passenger receives notification
   - Check notification appears in notification bell
   - Verify notification links to correct ride

3. **Error Scenarios**:
   - Test with invalid status transitions
   - Test with network errors
   - Verify error messages are user-friendly
   - Verify partial failures don't break the system

### Integration Testing

1. **End-to-End Ride Flow**:
   - Passenger books ride
   - Driver accepts
   - Driver progresses through all statuses
   - Passenger receives all notifications
   - Ride completes successfully
   - Both parties see correct final state

2. **Real-time Subscription**:
   - Verify notifications arrive within 1 second
   - Test with multiple concurrent rides
   - Test with passenger offline/online transitions

## Implementation Notes

### Status Value Consistency

The codebase has inconsistent status values. Going forward:
- Use `'completed'` for finished rides
- Update any code using `'trip_completed'` to use `'completed'`
- Consider a migration to standardize all status values

### Notification Timing

Notifications are sent AFTER the database update succeeds. This ensures:
- Notifications only sent for successful status changes
- No orphaned notifications for failed updates
- Consistent state between database and notifications

### Driver Availability

When a ride is completed:
1. Ride status updated to 'completed'
2. Driver availability set to true
3. Driver can now accept new rides

### Passenger Experience

Passengers will see notifications:
- In the notification bell (top right)
- As toast notifications (if page is active)
- In the ride details modal (status updates)

## Future Enhancements

1. **Notification Preferences**: Allow users to customize which notifications they receive
2. **Push Notifications**: Implement web push for offline users
3. **SMS Notifications**: Send critical updates via SMS
4. **Notification History**: Store and display notification history
5. **Read Receipts**: Track when notifications are read
6. **Retry Logic**: Implement retry for failed notification deliveries
7. **Batch Notifications**: Group multiple updates into single notification
8. **Driver Notifications**: Send notifications to drivers about passenger actions
