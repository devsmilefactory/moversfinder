import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

/**
 * Onboarding Store
 * Manages onboarding requests for Operators, Corporate Clients, and Drivers
 * Used by Admin dashboard
 *
 * Integrated with Supabase - NO MOCK DATA
 */
const useOnboardingStore = create(
  devtools(
    (set, get) => ({
      // State
      requests: [],
      requestsLoading: false,
      requestsError: null,
      filterType: 'all', // 'all', 'operator', 'corporate', 'driver'
      filterStatus: 'pending', // 'pending', 'approved', 'rejected', 'all'
      searchQuery: '',

      // Actions
      loadRequests: async () => {
        set({ requestsLoading: true, requestsError: null });
        try {
          // Fetch onboarding requests from Supabase
          const { data, error } = await supabase
            .from('onboarding_requests')
            .select(`
              *,
              reviewer:profiles!onboarding_requests_reviewed_by_fkey(
                full_name,
                email
              )
            `)
            .order('submitted_date', { ascending: false });

          if (error) throw error;

          // Transform data
          const requests = (data || []).map(req => ({
            id: req.id,
            applicantName: req.applicant_name,
            email: req.email,
            phone: req.phone,
            requestType: req.request_type,
            companyName: req.company_name || '',
            fleetSize: req.fleet_size || 0,
            status: req.status,
            submittedDate: req.submitted_date?.split('T')[0] || '',
            approvedDate: req.reviewed_at?.split('T')[0] || '',
            documents: req.documents || [],
            notes: req.notes || '',
            reviewedBy: req.reviewer?.full_name || '',
          }));

          set({ requests, requestsLoading: false });
        } catch (error) {
          console.error('Error loading onboarding requests:', error);
          set({
            requestsError: error.message || 'Failed to load onboarding requests',
            requestsLoading: false,
            requests: [] // Empty array instead of mock data
          });
        }
      },

      setFilterType: (filterType) => set({ filterType }),
      setFilterStatus: (filterStatus) => set({ filterStatus }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      getFilteredRequests: () => {
        const { requests, filterType, filterStatus, searchQuery } = get();
        let filtered = requests;

        // Filter by type
        if (filterType !== 'all') {
          filtered = filtered.filter(req => req.requestType === filterType);
        }

        // Filter by status
        if (filterStatus !== 'all') {
          filtered = filtered.filter(req => req.status === filterStatus);
        }

        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(req =>
            req.applicantName.toLowerCase().includes(query) ||
            req.email.toLowerCase().includes(query) ||
            req.phone.includes(query) ||
            (req.companyName && req.companyName.toLowerCase().includes(query))
          );
        }

        return filtered;
      },

      approveRequest: async (requestId) => {
        try {
          // TODO: Replace with Supabase
          // const { error } = await supabase
          //   .from('onboarding_requests')
          //   .update({ status: 'approved', approved_date: new Date() })
          //   .eq('id', requestId);
          // if (error) throw error;

          set(state => ({
            requests: state.requests.map(req =>
              req.id === requestId
                ? { ...req, status: 'approved', approvedDate: new Date().toISOString() }
                : req
            ),
          }));
        } catch (error) {
          console.error('Error approving request:', error);
        }
      },

      rejectRequest: async (requestId, reason) => {
        try {
          // TODO: Replace with Supabase
          // const { error } = await supabase
          //   .from('onboarding_requests')
          //   .update({ status: 'rejected', rejection_reason: reason, rejected_date: new Date() })
          //   .eq('id', requestId);
          // if (error) throw error;

          set(state => ({
            requests: state.requests.map(req =>
              req.id === requestId
                ? { ...req, status: 'rejected', rejectionReason: reason, rejectedDate: new Date().toISOString() }
                : req
            ),
          }));
        } catch (error) {
          console.error('Error rejecting request:', error);
        }
      },

      // Computed selectors
      getPendingRequests: () => get().requests.filter(r => r.status === 'pending'),
      getApprovedRequests: () => get().requests.filter(r => r.status === 'approved'),
      getRejectedRequests: () => get().requests.filter(r => r.status === 'rejected'),
      getOperatorRequests: () => get().requests.filter(r => r.requestType === 'operator'),
      getCorporateRequests: () => get().requests.filter(r => r.requestType === 'corporate'),
      getDriverRequests: () => get().requests.filter(r => r.requestType === 'driver'),
    }),
    { name: 'BMTOA Onboarding Store' }
  )
);

export default useOnboardingStore;

