import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useTicketsStore = create(
  devtools(
    (set) => ({
      tickets: [],
      ticketsLoading: false,
      ticketsError: null,

      loadTickets: async () => {
        set({ ticketsLoading: true, ticketsError: null });
        try {
          // TODO: Supabase query
          set({ tickets: [], ticketsLoading: false });
        } catch (error) {
          set({ ticketsError: error.message, ticketsLoading: false });
        }
      },
    }),
    { name: 'BMTOA Tickets Store' }
  )
);

export default useTicketsStore;

