# Push Notification System Setup Guide

This document describes the Firebase push notification system implementation for the BMTOA PWA app.

## Overview

The notification system provides:
- **Broadcast notifications** to drivers when rides are created
- **Status change notifications** for ride lifecycle events
- **Active ride notifications** for real-time updates
- **Deep linking** support for navigation from notifications

## Architecture

### Components

1. **Firebase Configuration** (`src/lib/firebase.js`)
   - Firebase app initialization
   - FCM token management
   - Foreground message handling

2. **Service Worker** (`public/firebase-messaging-sw.js`)
   - Background notification handling
   - Notification click handling
   - Deep link navigation

3. **Push Notification Service** (`src/services/pushNotificationService.js`)
   - Token registration and updates
   - Service initialization
   - Token refresh handling

4. **Notification Broadcast Service** (`src/services/notificationBroadcastService.js`)
   - Driver notification broadcasting
   - Status change notifications
   - Active ride notifications

5. **Push Notifications Hook** (`src/hooks/usePushNotifications.js`)
   - React hook for notification management
   - Automatic initialization
   - Foreground notification handling

6. **Deep Linking Utilities** (`src/utils/deepLinking.js`)
   - URL parsing
   - Navigation handling
   - Parameter management

### Database Components

1. **Notification Schema** (already exists)
   - `notifications` table
   - `notification_preferences` table
   - FCM token storage in `profiles` table

2. **Database Triggers** (`supabase/migrations/20251213000001_create_ride_notification_triggers.sql`)
   - Automatic notifications on ride status changes
   - Automatic broadcast on new ride creation

3. **RPC Functions** (already exists)
   - `create_notification` - Creates notifications with preference filtering
   - `update_fcm_token` - Updates FCM token in database
   - `find_drivers_within_radius` - Finds nearby drivers

## Setup Instructions

### 1. Firebase Project Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Cloud Messaging API
3. Generate a Web App configuration
4. Generate a VAPID key pair for web push

### 2. Environment Variables

Add the following to your `.env` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

### 3. Install Dependencies

```bash
npm install firebase
```

### 4. Service Worker Configuration

The service worker (`public/firebase-messaging-sw.js`) needs Firebase config. Update it with your Firebase config or use environment variables injected at build time.

### 5. Supabase Edge Function Secrets

Set the FCM server key for the push notification handler:

```bash
supabase secrets set FCM_SERVER_KEY=your_fcm_server_key
```

### 6. Database Migrations

Apply the notification triggers migration:

```bash
supabase db push
```

Or manually run:
```sql
\i supabase/migrations/20251213000001_create_ride_notification_triggers.sql
```

## Usage

### Initialization

Push notifications are automatically initialized when a user logs in via the `usePushNotifications` hook in `App.jsx`.

### Broadcasting Notifications

#### When a Ride is Created

The system automatically broadcasts notifications to nearby drivers when:
- A ride is created with `ride_timing = 'instant'`
- The ride status is `'pending'`
- Drivers are within the specified radius (default 5km)
- Drivers are online (`is_online = true`)
- Drivers are available (`is_available = true`)
- Drivers are not engaged in an active ride (`active_ride_id IS NULL`)

This is handled by:
1. Database trigger `trigger_broadcast_new_ride` (automatic)
2. Edge function `broadcast-ride-notifications` (optional, for manual calls)

#### Status Change Notifications

Notifications are automatically sent when ride status changes:
- `driver_assigned` → Passenger notification
- `driver_on_the_way` → Passenger notification
- `driver_arrived` → Passenger notification (urgent)
- `in_progress` → Passenger notification
- `completed` → Passenger notification
- `cancelled` → Driver or Passenger notification (based on who cancelled)

This is handled by the database trigger `trigger_ride_status_notification`.

### Manual Notification Sending

You can manually send notifications using the services:

```javascript
import { broadcastRideToDrivers, sendRideStatusNotification } from '../services/notificationBroadcastService';

// Broadcast to drivers
await broadcastRideToDrivers(rideId, pickupCoordinates, radiusKm);

// Send status change notification
await sendRideStatusNotification(rideId, newStatus, userId, contextData);
```

## Deep Linking

Notifications include `action_url` fields that enable deep linking:

- **Driver notifications**: `/driver/rides?rideId={rideId}`
- **Passenger notifications**: `/user/dashboard?rideId={rideId}`

When a notification is clicked:
1. Service worker handles the click event
2. Opens/focuses the app at the specified URL
3. React Router navigates to the route
4. Components can access deep link parameters via `getDeepLinkParams()`

## Notification Types

### Driver Notifications

- **new_offer**: New ride request nearby
  - Priority: High
  - Category: Offers
  - Conditions: Within radius, online, available, not engaged

### Passenger Notifications

- **ride_activated**: Driver assigned
- **driver_on_the_way**: Driver heading to pickup
- **driver_arrived**: Driver arrived (urgent)
- **trip_started**: Trip started
- **trip_completed**: Trip completed
- **ride_cancelled_by_driver**: Driver cancelled
- **ride_cancelled_by_passenger**: Passenger cancelled

## Testing

### Test Notification Flow

1. **Create a ride** as a passenger
2. **Check driver dashboard** - should receive notification
3. **Accept ride** - passenger should receive status notification
4. **Update ride status** - relevant parties should receive notifications

### Test Deep Linking

1. Send a test notification with an `action_url`
2. Click the notification
3. Verify app opens at the correct route
4. Verify route parameters are accessible

## Troubleshooting

### Notifications Not Received

1. Check FCM token is registered: `SELECT fcm_token FROM profiles WHERE id = 'user_id'`
2. Check notification preferences: `SELECT * FROM notification_preferences WHERE user_id = 'user_id'`
3. Check browser notification permissions
4. Check service worker is registered
5. Check Firebase configuration is correct

### Token Not Updating

1. Check Firebase initialization
2. Check browser notification permissions
3. Check network connectivity
4. Review browser console for errors

### Deep Links Not Working

1. Check `action_url` format in notifications
2. Check React Router configuration
3. Check service worker notification click handler
4. Verify URL format matches app routes

## Security Considerations

1. **FCM Tokens**: Stored securely in database, only accessible by user
2. **Notification Preferences**: Users can control notification categories
3. **Do Not Disturb**: Respects user DND settings
4. **Rate Limiting**: Notifications are batched to prevent spam
5. **Validation**: All notification data is validated before sending

## Future Enhancements

- [ ] Notification batching for multiple updates
- [ ] Rich notifications with images
- [ ] Notification actions (e.g., "Accept", "Decline")
- [ ] Notification history UI
- [ ] Notification preferences UI
- [ ] Sound customization
- [ ] Notification scheduling


