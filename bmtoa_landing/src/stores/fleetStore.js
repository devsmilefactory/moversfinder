import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useFleetStore = create(
  devtools(
    (set) => ({
      vehicles: [],
      vehiclesLoading: false,
      vehiclesError: null,

      loadVehicles: async (operatorId) => {
        set({ vehiclesLoading: true, vehiclesError: null });
        try {
          // TODO: Supabase query
          set({ vehicles: [], vehiclesLoading: false });
        } catch (error) {
          set({ vehiclesError: error.message, vehiclesLoading: false });
        }
      },
    }),
    { name: 'BMTOA Fleet Store' }
  )
);

export default useFleetStore;

