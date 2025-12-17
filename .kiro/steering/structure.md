# Project Structure

## Root Directory

```
├── src/                    # Application source code
├── public/                 # Static assets and PWA files
├── supabase/              # Database migrations and edge functions
├── build/                 # Production build output (generated)
├── scripts/               # Build and utility scripts
└── [config files]         # vite.config.mjs, tailwind.config.cjs, etc.
```

## Source Directory (`src/`)

### Entry Points
- `main.jsx` - Application entry point, service worker management
- `App.jsx` - Root component with providers and routing
- `Routes.jsx` - Route definitions and protected routes

### Components (`src/components/`)

Organized by feature domain:

- **`auth/`** - Authentication and registration components
  - Login/registration modals
  - Profile forms (Individual, Corporate, Driver, Operator)
  - Profile completion modal
  - Protected route wrapper

- **`common/`** - Shared generic components
  - ComingSoon placeholder

- **`layouts/`** - Layout components for different views

- **`maps/`** - Location and mapping components
  - AddressAutocomplete, LocationPicker, MapView

- **`modals/`** - Reusable modal components
  - ActiveRideModal, ConfirmationModal, RecurringSeriesModal

- **`notifications/`** - Notification UI components
  - NotificationBell, RideStatusToasts

- **`profiles/`** - Profile management components
  - ProfileSwitcher for multi-role users

- **`pwa/`** - PWA-specific components
  - PWAInstallPrompt, PWAUpdateNotification
  - ConnectivityMonitor, PermissionsManager
  - IOSInstallInstructions

- **`recurring/`** - Recurring trip components
  - RecurringTripCard, SeriesProgressBar

- **`shared/`** - Shared business components
  - SharedCancelRideModal, SharedRatingModal

- **`status/`** - Profile status pages

- **`ui/`** - Base UI primitives
  - Button, Input, Modal, ToastProvider, ToggleSwitch

### Dashboards (`src/dashboards/`)

Role-specific dashboard implementations:

- **`client/`** - Passenger dashboards (Individual & Corporate)
  - `components/` - Client-specific components (ride cards, booking forms)
  - `pages/` - Client pages (BookRidePage, RidesPage, ProfilePage)
  - `IndividualDashboard.jsx`, `CorporateDashboard.jsx`

- **`driver/`** - Driver dashboard
  - `components/` - Driver-specific components (ride list, filters, overlays)
  - `pages/` - Driver pages
  - `DriverDashboard.jsx`, `DriverDashboardLayout.jsx`

- **`admin/`** - Admin dashboard
  - `pages/` - Admin pages (ComplaintsPage)

- **`shared/`** - Shared dashboard components
  - Common UI elements (Button, Modal, DataTable, Charts)
  - DashboardLayout, DashboardHeader, DashboardSidebar

### State Management (`src/stores/`)

Zustand stores for global state:

- `authStore.js` - Authentication and user session
- `ridesStore.js` - Ride management and booking
- `profileStore.js` - User profile data
- `driverStore.js` - Driver-specific state
- `savedTripsStore.js`, `savedPlacesStore.js` - User preferences
- `passengersStore.js`, `billingStore.js` - Corporate features
- `scheduledTripsStore.js` - Scheduled and recurring trips
- `ratingStore.js`, `paymentMethodsStore.js` - Supporting features
- `createCRUDStore.js` - Generic store factory
- `index.js` - Central export for all stores

### Services (`src/services/`)

Business logic and API interactions:

- `driverRidesApi.js` - Driver ride feed and management
- `passengerRidesApi.js` - Passenger ride operations
- `corporateBookingService.js` - Corporate booking logic
- `recurringTripService.js` - Recurring trip management
- `bidAcceptanceService.js` - Bid acceptance workflow
- `rideStateService.js` - Ride state transitions
- `notificationService.js` - Notification handling
- `errandApi.js`, `errandTaskService.js` - Errand service logic
- `reminderService.js`, `otpService.js` - Supporting services
- `feedHelpers.js` - Feed filtering and sorting utilities

### Hooks (`src/hooks/`)

Custom React hooks for reusable logic:

