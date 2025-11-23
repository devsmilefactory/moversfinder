import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Billing Store (Corporate)
 * Manages billing, transactions, invoices, and payment methods
 */
const useBillingStore = create(
  devtools(
    (set, get) => ({
      // State
      transactions: [],
      invoices: [],
      paymentMethods: [],
      billingLoading: false,
      billingError: null,

      // Actions
      loadTransactions: async (companyId) => {
        set({ billingLoading: true, billingError: null });
        try {
          // TODO: Replace with Supabase query
          // const { data, error } = await supabase
          //   .from('transactions')
          //   .select('*')
          //   .eq('company_id', companyId)
          //   .order('created_at', { ascending: false });

          // Mock data for development
          const mockTransactions = [
            {
              id: 'txn-1',
              companyId: companyId,
              rideId: 'ride-1',
              amount: 15,
              currency: 'USD',
              type: 'ride',
              status: 'completed',
              paymentMethod: 'ecocash',
              description: 'Taxi ride - Main St to Business Ave',
              createdAt: '2024-01-15T11:00:00Z',
              department: 'Sales',
              passengerName: 'John Smith',
            },
            {
              id: 'txn-2',
              companyId: companyId,
              rideId: 'ride-2',
              amount: 10,
              currency: 'USD',
              type: 'courier',
              status: 'pending',
              paymentMethod: 'card',
              description: 'Package delivery - Documents',
              createdAt: '2024-01-20T14:00:00Z',
              department: 'Marketing',
              passengerName: 'Sarah Johnson',
            },
            {
              id: 'txn-3',
              companyId: companyId,
              rideId: null,
              amount: 500,
              currency: 'USD',
              type: 'subscription',
              status: 'completed',
              paymentMethod: 'bank_transfer',
              description: 'Monthly subscription - January 2024',
              createdAt: '2024-01-01T00:00:00Z',
              department: null,
              passengerName: null,
            },
          ];

          set({ transactions: mockTransactions, billingLoading: false });
          return { success: true, data: mockTransactions };
        } catch (error) {
          set({ billingError: error.message, billingLoading: false });
          return { success: false, error: error.message };
        }
      },

      loadInvoices: async (companyId) => {
        set({ billingLoading: true, billingError: null });
        try {
          // TODO: Replace with Supabase query
          // const { data, error } = await supabase
          //   .from('invoices')
          //   .select('*')
          //   .eq('company_id', companyId)
          //   .order('created_at', { ascending: false });

          // Mock data for development
          const mockInvoices = [
            {
              id: 1,
              companyId: companyId,
              invoiceNumber: 'INV-2025-001',
              date: '2025-01-01',
              dueDate: '2025-01-15',
              amount: 1250.00,
              totalAmount: 1250.00,
              status: 'paid',
              paidDate: '2025-01-05',
              paymentMethod: 'Bank Transfer',
              rides: 45,
              period: 'December 2024',
              description: 'Monthly corporate rides',
              createdAt: '2025-01-01T00:00:00Z',
            },
            {
              id: 2,
              companyId: companyId,
              invoiceNumber: 'INV-2025-002',
              date: '2025-01-02',
              dueDate: '2025-01-16',
              amount: 890.50,
              totalAmount: 890.50,
              status: 'unpaid',
              paidDate: null,
              paymentMethod: null,
              rides: 32,
              period: 'Week 1 - January 2025',
              description: 'Weekly corporate rides',
              createdAt: '2025-01-02T00:00:00Z',
            },
            {
              id: 3,
              companyId: companyId,
              invoiceNumber: 'INV-2024-052',
              date: '2024-12-20',
              dueDate: '2025-01-03',
              amount: 2100.00,
              totalAmount: 2100.00,
              status: 'overdue',
              paidDate: null,
              paymentMethod: null,
              rides: 78,
              period: 'November 2024',
              description: 'Monthly corporate rides',
              createdAt: '2024-12-20T00:00:00Z',
            },
          ];

          set({ invoices: mockInvoices, billingLoading: false });
          return { success: true, data: mockInvoices };
        } catch (error) {
          set({ billingError: error.message, billingLoading: false });
          return { success: false, error: error.message };
        }
      },

      loadPaymentMethods: async (companyId) => {
        set({ billingLoading: true, billingError: null });
        try {
          // TODO: Replace with Supabase query
          // const { data, error } = await supabase
          //   .from('payment_methods')
          //   .select('*')
          //   .eq('company_id', companyId);

          // Mock data for development
          const mockPaymentMethods = [
            {
              id: 'pm-1',
              companyId: companyId,
              type: 'ecocash',
              name: 'EcoCash Business',
              details: '+263 77 123 4567',
              isDefault: true,
              status: 'active',
              createdAt: '2024-01-01T10:00:00Z',
            },
            {
              id: 'pm-2',
              companyId: companyId,
              type: 'card',
              name: 'Corporate Visa',
              details: '**** **** **** 1234',
              isDefault: false,
              status: 'active',
              createdAt: '2024-01-01T10:00:00Z',
            },
          ];

          set({ paymentMethods: mockPaymentMethods, billingLoading: false });
          return { success: true, data: mockPaymentMethods };
        } catch (error) {
          set({ billingError: error.message, billingLoading: false });
          return { success: false, error: error.message };
        }
      },

      createPaymentMethod: async (paymentMethodData) => {
        try {
          const newPaymentMethod = {
            ...paymentMethodData,
            id: `pm-${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: 'active',
          };

          set((state) => ({
            paymentMethods: [...state.paymentMethods, newPaymentMethod],
          }));
          return { success: true, data: newPaymentMethod };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      deletePaymentMethod: async (paymentMethodId) => {
        try {
          set((state) => ({
            paymentMethods: state.paymentMethods.filter((pm) => pm.id !== paymentMethodId),
          }));
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      setDefaultPaymentMethod: async (paymentMethodId) => {
        try {
          set((state) => ({
            paymentMethods: state.paymentMethods.map((pm) => ({
              ...pm,
              isDefault: pm.id === paymentMethodId,
            })),
          }));
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      // Computed selectors
      getMonthlySpend: (month) => {
        const transactions = get().transactions.filter(
          (t) => t.createdAt.startsWith(month) && t.status === 'completed'
        );
        return transactions.reduce((sum, t) => sum + t.amount, 0);
      },

      getCurrentMonthSpend: () => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        return get().getMonthlySpend(currentMonth);
      },

      getDepartmentSpending: () => {
        const transactions = get().transactions.filter((t) => t.department);
        const spending = {};
        
        transactions.forEach((t) => {
          if (!spending[t.department]) {
            spending[t.department] = 0;
          }
          spending[t.department] += t.amount;
        });

        return spending;
      },

      getSavings: () => {
        // Calculate savings (20% discount on bulk)
        const totalSpend = get().getCurrentMonthSpend();
        return totalSpend * 0.2;
      },

      getInvoiceStats: () => {
        const invoices = get().invoices;
        return {
          total: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
          paid: invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0),
          unpaid: invoices.filter(i => i.status === 'unpaid').reduce((sum, inv) => sum + inv.totalAmount, 0),
          overdue: invoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + inv.totalAmount, 0),
        };
      },

      payInvoice: async (invoiceId, paymentMethod) => {
        try {
          // TODO: Replace with Supabase update
          // await supabase
          //   .from('invoices')
          //   .update({ status: 'paid', paidDate: new Date().toISOString(), paymentMethod })
          //   .eq('id', invoiceId);

          set((state) => ({
            invoices: state.invoices.map((inv) =>
              inv.id === invoiceId
                ? { ...inv, status: 'paid', paidDate: new Date().toISOString(), paymentMethod }
                : inv
            ),
          }));
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      clearError: () => set({ billingError: null }),
    }),
    { name: 'BillingStore' }
  )
);

export default useBillingStore;

