# Edge Function-Based Notification Architecture

## Overview

The notification system uses **Supabase Edge Functions** as the central orchestrator for all notification operations. This provides better error handling, retries, rate limiting, and separation of concerns.

## Architecture

### Flow Diagram

```
┌─────────────────┐
│  Ride Created   │
│  (Database)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Database Trigger              │
│  notify_drivers_on_ride_created │
└────────┬───────────────────────┘
         │
         │ pg_notify('ride_created')
         ▼
┌─────────────────────────────────┐
│  Database Webhook               │
│  (Supabase Dashboard)           │
└────────┬───────────────────────┘
         │
         │ HTTP POST
         ▼
┌─────────────────────────────────────────────┐
│  Edge Function:                             │
│  notify-drivers-on-ride-created             │
│                                             │
│  1. Find nearby drivers (RPC)              │
│  2. Filter eligible drivers                │
│  3. Create notification records            │
│  4. Send push notifications (FCM)          │
│  5. Handle errors & retries                │
└─────────────────────────────────────────────┘
```

### Status Change Flow

```
┌─────────────────┐
│  Status Updated │
│  (Database)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Database Trigger               │
│  notify_ride_status_change       │
└────────┬───────────────────────┘
         │
         │ pg_notify('ride_status_changed')
         ▼
┌─────────────────────────────────┐
│  Database Webhook               │
└────────┬───────────────────────┘
         │
         │ HTTP POST
         ▼
┌─────────────────────────────────────────────┐
│  Edge Function:                             │
│  notify-ride-status-change                  │
│                                             │
│  1. Determine notification details         │
│  2. Create notification record             │
│  3. Send push notification (FCM)           │
│  4. Handle errors & retries                │
└─────────────────────────────────────────────┘
```

## Benefits

### 1. **Separation of Concerns**
- **Database**: Handles data operations only
- **Edge Functions**: Handle business logic and external API calls

### 2. **Non-Blocking Operations**
- Database operations complete quickly
- External API calls (FCM) don't block database transactions
- Better performance and scalability

### 3. **Error Handling**
- Edge functions can implement retry logic
- Better error logging and monitoring
- Failed notifications can be queued for retry

### 4. **Rate Limiting**
- Can implement rate limiting at edge function level
- Prevents overwhelming FCM API
- Can batch notifications

### 5. **Monitoring & Logging**
- Edge function logs provide better visibility
- Can track success/failure rates
- Easier debugging

## Edge Functions

### 1. `notify-drivers-on-ride-created`

**Purpose**: Broadcast ride notifications to nearby drivers

**Trigger**: When a new instant ride is created

**Process**:
1. Validates ride is instant and pending
2. Extracts pickup coordinates
3. Finds nearby drivers using `find_drivers_within_radius` RPC
4. Filters eligible drivers (online, available, not engaged)
5. Creates notification records for each driver
6. Sends push notifications via FCM
7. Updates notification delivery status

**Input**:
```json
{
  "type": "INSERT",
  "table": "rides",
  "record": {
    "id": "uuid",
    "ride_timing": "instant",
    "ride_status": "pending",
    "pickup_coordinates": { "lat": 0, "lng": 0 },
    "service_type": "taxi",
    "pickup_location": "123 Main St",
    "estimated_fare": 25.50
  }
}
```

**Output**:
```json
{
  "success": true,
  "driversNotified": 5,
  "eligibleDrivers": 5,
  "totalNearby": 8,
  "message": "Notified 5 eligible drivers"
}
```

### 2. `notify-ride-status-change`

**Purpose**: Send notifications on ride status changes

**Trigger**: When ride status is updated

**Process**:
1. Validates status actually changed
2. Determines notification type and recipient
3. Creates notification record
4. Sends push notification via FCM
5. Updates notification delivery status

**Input**:
```json
{
  "type": "UPDATE",
  "table": "rides",
  "record": {
    "id": "uuid",
    "ride_status": "driver_assigned",
    "user_id": "uuid",
    "driver_id": "uuid"
  },
  "old_record": {
    "ride_status": "pending"
  }
}
```

**Output**:
```json
{
  "success": true,
  "notificationId": "uuid",
  "message": "Notification sent"
}
```

### 3. `push-notification-handler` (Existing)

**Purpose**: Send FCM push notifications for notification records

**Trigger**: When a notification record is created (via webhook)

**Process**:
1. Gets user's FCM token
2. Builds FCM message
3. Sends to FCM API
4. Updates notification delivery status

## Database Webhooks Setup

### Option 1: Supabase Dashboard (Recommended)

1. Go to **Database > Webhooks** in Supabase Dashboard
2. Create webhook for `ride_created` event:
   - **Event**: `ride_created`
   - **URL**: `https://your-project.supabase.co/functions/v1/notify-drivers-on-ride-created`
   - **HTTP Method**: `POST`
   - **Headers**: 
     ```json
     {
       "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY",
       "Content-Type": "application/json"
     }
     ```

3. Create webhook for `ride_status_changed` event:
   - **Event**: `ride_status_changed`
   - **URL**: `https://your-project.supabase.co/functions/v1/notify-ride-status-change`
   - **HTTP Method**: `POST`
   - **Headers**: Same as above

### Option 2: pg_net Extension (Alternative)

If `pg_net` extension is available, you can make direct HTTP calls from triggers:

```sql
-- Example using pg_net
SELECT net.http_post(
  url := 'https://your-project.supabase.co/functions/v1/notify-drivers-on-ride-created',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object(
    'type', 'INSERT',
    'table', 'rides',
    'record', row_to_json(NEW)
  )::text
);
```

## Deployment

### 1. Deploy Edge Functions

```bash
# Deploy notify-drivers-on-ride-created
supabase functions deploy notify-drivers-on-ride-created

# Deploy notify-ride-status-change
supabase functions deploy notify-ride-status-change
```

### 2. Set Secrets

```bash
supabase secrets set FCM_SERVER_KEY=your_fcm_server_key
```

### 3. Run Database Migration

```bash
supabase db push
```

### 4. Configure Webhooks

Set up database webhooks in Supabase Dashboard as described above.

## Error Handling

### Retry Logic

Edge functions can implement retry logic:

```typescript
async function sendWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### Failed Notification Queue

Failed notifications can be stored in a queue table for later retry:

```sql
CREATE TABLE notification_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id),
  retry_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  error_message TEXT
);
```

## Monitoring

### Edge Function Logs

View logs in Supabase Dashboard:
- **Edge Functions > Logs**
- Filter by function name
- Check for errors and performance

### Metrics to Track

- Notification delivery success rate
- Average delivery time
- FCM API errors
- Edge function execution time
- Retry counts

## Testing

### Test Ride Creation

1. Create a test ride via API or UI
2. Check edge function logs for execution
3. Verify notifications are created
4. Verify push notifications are sent

### Test Status Change

1. Update ride status via API
2. Check edge function logs
3. Verify notification is created
4. Verify push notification is sent

## Migration from Database Triggers

The new architecture replaces direct notification creation in database triggers with edge function calls. This provides:

- ✅ Better error handling
- ✅ Retry capabilities
- ✅ Rate limiting
- ✅ Better monitoring
- ✅ Non-blocking operations

The old triggers (`broadcast_new_ride_to_drivers` and `notify_ride_status_change`) are replaced with simplified triggers that only notify edge functions via webhooks.