- `useActiveRideCheck.js` - Check for active rides
- `useDriverRidesFeed.js` - Driver ride feed management
- `useNewRidesSubscription.js` - Real-time ride updates
- `useRideRealtime.js` - Real-time ride status
- `useRideStatus.js`, `useRideCompletion.js` - Ride lifecycle
- `useCancelRide.js` - Ride cancellation logic
- `useNotifications.js` - Notification management
- `useNetworkStatus.js` - Network connectivity monitoring
- `usePWAInstall.js` - PWA installation prompt
- `useProfileCompletion.js`, `useProfileSwitch.js` - Profile management
- `useActiveRideLoginNotifier.js` - Login notifications

### Utilities (`src/utils/`)

Helper functions and utilities:

- `pricingCalculator.js` - Fare calculation
- `earningsCalculator.js` - Driver earnings
- `locationServices.js` - Location utilities
- `recurringRides.js`, `rideSeries.js` - Recurring trip logic
- `rideProgress.js` - Ride progress tracking
- `serviceTypes.js` - Service type definitions
- `offers.js` - Offer management
- `driverMatching.js`, `driverCompletion.js` - Driver logic
- `errandTasks.js` - Errand task utilities
- `navigation.js` - Navigation helpers
- `networkDetection.js` - Network status detection
- `versionManager.js` - App version management
- `cn.js` - Tailwind class merging utility

### Library (`src/lib/`)

Core library code:

- `supabase.js` - Supabase client configuration
- `auth.js` - Authentication utilities
- `database.js` - Database helpers
- `routing.js` - Routing utilities
- `typeConversion.js` - Data type conversions

### Pages (`src/pages/`)

Top-level page components:

- `Login.jsx`, `Register.jsx` - Authentication pages
- `ModeSelection.jsx` - User mode selection
- `operator/` - Operator pages (dashboard, fleet, drivers, profile)
- `status/` - Status pages for different user types

### Configuration (`src/config/`)

- `profileAvailability.js` - Profile availability settings

### Styles (`src/styles/`)

- `tailwind.css` - Tailwind imports and custom CSS

## Supabase Directory (`supabase/`)

### Migrations (`supabase/migrations/`)

Database schema changes in chronological order:

- Timestamped SQL files (format: `YYYYMMDDHHMMSS_description.sql`)
- Includes table creation, RPC functions, triggers, indexes
- Recent migrations focus on recurring trips, notifications, and ride filtering

### Edge Functions (`supabase/functions/`)

Serverless functions:

- `push-notification-handler/` - FCM push notification delivery
- `accept-offer/` - Offer acceptance logic
- `expire-rides/` - Ride expiration cron job
- `generate-recurring-rides/` - Recurring ride generation
- `cleanup-stale-locations/` - Location cleanup

### SQL (`supabase/sql/`)

Reusable SQL scripts:

- `rls_policies.sql` - Row Level Security policies
- `add_number_of_trips_column.sql` - Schema updates

## Public Directory (`public/`)

Static assets served directly:

- `index.html` - HTML entry point (generated)
- `manifest.json` - PWA manifest
- `sw.js` - Service worker (generated by Vite PWA)
- `icons/` - App icons for various sizes
- `assets/` - Static assets
- `.htaccess`, `_redirects`, `vercel.json` - Deployment configs
- `clear-auth.html`, `clear-cache.html` - Utility pages

## Naming Conventions

### File Organization
- Group by feature/domain, not by type
- Keep related components together
- Use index files for clean exports

### Component Files
- One component per file
- File name matches component name
- Co-locate styles, tests, and related utilities

### Import Order (Recommended)
1. React and external libraries
2. Internal components
3. Hooks
4. Services and utilities
5. Stores
6. Styles and assets

### Dashboard Structure Pattern
```
dashboards/[role]/
  ├── components/          # Role-specific components
  ├── pages/              # Role-specific pages
  └── [Role]Dashboard.jsx # Main dashboard component
```

## Key Architectural Decisions

1. **Feature-based organization** - Components grouped by feature domain
2. **Separation of concerns** - Clear boundaries between UI, state, services, and utilities
3. **Shared components** - Reusable UI in `components/ui/` and `dashboards/shared/`
4. **Role-based dashboards** - Separate dashboard implementations per user type
5. **Service layer** - Business logic isolated from components
6. **Custom hooks** - Reusable logic extracted into hooks
7. **Zustand stores** - Global state management with clear domain boundaries
