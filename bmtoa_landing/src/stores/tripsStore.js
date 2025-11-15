import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Trips Store
 * Manages all trips/rides across both platforms
 * Used by Admin dashboard
 */
const useTripsStore = create(
  devtools(
    (set, get) => ({
      // State
      trips: [],
      tripsLoading: false,
      tripsError: null,

      // Actions
      loadTrips: async (platform = 'all') => {
        set({ tripsLoading: true, tripsError: null });
        try {
          // TODO: Replace with Supabase query
          // const query = supabase.from('rides').select('*');
          // if (platform !== 'all') {
          //   query.eq('platform_id', platform);
          // }
          // const { data, error } = await query.order('created_at', { ascending: false });

          set({ trips: [], tripsLoading: false });
        } catch (error) {
          set({ tripsError: error.message, tripsLoading: false });
        }
      },
    }),
    { name: 'BMTOA Trips Store' }
  )
);

export default useTripsStore;

