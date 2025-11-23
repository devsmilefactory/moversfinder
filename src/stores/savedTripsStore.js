import { createCRUDStore } from './createCRUDStore';
import { supabase } from '../lib/supabase';

/**
 * Saved Trips Store
 * Manages saved trip templates for quick rebooking
 */
const useSavedTripsStore = createCRUDStore({
  name: 'SavedTripsStore',
  tableName: 'saved_trips',
  itemsKey: 'savedTrips',
  loadingKey: 'savedTripsLoading',
  errorKey: 'savedTripsError',
  orderBy: { column: 'usage_count', ascending: false },
  customActions: (set, get) => ({
    // Override create to add default fields
    createSavedTrip: async (tripData) => {
      try {
        const { data, error } = await supabase
          .from('saved_trips')
          .insert([{
            ...tripData,
            usage_count: 0,
            last_used: null,
            created_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (error) throw error;

        set((state) => ({
          savedTrips: [data, ...state.savedTrips],
        }));

        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    // Increment usage count
    incrementUsageCount: async (tripId) => {
      try {
        const trip = get().savedTrips.find((t) => t.id === tripId);
        if (!trip) return { success: false, error: 'Trip not found' };

        const updates = {
          usage_count: trip.usage_count + 1,
          last_used: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('saved_trips')
          .update(updates)
          .eq('id', tripId)
          .select()
          .single();

        if (error) throw error;

        set((state) => ({
          savedTrips: state.savedTrips.map((t) =>
            t.id === tripId ? data : t
          ),
        }));

        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    // Get trips by service type
    getTripsByService: (serviceType) => {
      return get().savedTrips.filter((trip) => trip.service_type === serviceType);
    },

    // Get most used trips
    getMostUsedTrips: (limit = 5) => {
      return [...get().savedTrips]
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, limit);
    },
  }),
});

export default useSavedTripsStore;

