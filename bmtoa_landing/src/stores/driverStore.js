import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

/**
 * Driver Store - Manages all driver-related data and operations
 *
 * Supabase Tables Used:
 * - profiles: User profile data
 * - driver_profiles: Driver-specific data
 * - rides: Ride bookings and history
 * - documents: Driver documents
 * - payments: Earnings and payouts
 * - support_tickets: Support requests
 * - notifications: Driver notifications
 */

const useDriverStore = create(
  devtools(
    (set, get) => ({
      // State
      driverProfile: null,
      stats: null,
      activeRequests: [],
      earnings: null,
      rides: [],
      payouts: [],
      documents: [],
      performance: null,
      schedule: null,
      supportTickets: [],
      loading: false,
      error: null,

      // Dashboard Data - Loads all data needed for main dashboard
      loadDashboardData: async (userId) => {
        set({ loading: true, error: null });
        try {
          // Fetch driver profile with user profile data
          const { data: profile, error: profileError } = await supabase
            .from('driver_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (profileError) throw profileError;

          // Fetch user profile separately
          const { data: userProfile, error: userProfileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (userProfileError) throw userProfileError;

          // Fetch today's stats
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const { data: todayRides, error: ridesError } = await supabase
            .from('rides')
            .select('*')
            .eq('driver_id', profile.id)
            .eq('status', 'completed')
            .gte('created_at', today.toISOString());

          if (ridesError) throw ridesError;

          // Calculate stats
          const todayEarnings = todayRides?.reduce((sum, ride) => sum + (parseFloat(ride.fare) || 0), 0) || 0;
          const todayTrips = todayRides?.length || 0;
          const todayDistance = todayRides?.reduce((sum, ride) => sum + (parseFloat(ride.distance) || 0), 0) || 0;

          // Fetch active ride requests (pending rides assigned to this driver)
          const { data: requests, error: requestsError } = await supabase
            .from('rides')
            .select('*')
            .eq('driver_id', profile.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

          if (requestsError) throw requestsError;

          // Fetch customer names for requests
          const requestsWithCustomers = await Promise.all(
            (requests || []).map(async (request) => {
              const { data: customer } = await supabase
                .from('profiles')
                .select('name, phone')
                .eq('id', request.user_id)
                .single();
              return { ...request, customer_name: customer?.name, customer_phone: customer?.phone };
            })
          );

          // Fetch driver documents
          const { data: docs, error: docsError } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', userId);

          if (docsError) throw docsError;

          set({
            driverProfile: {
              ...profile,
              ...userProfile,
              documents: docs
            },
            stats: {
              todayEarnings,
              todayTrips,
              todayDistance,
              weekEarnings: 0, // TODO: Calculate week earnings
              monthEarnings: 0, // TODO: Calculate month earnings
              averageRating: 0, // TODO: Calculate from ride ratings
              onlineTime: '0h 0m', // TODO: Calculate from session data
            },
            activeRequests: requestsWithCustomers || [],
            loading: false,
          });
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Earnings - Load earnings data
      loadEarnings: async (userId) => {
        set({ loading: true, error: null });
        try {
          const { data: profile } = await supabase
            .from('driver_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (!profile) throw new Error('Driver profile not found');

          // Fetch all completed rides
          const { data: allRides, error: ridesError } = await supabase
            .from('rides')
            .select('*')
            .eq('driver_id', profile.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false });

          if (ridesError) throw ridesError;

          // Calculate earnings by period
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          const todayEarnings = allRides
            ?.filter(r => new Date(r.created_at) >= todayStart)
            .reduce((sum, r) => sum + (parseFloat(r.fare) || 0), 0) || 0;

          const weekEarnings = allRides
            ?.filter(r => new Date(r.created_at) >= weekStart)
            .reduce((sum, r) => sum + (parseFloat(r.fare) || 0), 0) || 0;

          const monthEarnings = allRides
            ?.filter(r => new Date(r.created_at) >= monthStart)
            .reduce((sum, r) => sum + (parseFloat(r.fare) || 0), 0) || 0;

          const totalEarnings = allRides?.reduce((sum, r) => sum + (parseFloat(r.fare) || 0), 0) || 0;

          set({
            earnings: {
              today: todayEarnings,
              week: weekEarnings,
              month: monthEarnings,
              total: totalEarnings,
              available: totalEarnings, // TODO: Subtract paid out amounts
              pending: 0, // TODO: Calculate from pending rides
            },
            loading: false,
          });
        } catch (error) {
          console.error('Error loading earnings:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Load Ride History
      loadRideHistory: async (userId, filters = {}) => {
        set({ loading: true, error: null });
        try {
          const { data: profile } = await supabase
            .from('driver_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (!profile) throw new Error('Driver profile not found');

          let query = supabase
            .from('rides')
            .select('*')
            .eq('driver_id', profile.id)
            .order('created_at', { ascending: false });

          if (filters.limit) {
            query = query.limit(filters.limit);
          }

          if (filters.status) {
            query = query.eq('status', filters.status);
          }

          const { data, error } = await query;

          if (error) throw error;

          set({ rides: data || [], loading: false });
        } catch (error) {
          console.error('Error loading ride history:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Load Payouts
      loadPayouts: async (userId) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          set({ payouts: data || [], loading: false });
        } catch (error) {
          console.error('Error loading payouts:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Request Payout
      requestPayout: async (amount, paymentMethod) => {
        set({ loading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data, error } = await supabase
            .from('payments')
            .insert({
              user_id: user.id,
              amount,
              payment_method: paymentMethod,
              status: 'pending',
            })
            .select()
            .single();

          if (error) throw error;

          // Reload payouts
          await get().loadPayouts(user.id);

          set({ loading: false });
          return data;
        } catch (error) {
          console.error('Error requesting payout:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Accept Ride Request
      acceptRideRequest: async (rideId) => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase
            .from('rides')
            .update({
              status: 'accepted',
              driver_status: 'accepted'
            })
            .eq('id', rideId);

          if (error) throw error;

          // Remove from active requests
          set(state => ({
            activeRequests: state.activeRequests.filter(r => r.id !== rideId),
            loading: false,
          }));
        } catch (error) {
          console.error('Error accepting ride:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Decline Ride Request
      declineRideRequest: async (rideId) => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase
            .from('rides')
            .update({
              status: 'cancelled',
              driver_status: 'declined',
              cancelled_by: 'driver'
            })
            .eq('id', rideId);

          if (error) throw error;

          // Remove from active requests
          set(state => ({
            activeRequests: state.activeRequests.filter(r => r.id !== rideId),
            loading: false,
          }));
        } catch (error) {
          console.error('Error declining ride:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Load Documents
      loadDocuments: async (userId) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          set({ documents: data || [], loading: false });
        } catch (error) {
          console.error('Error loading documents:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Upload Document
      uploadDocument: async (userId, documentType, file, expiryDate = null) => {
        set({ loading: true, error: null });
        try {
          // Upload file to Supabase Storage (upload_photos bucket)
          const fileExt = file.name.split('.').pop();
          const fileName = `documents/${userId}/${documentType}_${Date.now()}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('upload_photos')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('upload_photos')
            .getPublicUrl(fileName);

          // Save document record
          const { data, error } = await supabase
            .from('documents')
            .insert({
              user_id: userId,
              document_type: documentType,
              document_url: publicUrl,
              expiry_date: expiryDate,
              status: 'pending',
            })
            .select()
            .single();

          if (error) throw error;

          // Reload documents
          await get().loadDocuments(userId);

          set({ loading: false });
          return data;
        } catch (error) {
          console.error('Error uploading document:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Load Support Tickets
      loadSupportTickets: async (userId) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          set({ supportTickets: data || [], loading: false });
        } catch (error) {
          console.error('Error loading support tickets:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Create Support Ticket
      createSupportTicket: async (userId, subject, category, priority, description) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('support_tickets')
            .insert({
              user_id: userId,
              subject,
              category,
              priority,
              description,
              status: 'open',
            })
            .select()
            .single();

          if (error) throw error;

          // Reload tickets
          await get().loadSupportTickets(userId);

          set({ loading: false });
          return data;
        } catch (error) {
          console.error('Error creating support ticket:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // Update Driver Profile
      updateDriverProfile: async (userId, profileData) => {
        set({ loading: true, error: null });
        try {
          // Update driver_profiles table
          const { data: driverProfile, error: driverError } = await supabase
            .from('driver_profiles')
            .update(profileData)
            .eq('user_id', userId)
            .select()
            .single();

          if (driverError) throw driverError;

          // Fetch documents to check completion
          const { data: userDocuments } = await supabase
            .from('documents')
            .select('document_type, status')
            .eq('user_id', userId);

          // Calculate profile completion
          const requiredFields = [
            'full_name', 'date_of_birth', 'national_id', 'license_number',
            'license_expiry', 'license_class', 'vehicle_make', 'vehicle_model',
            'vehicle_year', 'vehicle_color', 'license_plate'
          ];

          // Required documents (7 total)
          const requiredDocuments = [
            'drivers_license', 'psv_license', 'vehicle_registration',
            'insurance', 'roadworthy', 'police_clearance', 'medical_certificate'
          ];

          // Count approved documents
          const approvedDocs = userDocuments?.filter(doc =>
            requiredDocuments.includes(doc.document_type) && doc.status === 'approved'
          ).length || 0;

          // At least one payment method required (bank OR ecocash)
          const hasPaymentMethod = driverProfile.bank_name || driverProfile.ecocash_number;

          const filledFields = requiredFields.filter(field => driverProfile[field]).length;

          // Total: 11 fields + 1 payment method + 7 documents = 19 items
          const totalRequired = requiredFields.length + 1 + requiredDocuments.length;
          const totalFilled = filledFields + (hasPaymentMethod ? 1 : 0) + approvedDocs;
          const completionPercentage = Math.round((totalFilled / totalRequired) * 100);
          const completionStatus = completionPercentage === 100 ? 'complete' :
                                   completionPercentage >= 50 ? 'partial' : 'incomplete';

          // Update profiles table with completion status
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              profile_completion_percentage: completionPercentage,
              profile_completion_status: completionStatus,
              profile_completed_at: completionPercentage === 100 ? new Date().toISOString() : null
            })
            .eq('id', userId);

          if (profileError) throw profileError;

          // Reload dashboard data
          await get().loadDashboardData(userId);

          set({ loading: false });
          return driverProfile;
        } catch (error) {
          console.error('Error updating driver profile:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },
    }),
    { name: 'BMTOA Driver Store' }
  )
);

export default useDriverStore;

