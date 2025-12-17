import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

// Helper function to send low balance alert
const sendLowBalanceAlert = async (companyId, currentBalance, threshold) => {
  try {
    // Get company details
    const { data: companyData, error: companyError } = await supabase
      .from('corporate_profiles')
      .select('user_id, company_name, email, contact_person')
      .eq('user_id', companyId)
      .single();

    if (companyError) throw companyError;

    // Get profile email if not in corporate_profiles
    let email = companyData.email;
    if (!email) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', companyId)
        .single();

      email = profileData?.email;
    }

    if (!email) {
      console.error('No email found for company:', companyId);
      return;
    }

    // Call edge function to send email
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        emailType: 'low_balance_alert',
        data: {
          email: email,
          companyName: companyData.company_name,
          currentBalance: currentBalance,
          threshold: threshold
        }
      }
    });

    if (emailError) {
      console.error('Error sending low balance alert:', emailError);
    } else {
      console.log(`✅ Low balance alert sent to ${companyData.company_name} (${email})`);
    }
  } catch (error) {
    console.error('Error in sendLowBalanceAlert:', error);
  }
};

/**
 * Rides Store
 * Manages all ride bookings (individual and corporate)
 */
const useRidesStore = create(
  devtools(
    (set, get) => ({
      // State
      rides: [],
      ridesLoading: false,
      ridesError: null,

      // Actions
      loadRides: async (userId, userType = 'individual') => {
        set({ ridesLoading: true, ridesError: null });
        try {
          const { data, error } = await supabase
            .from('rides')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          set({ rides: data || [], ridesLoading: false });
          return { success: true, data: data || [] };
        } catch (error) {
          set({ ridesError: error.message, ridesLoading: false });
          return { success: false, error: error.message };
        }
      },

      createRide: async (rideData) => {
        try {
          const { data, error } = await supabase
            .from('rides')
            .insert([{
              ...rideData,
              ride_status: 'pending',
              status: 'pending',
              payment_status: 'pending',
              created_at: new Date().toISOString(),
            }])
            .select()
            .single();

          if (error) throw error;

          set((state) => ({ rides: [data, ...state.rides] }));
          return { success: true, data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      updateRide: async (rideId, updates) => {
        try {
          const { data, error } = await supabase
            .from('rides')
            .update({
              ...updates,
              updated_at: new Date().toISOString(),
            })
            .eq('id', rideId)
            .select()
            .single();

          if (error) throw error;

          set((state) => ({
            rides: state.rides.map((ride) =>
              ride.id === rideId ? data : ride
            ),
          }));
          return { success: true, data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      cancelRide: async (rideId) => {
        try {
          const { data, error } = await supabase
            .from('rides')
            .update({
              ride_status: 'cancelled',
              status: 'cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', rideId)
            .select()
            .single();

          if (error) throw error;

          set((state) => ({
            rides: state.rides.map((ride) =>
              ride.id === rideId ? data : ride
            ),
          }));
          return { success: true, data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      deleteRide: async (rideId) => {
        try {
          const { error } = await supabase
            .from('rides')
            .delete()
            .eq('id', rideId);

          if (error) throw error;

          set((state) => ({
            rides: state.rides.filter((ride) => ride.id !== rideId),
          }));
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      // Computed selectors
      getScheduledRides: () => {
        return get().rides.filter((ride) =>
          ride.ride_status === 'pending' && ride.scheduled_datetime
        );
      },

      getRidesByStatus: (status) => {
        return get().rides.filter((ride) => ride.ride_status === status);
      },

      getRidesByServiceType: (serviceType) => {
        return get().rides.filter((ride) => ride.service_type === serviceType);
      },

      getTotalRides: () => {
        return get().rides.length;
      },

      // Stats calculations
      getMonthlyRidesCount: () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return get().rides.filter((ride) => {
          const rideDate = new Date(ride.created_at);
          return rideDate.getMonth() === currentMonth && rideDate.getFullYear() === currentYear;
        }).length;
      },

      getTotalSpent: () => {
        return get().rides
          .filter((ride) => ride.ride_status === 'trip_completed')
          .reduce((sum, ride) => sum + (parseFloat(ride.fare) || 0), 0);
      },

      getUpcomingRidesCount: () => {
        return get().rides.filter((ride) =>
          ride.ride_status === 'pending' && ride.scheduled_datetime
        ).length;
      },

      // Mock stats for UI (TODO: Replace with real data from backend)
      getAverageResponseTime: () => {
        return 3; // Mock: 3 minutes average response time
      },

      getAvailableDriversCount: () => {
        return 24; // Mock: 24 drivers online
      },

      // Ride Status Management
      updateRideStatus: async (rideId, newStatus, userId, notes = null) => {
        try {
          const ride = get().rides.find(r => r.id === rideId);
          if (!ride) throw new Error('Ride not found');

          const oldStatus = ride.ride_status;

          const mappedStatus = newStatus === 'completed' ? 'trip_completed' : newStatus === 'in_progress' ? 'trip_started' : newStatus;

          // Update ride status
          const { data: rideData, error: rideError } = await supabase
            .from('rides')
            .update({
              ride_status: mappedStatus,
              status: mappedStatus,
              updated_at: new Date().toISOString(),
              ...(mappedStatus === 'trip_started' && { trip_started_at: new Date().toISOString() }),
              ...(mappedStatus === 'trip_completed' && {
                trip_completed_at: new Date().toISOString(),
                payment_status: 'paid' // Mark as paid when completed
              }),
              ...(newStatus.includes('cancelled') && {
                cancelled_at: new Date().toISOString(),
                cancelled_by: newStatus === 'cancelled_by_client' ? 'client' : 'driver'
              }),
            })
            .eq('id', rideId)
            .select()
            .single();

          if (rideError) throw rideError;

          // If trip is completed and payment method is account_balance, deduct from balance
          if (mappedStatus === 'trip_completed' && rideData.payment_method === 'account_balance' && rideData.company_id) {
            try {
              // Get current balance and threshold
              const { data: companyData, error: companyError } = await supabase
                .from('corporate_profiles')
                .select('credit_balance, low_balance_threshold')
                .eq('user_id', rideData.company_id)
                .single();

              if (companyError) throw companyError;

              const currentBalance = parseFloat(companyData.credit_balance || 0);
              const tripCost = parseFloat(rideData.fare || 0);
              const newBalance = currentBalance - tripCost;
              const threshold = parseFloat(companyData.low_balance_threshold || 100);

              // Update balance
              const { error: balanceError } = await supabase
                .from('corporate_profiles')
                .update({ credit_balance: newBalance })
                .eq('user_id', rideData.company_id);

              if (balanceError) throw balanceError;

              // Check if balance is below threshold and send alert
              if (newBalance <= threshold && currentBalance > threshold) {
                // Balance just dropped below threshold, send alert
                console.log(`⚠️ Low balance detected for company ${rideData.company_id}: $${newBalance.toFixed(2)}`);
                sendLowBalanceAlert(rideData.company_id, newBalance, threshold);
              }

              // Create transaction record
              const { error: transactionError } = await supabase
                .from('credit_transactions')
                .insert({
                  company_id: rideData.company_id,
                  transaction_type: 'deduction',
                  amount: tripCost,
                  balance_before: currentBalance,
                  balance_after: newBalance,
                  reference_type: 'ride',
                  reference_id: rideId,
                  description: `Trip payment: ${rideData.pickup_location} to ${rideData.dropoff_location}`,
                  created_by: userId,
                  platform: rideData.platform || 'taxicab'
                });

              if (transactionError) {
                console.error('Failed to create transaction record:', transactionError);
              }

              console.log(`✅ Account balance deducted: $${tripCost.toFixed(2)} (New balance: $${newBalance.toFixed(2)})`);
            } catch (balanceError) {
              console.error('Failed to deduct account balance:', balanceError);
              // Don't fail the whole operation if balance deduction fails
            }
          }

          // Record status change in history
          const { error: historyError } = await supabase
            .from('ride_status_history')
            .insert([{
              ride_id: rideId,
              old_status: oldStatus,
              new_status: mappedStatus,
              changed_by: userId,
              notes: notes,
            }]);

          if (historyError) console.error('Failed to record status history:', historyError);

          set((state) => ({
            rides: state.rides.map((ride) =>
              ride.id === rideId ? rideData : ride
            ),
          }));

          return { success: true, data: rideData };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      updateDriverStatus: async (rideId, driverStatus) => {
        try {
          const { data, error } = await supabase
            .from('rides')
            .update({
              driver_status: driverStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', rideId)
            .select()
            .single();

          if (error) throw error;

          set((state) => ({
            rides: state.rides.map((ride) =>
              ride.id === rideId ? data : ride
            ),
          }));

          return { success: true, data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      // Ride Offers Management
      loadRideOffers: async (rideId) => {
        try {
          const { data, error } = await supabase
            .from('ride_offers')
            .select('*, driver:profiles!driver_id(*)')
            .eq('ride_id', rideId)
            .order('offered_at', { ascending: false });

          if (error) throw error;

          return { success: true, data: data || [] };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      createRideOffer: async (offerData) => {
        try {
          // Basic validations
          const price = Number(offerData?.quoted_price || 0);
          if (!offerData?.ride_id || !offerData?.driver_id) {
            return { success: false, error: 'Missing ride_id or driver_id' };
          }
          if (!Number.isFinite(price) || price <= 0) {
            return { success: false, error: 'Quoted price must be greater than 0' };
          }

          // Prevent duplicate pending offers by the same driver for the same ride
          const { data: existing, error: existErr } = await supabase
            .from('ride_offers')
            .select('id')
            .eq('ride_id', offerData.ride_id)
            .eq('driver_id', offerData.driver_id)
            .eq('offer_status', 'pending');
          if (existErr) throw existErr;
          if (existing && existing.length > 0) {
            return { success: false, error: 'You already have a pending offer for this ride' };
          }

          const { data, error } = await supabase
            .from('ride_offers')
            .insert([{
              ...offerData,
              quoted_price: price,
              offer_status: 'pending',
              offered_at: new Date().toISOString(),
            }])
            .select()
            .single();

          if (error) throw error;

          return { success: true, data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      acceptRideOffer: async (offerId, rideId, userId) => {
        try {
          // Get the offer details
          const { data: offer, error: offerError } = await supabase
            .from('ride_offers')
            .select('*')
            .eq('id', offerId)
            .single();

          if (offerError) throw offerError;

          // Update the accepted offer
          const { error: acceptError } = await supabase
            .from('ride_offers')
            .update({
              offer_status: 'accepted',
              responded_at: new Date().toISOString(),
            })
            .eq('id', offerId);

          if (acceptError) throw acceptError;

          // Reject all other offers for this ride
          const { error: rejectError } = await supabase
            .from('ride_offers')
            .update({
              offer_status: 'rejected',
              responded_at: new Date().toISOString(),
            })
            .eq('ride_id', rideId)
            .neq('id', offerId);

          if (rejectError) console.error('Failed to reject other offers:', rejectError);

          // Update ride with driver assignment
          const { data: rideData, error: rideError } = await supabase
            .from('rides')
            .update({
              driver_id: offer.driver_id,
              ride_status: 'accepted',
              fare: offer.quoted_price,
              updated_at: new Date().toISOString(),
            })
            .eq('id', rideId)
            .select()
            .single();

          if (rideError) throw rideError;

          // Record status change
          await supabase
            .from('ride_status_history')
            .insert([{
              ride_id: rideId,
              old_status: 'receiving_offers',
              new_status: 'accepted',
              changed_by: userId,
              notes: `Accepted offer from driver ${offer.driver_id}`,
            }]);

          set((state) => ({
            rides: state.rides.map((ride) =>
              ride.id === rideId ? rideData : ride
            ),
          }));

          return { success: true, data: rideData };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      getRideStatusHistory: async (rideId) => {
        try {
          const { data, error } = await supabase
            .from('ride_status_history')
            .select('*, changed_by_user:profiles!changed_by(*)')
            .eq('ride_id', rideId)
            .order('changed_at', { ascending: true });

          if (error) throw error;

          return { success: true, data: data || [] };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      clearError: () => set({ ridesError: null }),
    }),
    { name: 'RidesStore' }
  )
);

export default useRidesStore;


