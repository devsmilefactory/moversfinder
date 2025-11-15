import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

/**
 * Members Store
 * Manages BMTOA members (Operators + Drivers)
 * Used by Admin dashboard
 *
 * Integrated with Supabase - NO MOCK DATA
 */
const useMembersStore = create(
  devtools(
    (set, get) => ({
      // State
      members: [],
      membersLoading: false,
      membersError: null,
      filterType: 'all', // 'all', 'operator', 'driver'
      searchQuery: '',

      // Actions
      loadMembers: async () => {
        set({ membersLoading: true, membersError: null });
        try {
          // Fetch operators from Supabase
          const { data: operatorsData, error: opError } = await supabase
            .from('operators')
            .select(`
              *,
              profile:profiles!operators_user_id_fkey(
                id,
                email,
                full_name,
                phone,
                created_at
              ),
              membership:memberships!memberships_user_id_fkey(
                membership_tier,
                status,
                bmtoa_member_number
              )
            `)
            .order('created_at', { ascending: false });

          if (opError) throw opError;

          // Fetch drivers from Supabase
          const { data: driversData, error: driverError } = await supabase
            .from('profiles')
            .select(`
              *,
              membership:memberships!memberships_user_id_fkey(
                membership_tier,
                status,
                bmtoa_member_number
              )
            `)
            .eq('user_type', 'driver')
            .eq('platform', 'bmtoa')
            .order('created_at', { ascending: false });

          if (driverError) throw driverError;

          // Transform operators data
          const operators = (operatorsData || []).map(op => ({
            id: op.id,
            name: op.company_name || op.profile?.full_name || 'Unknown',
            email: op.contact_email || op.profile?.email || '',
            phone: op.contact_phone || op.profile?.phone || '',
            memberType: 'operator',
            membershipTier: op.membership_tier || op.membership?.membership_tier || 'basic',
            status: op.membership?.status || 'active',
            fleetSize: op.fleet_size || 0,
            totalDrivers: 0, // TODO: Calculate from driver_operator_assignments
            monthlyRevenue: 0, // TODO: Calculate from rides
            joinedDate: op.created_at?.split('T')[0] || '',
            subscriptionStatus: op.membership?.status || 'active',
            bmtoaVerified: op.bmtoa_verified || false,
          }));

          // Transform drivers data
          const drivers = (driversData || []).map(driver => ({
            id: driver.id,
            name: driver.full_name || 'Unknown',
            email: driver.email || '',
            phone: driver.phone || '',
            memberType: 'driver',
            membershipTier: driver.membership?.membership_tier || 'basic',
            status: driver.membership?.status || 'active',
            vehicleType: 'Sedan', // TODO: Get from assigned vehicle
            totalRides: 0, // TODO: Calculate from rides table
            rating: 0, // TODO: Calculate from ride ratings
            earnings: 0, // TODO: Calculate from rides
            joinedDate: driver.created_at?.split('T')[0] || '',
            subscriptionStatus: driver.membership?.status || 'active',
          }));

          // Combine and set members
          const allMembers = [...operators, ...drivers];
          set({ members: allMembers, membersLoading: false });
        } catch (error) {
          console.error('Error loading members:', error);
          set({
            membersError: error.message || 'Failed to load members',
            membersLoading: false,
            members: [] // Empty array instead of mock data
          });
        }
      },

      setFilterType: (filterType) => set({ filterType }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      getFilteredMembers: () => {
        const { members, filterType, searchQuery } = get();
        let filtered = members;

        // Filter by type
        if (filterType !== 'all') {
          filtered = filtered.filter(member => member.memberType === filterType);
        }

        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(member =>
            member.name.toLowerCase().includes(query) ||
            member.email.toLowerCase().includes(query) ||
            member.phone.includes(query)
          );
        }

        return filtered;
      },

      getMemberById: (memberId) => {
        return get().members.find(member => member.id === memberId);
      },

      updateMemberStatus: async (memberId, status) => {
        try {
          // TODO: Replace with Supabase
          // Determine if operator or driver and update appropriate table
          set(state => ({
            members: state.members.map(member =>
              member.id === memberId ? { ...member, status } : member
            ),
          }));
        } catch (error) {
          console.error('Error updating member status:', error);
        }
      },

      // Computed selectors
      getTotalMembers: () => get().members.length,
      getActiveMembers: () => get().members.filter(m => m.status === 'active').length,
      getOperators: () => get().members.filter(m => m.memberType === 'operator'),
      getDrivers: () => get().members.filter(m => m.memberType === 'driver'),
      getTotalFleetSize: () => {
        return get().members
          .filter(m => m.memberType === 'operator')
          .reduce((sum, m) => sum + (m.fleetSize || 0), 0);
      },
      getTotalRevenue: () => {
        return get().members
          .filter(m => m.memberType === 'operator')
          .reduce((sum, m) => sum + (m.monthlyRevenue || 0), 0);
      },
    }),
    { name: 'BMTOA Members Store' }
  )
);

export default useMembersStore;

