# Tech Stack

## Core Technologies

- **Framework**: React 18 with Vite
- **Language**: JavaScript (JSX)
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand (with devtools and persist middleware)
- **Routing**: React Router v6
- **Backend**: Supabase (PostgreSQL + Real-time + Edge Functions)
- **PWA**: Vite PWA Plugin with Workbox

## Key Libraries

- **UI Components**: Radix UI primitives, Lucide React icons, Framer Motion
- **Forms**: React Hook Form
- **Maps**: @vis.gl/react-google-maps (Google Maps API)
- **Data Visualization**: Recharts, D3
- **Date Handling**: date-fns
- **HTTP Client**: Axios
- **Utilities**: clsx, tailwind-merge, class-variance-authority

## Build System

- **Bundler**: Vite 4.x
- **Dev Server**: Port 4030 (configured in vite.config.mjs)
- **Output Directory**: `build/`
- **PWA Strategy**: Network-first with minimal caching for real-time data

## Common Commands

```bash
# Development
npm run dev              # Start dev server on port 4030

# Production Build
npm run build            # Build for production
npm run preview          # Preview production build locally

# Code Quality
npm run lint             # Run ESLint on src/

# Post-build
npm run postbuild        # Verify build (runs automatically after build)
```

## Supabase Commands

```bash
# Database Migrations
supabase db push                    # Apply migrations to remote
supabase db push --linked           # Apply to linked project

# Edge Functions
supabase functions deploy <name>    # Deploy specific function
supabase functions logs <name>      # View function logs
supabase secrets set KEY=value      # Set environment secrets
```

## Environment Variables

Required variables in `.env` (see `.env.example`):

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `VITE_PLATFORM_ID` - Platform identifier (default: 'taxicab')
- Firebase config variables for push notifications (see NOTIFICATION_SYSTEM_SETUP.md)

## Architecture Patterns

### State Management
- Zustand stores for global state (auth, rides, profiles, etc.)
- Custom hooks for component-level logic
- Store pattern: `src/stores/[feature]Store.js`

### API Layer
- Supabase client in `src/lib/supabase.js`
- Service layer in `src/services/` for business logic
- RPC functions for complex database operations

### Real-time Features
- Supabase real-time subscriptions for live updates
- Custom hooks (e.g., `useRideRealtime`, `useNewRidesSubscription`)
- Network-first strategy to prioritize fresh data

### PWA Configuration
- Service worker with Workbox (network-first strategy)
- Manual registration via PWAUpdateNotification component
- Offline detection with graceful degradation
- Version management in `src/utils/versionManager.js`

## Code Style Conventions

- **Components**: PascalCase (e.g., `ActiveRideCard.jsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useActiveRideCheck.js`)
- **Stores**: camelCase with `Store` suffix (e.g., `authStore.js`)
- **Services**: camelCase with service type suffix (e.g., `notificationService.js`)
- **Utilities**: camelCase (e.g., `pricingCalculator.js`)
- **File extensions**: `.jsx` for React components, `.js` for utilities/services

## Database Conventions

- **Migrations**: Timestamped format `YYYYMMDDHHMMSS_description.sql`
- **RPC Functions**: snake_case (e.g., `get_driver_rides`, `accept_driver_bid`)
- **Tables**: snake_case plural (e.g., `rides`, `notifications`, `profiles`)
- **Columns**: snake_case (e.g., `user_id`, `created_at`, `fcm_token`)

## Testing

- Test files: `__tests__/` subdirectories within feature folders
- Test file naming: `[feature].test.js`
- Currently minimal test coverage - tests not required by default
