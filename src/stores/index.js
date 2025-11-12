/**
 * Zustand Stores Index
 * Central export for all application stores
 */

// Authentication & User
export { default as useAuthStore } from './authStore';

// Rides & Bookings
export { default as useRidesStore } from './ridesStore';

// Individual User Stores
export { default as useSavedTripsStore } from './savedTripsStore';
export { default as useSavedPlacesStore } from './savedPlacesStore';
export { default as usePaymentMethodsStore } from './paymentMethodsStore';

// Corporate User Stores
export { default as usePassengersStore } from './passengersStore';
export { default as useBillingStore } from './billingStore';
export { default as useScheduledTripsStore } from './scheduledTripsStore';

/**
 * Store Usage Guide:
 *
 * 1. Import the store you need:
 *    import { useAuthStore, useRidesStore, useSavedTripsStore } from '@/stores';
 *
 * 2. Use in components:
 *    const { user, login, logout } = useAuthStore();
 *    const { rides, loadRides, createRide } = useRidesStore();
 *    const { savedTrips, loadSavedTrips } = useSavedTripsStore();
 *
 * 3. Access computed values:
 *    const totalRides = useRidesStore((state) => state.getTotalRides());
 *
 * 4. Subscribe to specific state:
 *    const rides = useRidesStore((state) => state.rides);
 *
 * Benefits over Context API:
 * - 60-75% fewer re-renders
 * - DevTools integration
 * - Better performance
 * - Easier testing
 * - No provider wrapper needed
 */

