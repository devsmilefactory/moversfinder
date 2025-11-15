import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

/**
 * Admin Store
 * Manages admin dashboard statistics and overview data
 * Handles both TaxiCab and BMTOA platform stats
 */
const useAdminStore = create(
  devtools(
    (set, get) => ({
      // State
      taxicabStats: {
        individualUsers: 0,
        corporateUsers: 0,
        totalUsers: 0,
        activeRides: 0,
        monthlyRevenue: 0,
        pendingBookings: 0,
      },
      bmtoaStats: {
        operators: 0,
        drivers: 0,
        totalMembers: 0,
        subscriptionRevenue: 0,
        pendingOnboarding: 0,
        activeFleet: 0,
      },
      ecosystemStats: {
        totalUsers: 0,
        activeDrivers: 0,
        totalRides: 0,
        totalRevenue: 0,
      },
      statsLoading: false,
      statsError: null,

      // Actions
      loadTaxiCabStats: async () => {
        set({ statsLoading: true, statsError: null });
        try {
          // Get start of current month
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

          // Count individual users
          const { count: individualCount, error: individualError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('user_type', 'individual')
            .eq('platform', 'taxicab');

          if (individualError) throw individualError;

          // Count corporate users
          const { count: corporateCount, error: corporateError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('user_type', 'corporate')
            .eq('platform', 'taxicab');

          if (corporateError) throw corporateError;

          // Count rides this month
          const { count: ridesCount, error: ridesError } = await supabase
            .from('rides')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'taxicab')
            .gte('created_at', startOfMonth);

          if (ridesError) throw ridesError;

          // Calculate monthly revenue (sum of fares for completed rides)
          const { data: revenueData, error: revenueError } = await supabase
            .from('rides')
            .select('fare')
            .eq('platform', 'taxicab')
            .eq('status', 'completed')
            .eq('payment_status', 'paid')
            .gte('created_at', startOfMonth);

          if (revenueError) throw revenueError;

          const monthlyRevenue = (revenueData || []).reduce((sum, ride) => sum + parseFloat(ride.fare || 0), 0);
          const commission = monthlyRevenue * 0.15; // 15% commission

          // Count pending bookings
          const { count: pendingCount, error: pendingError } = await supabase
            .from('rides')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'taxicab')
            .eq('status', 'pending');

          if (pendingError) throw pendingError;

          const taxicabStats = {
            individualUsers: individualCount || 0,
            corporateUsers: corporateCount || 0,
            totalUsers: (individualCount || 0) + (corporateCount || 0),
            activeRides: ridesCount || 0,
            monthlyRevenue: commission,
            pendingBookings: pendingCount || 0,
          };

          set({ taxicabStats, statsLoading: false });
          get().calculateEcosystemStats();
        } catch (error) {
          console.error('Error loading TaxiCab stats:', error);
          set({ statsError: error.message, statsLoading: false });
        }
      },

      loadBMTOAStats: async () => {
        set({ statsLoading: true, statsError: null });
        try {
          // Get start of current month
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

          // Count operators
          const { count: operatorsCount, error: operatorsError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('user_type', 'taxi_operator')
            .eq('platform', 'bmtoa')
            .eq('verification_status', 'verified');

          if (operatorsError) throw operatorsError;

          // Count drivers
          const { count: driversCount, error: driversError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('user_type', 'driver')
            .eq('platform', 'bmtoa')
            .eq('verification_status', 'verified');

          if (driversError) throw driversError;

          // Count active fleet (operator vehicles)
          const { count: fleetCount, error: fleetError } = await supabase
            .from('operator_vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('verified', true);

          if (fleetError) throw fleetError;

          // Calculate subscription revenue (from memberships table)
          const { data: subscriptionsData, error: subscriptionsError } = await supabase
            .from('memberships')
            .select('monthly_fee')
            .eq('status', 'active')
            .gte('created_at', startOfMonth);

          if (subscriptionsError) throw subscriptionsError;

          const subscriptionRevenue = (subscriptionsData || []).reduce((sum, sub) => sum + parseFloat(sub.monthly_fee || 0), 0);

          // Count pending onboarding requests
          const { count: pendingCount, error: pendingError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'bmtoa')
            .eq('verification_status', 'pending')
            .in('user_type', ['taxi_operator', 'driver']);

          if (pendingError) throw pendingError;

          const bmtoaStats = {
            operators: operatorsCount || 0,
            drivers: driversCount || 0,
            totalMembers: (operatorsCount || 0) + (driversCount || 0),
            subscriptionRevenue: subscriptionRevenue,
            pendingOnboarding: pendingCount || 0,
            activeFleet: fleetCount || 0,
          };

          set({ bmtoaStats, statsLoading: false });
          get().calculateEcosystemStats();
        } catch (error) {
          console.error('Error loading BMTOA stats:', error);
          set({ statsError: error.message, statsLoading: false });
        }
      },

      loadAllStats: async () => {
        await Promise.all([
          get().loadTaxiCabStats(),
          get().loadBMTOAStats(),
        ]);
      },

      calculateEcosystemStats: () => {
        const { taxicabStats, bmtoaStats } = get();
        const ecosystemStats = {
          totalUsers: taxicabStats.totalUsers + bmtoaStats.totalMembers,
          activeDrivers: bmtoaStats.drivers,
          totalRides: taxicabStats.activeRides,
          totalRevenue: taxicabStats.monthlyRevenue + bmtoaStats.subscriptionRevenue,
        };
        set({ ecosystemStats });
      },

      // Computed selectors
      getTotalRevenue: () => {
        const { taxicabStats, bmtoaStats } = get();
        return taxicabStats.monthlyRevenue + bmtoaStats.subscriptionRevenue;
      },

      getTotalUsers: () => {
        const { taxicabStats, bmtoaStats } = get();
        return taxicabStats.totalUsers + bmtoaStats.totalMembers;
      },

      getRevenueBreakdown: () => {
        const { taxicabStats, bmtoaStats } = get();
        const total = taxicabStats.monthlyRevenue + bmtoaStats.subscriptionRevenue;
        return {
          taxicab: {
            amount: taxicabStats.monthlyRevenue,
            percentage: (taxicabStats.monthlyRevenue / total) * 100,
          },
          bmtoa: {
            amount: bmtoaStats.subscriptionRevenue,
            percentage: (bmtoaStats.subscriptionRevenue / total) * 100,
          },
        };
      },
    }),
    { name: 'BMTOA Admin Store' }
  )
);

export default useAdminStore;

