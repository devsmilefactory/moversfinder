### Deprecated / Legacy Code Map

This document lists code that is **kept for reference** but is **not used by the current app flow**.

#### Driver “Ride Requests” legacy UI path (deprecated)
- **Deprecated components**
  - `src/dashboards/driver/components/RideRequestsView.jsx`
  - `src/dashboards/driver/components/RideRequestsViewContainer.jsx`
  - `src/dashboards/driver/components/RefactoredRideRequestsPage.jsx`
- **Deprecated hooks (supporting the above legacy flow)**
  - `src/hooks/useRideRequests.js`
  - `src/hooks/useRideActions.js`
  - `src/hooks/useRideFiltering.js`
  - `src/hooks/useRealTimeUpdates.js` (still present, but realtime now dedupes via registry)
- **Current replacement**
  - Driver route `/driver/rides` renders `src/dashboards/driver/pages/RideRequestsPage.jsx`
  - Which renders `src/dashboards/driver/DriverRidesPage.jsx` and uses:
    - `src/hooks/useDriverRidesFeed.js`
    - `src/hooks/useSmartRealtimeFeed.js`

#### Deprecated realtime hooks
- **Deprecated**
  - `src/hooks/useRideRealtime.js`
  - `src/hooks/useRideStateListener.js`
- **Current replacement**
  - `src/lib/realtimeRegistry.js` (single-channel, deduped subscriptions)
  - `src/hooks/useSmartRealtimeFeed.js`
  - `src/hooks/useNotifications.js`

#### Deprecated Firebase messaging service worker file
- **Deprecated**
  - `public/firebase-messaging-sw.js`
- **Current replacement**
  - Workbox-generated `/sw.js` from `vite-plugin-pwa`
  - Injected messaging integration: `public/firebase-messaging-sw-integration.js`
  - Config: `vite.config.mjs` → `workbox.importScripts`

#### Removed dead exports (safe cleanup)
- Removed from `src/hooks/index.js`
  - `useRideRealtime`
  - `useRideStateListener`


