# App Update Push Notifications Implementation

## Overview

Enhanced version detection and update notification system with push notification integration for robust update detection.

## ✅ Implementation Complete

### 1. Database Migration ✅
**Migration**: `20251215000002_add_app_update_notification_type`

**Changes Applied**:
- ✅ Added `app_update` to `notification_type` enum
- ✅ Added `system` to `notification_category` enum
- ✅ Migration applied successfully

### 2. App Update Notification Service ✅
**File**: `src/services/appUpdateNotificationService.js`

**Features**:
- `sendAppUpdateNotification()` - Sends push notification when update is detected
- `checkAndNotifyAppUpdate()` - Checks version and sends notification if updated
- `registerAppVersion()` - Registers app version with backend (optional)

### 3. Enhanced PWA Update Component ✅
**File**: `src/components/pwa/PWAUpdateNotification.jsx`

**Enhancements**:
- ✅ Integrated with push notification service
- ✅ Sends FCM push notification when update detected
- ✅ More frequent update checks (every 2 minutes)
- ✅ Maintains browser notification as fallback
- ✅ Deep linking support for update notifications

### 4. App-Level Integration ✅
**File**: `src/App.jsx`

**Features**:
- ✅ Checks for updates on app start
- ✅ Periodic version checking (every 10 minutes)
- ✅ Checks and sends push notifications when user is authenticated
- ✅ Periodic authenticated checks (every 15 minutes)

### 5. Push Notification Handler Updates ✅
**Files**: 
- `src/hooks/usePushNotifications.js`
- `public/firebase-messaging-sw.js`

**Enhancements**:
- ✅ Special handling for app_update notifications
- ✅ Deep linking to `/?update=true` for update flow
- ✅ Service worker handles app update notification clicks

## Update Detection Flow

### 1. Service Worker Detection
```
Service Worker Update → updatefound event → 
  → Send Push Notification (FCM)
  → Show In-App Banner
  → Browser Notification (fallback)
```

### 2. Version-Based Detection
```
App Start → Check Version → 
  → If Updated: Send Push Notification
  → Clear Caches
  → Show Update Banner
```

### 3. Periodic Checks
```
Every 2 minutes: Check Service Worker
Every 10 minutes: Check Version (unauthenticated)
Every 15 minutes: Check Version + Send Push (authenticated)
```

## Push Notification Details

### Notification Payload
```json
{
  "notification": {
    "title": "New Version Available",
    "body": "TaxiCab v{version} is ready! Update now...",
    "click_action": "/?update=true"
  },
  "data": {
    "notification_type": "app_update",
    "update_type": "app_update",
    "new_version": "{version}",
    "current_version": "{old_version}",
    "action_url": "/?update=true"
  }
}
```

### Deep Link
- **URL**: `/?update=true`
- **Behavior**: Triggers update flow, shows update banner

## Version Checking Strategy

### Multiple Detection Methods

1. **Service Worker Updates** (Primary)
   - Detects new service worker installation
   - Most reliable for PWA updates
   - Frequency: Every 2 minutes

2. **Version String Comparison** (Secondary)
   - Compares `VITE_APP_VERSION` with stored version
   - Detects version changes on app start
   - Frequency: Every 10-15 minutes

3. **Periodic Checks** (Tertiary)
   - Background checks when app is running
   - Ensures updates aren't missed
   - Frequency: Every 15 minutes (authenticated)

## Notification Delivery

### Push Notification Flow
```
Version Change Detected → 
  → Create Notification Record (database)
  → Send FCM Push Notification
  → Service Worker Receives (background)
  → User Clicks → Deep Link to /?update=true
  → App Shows Update Banner
```

### Fallback Mechanisms
1. **FCM Push** (Primary) - Works when app is closed
2. **In-App Banner** (Always) - High visibility
3. **Browser Notification** (Fallback) - If push fails

## Testing Checklist

- [ ] Service worker update detection works
- [ ] Push notification sent when update detected
- [ ] Deep link navigates to update flow
- [ ] Update banner shows correctly
- [ ] Version checking works on app start
- [ ] Periodic checks run correctly
- [ ] Notification works when app is closed
- [ ] Notification works when app is in background
- [ ] Notification works when app is in foreground

## Configuration

### Update Check Intervals
- **Service Worker**: 2 minutes
- **Version Check (Unauthenticated)**: 10 minutes
- **Version Check (Authenticated)**: 15 minutes

### Notification Priority
- **Priority**: High
- **Category**: System
- **Type**: app_update

## Benefits

1. **Robust Detection**: Multiple detection methods ensure updates aren't missed
2. **Push Notifications**: Users get notified even when app is closed
3. **Deep Linking**: Direct navigation to update flow
4. **Consistent UX**: Uses same notification system as ride updates
5. **Backward Compatible**: Falls back to browser notifications if push fails

## Notes

- Push notifications require FCM to be configured
- Version checking works even without authentication
- Update notifications are high priority and cannot be easily dismissed
- Deep links ensure users can easily access the update flow


