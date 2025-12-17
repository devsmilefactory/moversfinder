import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useSubscriptionsStore = create(
  devtools(
    (set) => ({
      subscriptions: [],
      subscriptionsLoading: false,
      subscriptionsError: null,

      loadSubscriptions: async () => {
        set({ subscriptionsLoading: true, subscriptionsError: null });
        try {
          // TODO: Supabase query
          set({ subscriptions: [], subscriptionsLoading: false });
        } catch (error) {
          set({ subscriptionsError: error.message, subscriptionsLoading: false });
        }
      },
    }),
    { name: 'BMTOA Subscriptions Store' }
  )
);

export default useSubscriptionsStore;

