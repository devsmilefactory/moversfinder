import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Payment Methods Store
 * Manages user payment methods (EcoCash, Cards, Bank Accounts)
 */
const usePaymentMethodsStore = create(
  devtools(
    (set, get) => ({
      // State
      paymentMethods: [],
      paymentMethodsLoading: false,
      paymentMethodsError: null,

      // Actions
      loadPaymentMethods: async (userId) => {
        set({ paymentMethodsLoading: true, paymentMethodsError: null });
        try {
          // TODO: Replace with Supabase query
          // const { data, error } = await supabase
          //   .from('payment_methods')
          //   .select('*')
          //   .eq('user_id', userId)
          //   .order('is_default', { ascending: false });

          // Mock data for development
          const mockPaymentMethods = [
            {
              id: 'pm-1',
              userId: userId,
              type: 'ecocash',
              phoneNumber: '+263 77 123 4567',
              isDefault: true,
              isVerified: true,
              createdAt: '2023-06-01T10:00:00Z',
              lastUsed: '2024-01-15T10:00:00Z',
            },
            {
              id: 'pm-2',
              userId: userId,
              type: 'card',
              cardNumber: '**** **** **** 1234',
              cardType: 'Visa',
              expiryDate: '12/25',
              cardholderName: 'John Doe',
              isDefault: false,
              isVerified: true,
              createdAt: '2023-07-15T10:00:00Z',
              lastUsed: '2024-01-10T14:00:00Z',
            },
            {
              id: 'pm-3',
              userId: userId,
              type: 'bank',
              bankName: 'FBC Bank',
              accountNumber: '**** **** 5678',
              accountHolderName: 'John Doe',
              isDefault: false,
              isVerified: true,
              createdAt: '2023-08-01T10:00:00Z',
              lastUsed: '2023-12-20T09:00:00Z',
            },
          ];

          set({ paymentMethods: mockPaymentMethods, paymentMethodsLoading: false });
          return { success: true, data: mockPaymentMethods };
        } catch (error) {
          set({ paymentMethodsError: error.message, paymentMethodsLoading: false });
          return { success: false, error: error.message };
        }
      },

      createPaymentMethod: async (methodData) => {
        try {
          // TODO: Replace with Supabase insert
          // const { data, error } = await supabase
          //   .from('payment_methods')
          //   .insert([methodData])
          //   .select();

          // Mask sensitive data
          let maskedData = { ...methodData };
          if (methodData.cardNumber) {
            maskedData.cardNumber = `**** **** **** ${methodData.cardNumber.slice(-4)}`;
          }
          if (methodData.accountNumber) {
            maskedData.accountNumber = `**** **** ${methodData.accountNumber.slice(-4)}`;
          }

          const newMethod = {
            id: `pm-${Date.now()}`,
            ...maskedData,
            isDefault: get().paymentMethods.length === 0, // First method is default
            isVerified: false, // Requires verification
            createdAt: new Date().toISOString(),
            lastUsed: null,
          };

          set((state) => ({
            paymentMethods: [newMethod, ...state.paymentMethods],
          }));

          return { success: true, data: newMethod };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      updatePaymentMethod: async (methodId, updates) => {
        try {
          // TODO: Replace with Supabase update
          // const { data, error } = await supabase
          //   .from('payment_methods')
          //   .update(updates)
          //   .eq('id', methodId)
          //   .select();

          set((state) => ({
            paymentMethods: state.paymentMethods.map((method) =>
              method.id === methodId ? { ...method, ...updates } : method
            ),
          }));

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      deletePaymentMethod: async (methodId) => {
        try {
          const method = get().paymentMethods.find((m) => m.id === methodId);
          if (method?.isDefault && get().paymentMethods.length > 1) {
            return {
              success: false,
              error: 'Cannot delete default payment method. Set another method as default first.',
            };
          }

          // TODO: Replace with Supabase delete
          // const { error } = await supabase
          //   .from('payment_methods')
          //   .delete()
          //   .eq('id', methodId);

          set((state) => ({
            paymentMethods: state.paymentMethods.filter((method) => method.id !== methodId),
          }));

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      setDefaultPaymentMethod: async (methodId) => {
        try {
          // TODO: Replace with Supabase transaction
          // 1. Unset current default
          // 2. Set new default

          set((state) => ({
            paymentMethods: state.paymentMethods.map((method) => ({
              ...method,
              isDefault: method.id === methodId,
            })),
          }));

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      updateLastUsed: async (methodId) => {
        try {
          const updates = { lastUsed: new Date().toISOString() };

          // TODO: Replace with Supabase update
          // const { error } = await supabase
          //   .from('payment_methods')
          //   .update(updates)
          //   .eq('id', methodId);

          set((state) => ({
            paymentMethods: state.paymentMethods.map((method) =>
              method.id === methodId ? { ...method, ...updates } : method
            ),
          }));

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      // Computed values
      getDefaultPaymentMethod: () => {
        return get().paymentMethods.find((method) => method.isDefault);
      },

      getVerifiedPaymentMethods: () => {
        return get().paymentMethods.filter((method) => method.isVerified);
      },

      getPaymentMethodsByType: (type) => {
        return get().paymentMethods.filter((method) => method.type === type);
      },

      clearError: () => set({ paymentMethodsError: null }),
    }),
    { name: 'PaymentMethodsStore' }
  )
);

export default usePaymentMethodsStore;

