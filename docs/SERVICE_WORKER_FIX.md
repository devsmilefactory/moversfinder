# Service Worker Integration Fix

## Problem
After implementing push notifications, the app had multiple issues:
1. **Update notifications stopped working** - App no longer notified users of new versions
2. **Map loading failures** - Google Maps failed to load
3. **Push notifications not working** - Firebase push notifications weren't being received

## Root Cause
The app was registering **two separate service workers**:
- `/sw.js` - Workbox service worker (for PWA updates and caching)
- `/firebase-messaging-sw.js` - Firebase messaging service worker (for push notifications)

Having two service workers caused conflicts:
- Service workers can only have one active worker per scope
- The Firebase service worker registration was interfering with Workbox
- Update detection was broken because the service workers were competing

## Solution
Integrated Firebase messaging into the Workbox service worker to use a **single unified service worker**.

### Changes Made

1. **Created Firebase Integration Script** (`public/firebase-messaging-sw-integration.js`)
   - Contains Firebase messaging code
   - Loaded into Workbox service worker via `importScripts`
   - Handles background push notifications
   - Handles notification clicks and deep linking

2. **Updated Vite Configuration** (`vite.config.mjs`)
   - Added `importScripts: ['/firebase-messaging-sw-integration.js']` to Workbox config
   - Added Google Maps API to NetworkOnly cache strategy (prevents caching issues)
   - This injects Firebase code into the generated Workbox service worker

3. **Updated Firebase Initialization** (`src/lib/firebase.js`)
   - Changed from registering `/firebase-messaging-sw.js` to using `/sw.js` (Workbox)
   - Now uses the existing Workbox service worker instead of creating a separate one
   - Sends Firebase config to the service worker via postMessage

4. **Fixed Update Detection** (`src/components/pwa/PWAUpdateNotification.jsx`)
   - Fixed version comparison bug (was using `getCurrentVersion()` twice instead of `getStoredVersion()`)
   - Improved update check error handling
   - Better handling of `?update=true` query parameter

## How It Works Now

1. **Single Service Worker**: Only `/sw.js` (Workbox) is registered
2. **Firebase Integration**: Firebase messaging code is injected into the Workbox service worker
3. **Update Detection**: Works properly with a single service worker
4. **Push Notifications**: Firebase config is sent to the service worker, which handles background messages
5. **Map Loading**: Google Maps API is never cached, ensuring fresh loads

## Testing

After rebuilding the app, verify:
1. ✅ Service worker registers successfully (check DevTools → Application → Service Workers)
2. ✅ Only one service worker is active (`/sw.js`)
3. ✅ Update notifications appear when a new version is deployed
4. ✅ Push notifications are received in the background
5. ✅ Google Maps loads correctly
6. ✅ App update flow works (clicking update notification → app reloads)

## Files Changed

- `vite.config.mjs` - Added Firebase integration script to Workbox
- `src/lib/firebase.js` - Use Workbox service worker instead of separate Firebase one
- `src/components/pwa/PWAUpdateNotification.jsx` - Fixed update detection
- `public/firebase-messaging-sw-integration.js` - New file with Firebase messaging code

## Notes

- The old `public/firebase-messaging-sw.js` file is kept for reference but is no longer used
- The service worker now handles both PWA updates and push notifications
- Google Maps API requests are never cached to prevent loading issues


