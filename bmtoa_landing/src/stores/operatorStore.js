import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useOperatorStore = create(
  devtools(
    (set) => ({
      operatorData: null,
      operatorLoading: false,
      operatorError: null,

      loadOperatorData: async (operatorId) => {
        set({ operatorLoading: true, operatorError: null });
        try {
          // TODO: Supabase query
          set({ operatorData: null, operatorLoading: false });
        } catch (error) {
          set({ operatorError: error.message, operatorLoading: false });
        }
      },
    }),
    { name: 'BMTOA Operator Store' }
  )
);

export default useOperatorStore;

