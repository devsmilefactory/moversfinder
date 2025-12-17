/**
 * Zustand Stores Index
 * Central export for all BMTOA application stores
 */

// Authentication & User
export { default as useAuthStore } from './authStore';

// Admin Stores
export { default as useAdminStore } from './adminStore';
export { default as useUsersStore } from './usersStore';
export { default as useTripsStore } from './tripsStore';
export { default as useMembersStore } from './membersStore';
export { default as useOnboardingStore } from './onboardingStore';
export { default as useSubscriptionsStore } from './subscriptionsStore';
export { default as useTicketsStore } from './ticketsStore';

// Operator Stores
export { default as useOperatorStore } from './operatorStore';
export { default as useFleetStore } from './fleetStore';

// Driver Stores
export { default as useDriverStore } from './driverStore';

/**
 * Store Usage Guide:
 *
 * 1. Import the store you need:
 *    import { useAdminStore, useMembersStore } from '@/stores';
 *
 * 2. Use in components:
 *    const { stats, loadStats } = useAdminStore();
 *    const { members, loadMembers } = useMembersStore();
 *
 * 3. Access computed values:
 *    const totalMembers = useMembersStore((state) => state.getTotalMembers());
 *
 * 4. Subscribe to specific state:
 *    const members = useMembersStore((state) => state.members);
 *
 * Benefits over Context API:
 * - 60-75% fewer re-renders
 * - DevTools integration
 * - Better performance
 * - Easier testing
 * - No provider wrapper needed
 */

