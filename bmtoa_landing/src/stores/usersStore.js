import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

/**
 * Users Store
 * Manages TaxiCab platform users (Individual + Corporate)
 * Used by Admin dashboard
 *
 * Integrated with Supabase - NO MOCK DATA
 */
const useUsersStore = create(
  devtools(
    (set, get) => ({
      // State
      users: [],
      usersLoading: false,
      usersError: null,
      filterType: 'all', // 'all', 'individual', 'corporate'
      searchQuery: '',

      // Actions
      loadUsers: async (platform = 'taxicab') => {
        set({ usersLoading: true, usersError: null });
        try {
          // Fetch users from Supabase
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('platform', platform)
            .in('user_type', ['individual', 'corporate'])
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Transform data
          const users = (data || []).map(user => ({
            id: user.id,
            name: user.full_name || 'Unknown',
            email: user.email || '',
            phone: user.phone || '',
            userType: user.user_type,
            status: 'active', // TODO: Add status field to profiles table
            totalRides: 0, // TODO: Calculate from rides table
            totalSpent: 0, // TODO: Calculate from rides table
            joinedDate: user.created_at?.split('T')[0] || '',
            lastActive: user.updated_at?.split('T')[0] || '',
            tier: user.user_type === 'corporate' ? 'standard' : undefined,
          }));

          set({ users, usersLoading: false });
        } catch (error) {
          console.error('Error loading users:', error);
          set({
            usersError: error.message || 'Failed to load users',
            usersLoading: false,
            users: [] // Empty array instead of mock data
          });
        }
      },

      setFilterType: (filterType) => set({ filterType }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      getFilteredUsers: () => {
        const { users, filterType, searchQuery } = get();
        let filtered = users;

        // Filter by type
        if (filterType !== 'all') {
          filtered = filtered.filter(user => user.userType === filterType);
        }

        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(user =>
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.phone.includes(query)
          );
        }

        return filtered;
      },

      getUserById: (userId) => {
        return get().users.find(user => user.id === userId);
      },

      updateUserStatus: async (userId, status) => {
        try {
          // Update in Supabase
          const { error } = await supabase
            .from('profiles')
            .update({
              updated_at: new Date().toISOString()
              // TODO: Add status field to profiles table
            })
            .eq('id', userId);

          if (error) throw error;

          // Update local state
          set(state => ({
            users: state.users.map(user =>
              user.id === userId ? { ...user, status } : user
            ),
          }));
        } catch (error) {
          console.error('Error updating user status:', error);
        }
      },

      // Computed selectors
      getTotalUsers: () => get().users.length,
      getActiveUsers: () => get().users.filter(u => u.status === 'active').length,
      getIndividualUsers: () => get().users.filter(u => u.userType === 'individual').length,
      getCorporateUsers: () => get().users.filter(u => u.userType === 'corporate').length,
    }),
    { name: 'BMTOA Users Store' }
  )
);

export default useUsersStore;

