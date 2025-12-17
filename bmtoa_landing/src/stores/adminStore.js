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
      pendingActions: {
        driverVerifications: 0,
        supportTickets: 0,
        paymentVerifications: 0,
        memberRequests: 0,
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
            .in('platform', ['taxicab', 'both'])
            .gte('created_at', startOfMonth);

          if (ridesError) throw ridesError;

          // Calculate monthly revenue (sum of fares for completed rides)
          const { data: revenueData, error: revenueError } = await supabase
            .from('rides')
            .select('fare')
            .in('platform', ['taxicab', 'both'])
            .eq('ride_status', 'trip_completed')
            .eq('payment_status', 'paid')
            .gte('created_at', startOfMonth);

          if (revenueError) throw revenueError;

          const monthlyRevenue = (revenueData || []).reduce((sum, ride) => sum + parseFloat(ride.fare || 0), 0);
          const commission = monthlyRevenue * 0.15; // 15% commission

          // Count pending bookings
          const { count: pendingCount, error: pendingError } = await supabase
            .from('rides')
            .select('*', { count: 'exact', head: true })
            .in('platform', ['taxicab', 'both'])
            .eq('ride_status', 'pending');

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

          // Count operators (use operator or taxi_operator)
          const { count: operatorsCount, error: operatorsError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .in('user_type', ['taxi_operator', 'operator'])
            .in('platform', ['bmtoa', 'both'])
            .eq('account_status', 'active');

          if (operatorsError) throw operatorsError;

          // Count drivers
          const { count: driversCount, error: driversError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('user_type', 'driver')
            .in('platform', ['bmtoa', 'both'])
            .eq('account_status', 'active');

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

          // Count pending onboarding requests (check operator_profiles and driver_profiles)
          const { count: operatorPendingCount, error: operatorPendingError } = await supabase
            .from('operator_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('approval_status', 'pending');

          if (operatorPendingError) throw operatorPendingError;

          const { count: driverPendingCount, error: driverPendingError } = await supabase
            .from('driver_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('approval_status', 'pending');

          if (driverPendingError) throw driverPendingError;

          const pendingCount = (operatorPendingCount || 0) + (driverPendingCount || 0);

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

      loadPendingActions: async () => {
        try {
          // Count pending driver verifications
          const { count: driverVerifications, error: driverError } = await supabase
            .from('driver_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('approval_status', 'pending');

          if (driverError) throw driverError;

          // Count open support tickets
          const { count: supportTickets, error: ticketsError } = await supabase
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .in('status', ['open', 'in_progress']);

          if (ticketsError) throw ticketsError;

          // Count pending payment verifications
          const { count: paymentVerifications, error: paymentsError } = await supabase
            .from('payment_proofs')
            .select('*', { count: 'exact', head: true })
            .eq('verification_status', 'pending');

          if (paymentsError) throw paymentsError;

          // Count pending member requests
          const { count: memberRequests, error: memberError } = await supabase
            .from('operator_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('approval_status', 'pending');

          if (memberError) throw memberError;

          set({
            pendingActions: {
              driverVerifications: driverVerifications || 0,
              supportTickets: supportTickets || 0,
              paymentVerifications: paymentVerifications || 0,
              memberRequests: memberRequests || 0,
            }
          });
        } catch (error) {
          console.error('Error loading pending actions:', error);
        }
      },

      loadAllStats: async () => {
        await Promise.all([
          get().loadTaxiCabStats(),
          get().loadBMTOAStats(),
          get().loadPendingActions(),
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

