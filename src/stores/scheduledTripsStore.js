import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

/**
 * Scheduled Trips Store (Corporate)
 * Manages recurring and scheduled trips
 * Uses scheduled_trips table from Supabase
 */
const useScheduledTripsStore = create(
  devtools(
    (set, get) => ({
      // State
      scheduledTrips: [],
      scheduledTripsLoading: false,
      scheduledTripsError: null,

      // Actions
      loadScheduledTrips: async (companyId) => {
        set({ scheduledTripsLoading: true, scheduledTripsError: null });
        try {
          // Query scheduled_trips table with passenger details
          const { data, error } = await supabase
            .from('scheduled_trips')
            .select(`
              *,
              passenger:corporate_passengers(
                id,
                name,
                email,
                phone,
                passenger_type,
                department
              )
            `)
            .eq('user_id', companyId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Transform data to match expected format
          const scheduledTrips = (data || []).map(trip => ({
            id: trip.id,
            companyId: trip.user_id,
            name: trip.name,
            serviceType: trip.service_type,
            scheduleType: trip.recurrence_pattern,
            status: trip.status,
            pickupLocation: trip.pickup_location,
            dropoffLocation: trip.dropoff_location,
            additionalStops: trip.additional_stops || [],
            tripTime: trip.trip_time,
            passengers: trip.passengers_count,
            passengerName: trip.passenger_name,
            passengerId: trip.passenger_id,
            passengerType: trip.passenger_type,
            department: trip.passenger?.department,
            estimatedCost: parseFloat(trip.estimated_cost || 0),
            paymentMethod: trip.payment_method,
            specialInstructions: trip.special_instructions,
            recurrencePattern: trip.recurrence_pattern,
            recurrenceDays: trip.recurrence_days,
            startDate: trip.start_date,
            endDate: trip.end_date,
            specificDates: trip.specific_dates,
            createdAt: trip.created_at,
            updatedAt: trip.updated_at,
            totalOccurrences: trip.total_occurrences,
            completedOccurrences: trip.completed_occurrences,
            cancelledOccurrences: trip.cancelled_occurrences,
          }));

          set({ scheduledTrips, scheduledTripsLoading: false });
          return { success: true, data: scheduledTrips };
        } catch (error) {
          console.error('Load scheduled trips error:', error);
          set({ scheduledTripsError: error.message, scheduledTripsLoading: false, scheduledTrips: [] });
          return { success: false, error: error.message };
        }
      },

      createScheduledTrip: async (tripData) => {
        try {
          const { data, error } = await supabase
            .from('scheduled_trips')
            .insert([{
              user_id: tripData.companyId,
              name: tripData.name,
              service_type: tripData.serviceType,
              pickup_location: tripData.pickupLocation,
              pickup_lat: tripData.pickupLat,
              pickup_lng: tripData.pickupLng,
              dropoff_location: tripData.dropoffLocation,
              dropoff_lat: tripData.dropoffLat,
              dropoff_lng: tripData.dropoffLng,
              additional_stops: tripData.additionalStops || [],
              recurrence_pattern: tripData.recurrencePattern,
              recurrence_days: tripData.recurrenceDays,
              trip_time: tripData.tripTime,
              start_date: tripData.startDate,
              end_date: tripData.endDate,
              specific_dates: tripData.specificDates,
              passenger_id: tripData.passengerId,
              passenger_name: tripData.passengerName,
              passenger_type: tripData.passengerType,
              passengers_count: tripData.passengers || 1,
              estimated_cost: tripData.estimatedCost,
              payment_method: tripData.paymentMethod || 'corporate_account',
              special_instructions: tripData.specialInstructions,
              status: 'active',
              platform: 'taxicab',
            }])
            .select()
            .single();

          if (error) throw error;

          // Transform and add to state
          const newTrip = {
            id: data.id,
            companyId: data.user_id,
            name: data.name,
            serviceType: data.service_type,
            scheduleType: data.recurrence_pattern,
            status: data.status,
            pickupLocation: data.pickup_location,
            dropoffLocation: data.dropoff_location,
            additionalStops: data.additional_stops || [],
            tripTime: data.trip_time,
            passengers: data.passengers_count,
            passengerName: data.passenger_name,
            passengerId: data.passenger_id,
            passengerType: data.passenger_type,
            estimatedCost: parseFloat(data.estimated_cost || 0),
            paymentMethod: data.payment_method,
            specialInstructions: data.special_instructions,
            recurrencePattern: data.recurrence_pattern,
            recurrenceDays: data.recurrence_days,
            startDate: data.start_date,
            endDate: data.end_date,
            specificDates: data.specific_dates,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            totalOccurrences: data.total_occurrences,
            completedOccurrences: data.completed_occurrences,
            cancelledOccurrences: data.cancelled_occurrences,
          };

          set((state) => ({
            scheduledTrips: [newTrip, ...state.scheduledTrips],
          }));
          return { success: true, data: newTrip };
        } catch (error) {
          console.error('Create scheduled trip error:', error);
          return { success: false, error: error.message };
        }
      },

      updateScheduledTrip: async (tripId, updates) => {
        try {
          const { error } = await supabase
            .from('scheduled_trips')
            .update({
              name: updates.name,
              service_type: updates.serviceType,
              pickup_location: updates.pickupLocation,
              dropoff_location: updates.dropoffLocation,
              additional_stops: updates.additionalStops,
              recurrence_pattern: updates.recurrencePattern,
              recurrence_days: updates.recurrenceDays,
              trip_time: updates.tripTime,
              start_date: updates.startDate,
              end_date: updates.endDate,
              specific_dates: updates.specificDates,
              passenger_id: updates.passengerId,
              passenger_name: updates.passengerName,
              passenger_type: updates.passengerType,
              passengers_count: updates.passengers,
              estimated_cost: updates.estimatedCost,
              payment_method: updates.paymentMethod,
              special_instructions: updates.specialInstructions,
              status: updates.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tripId);

          if (error) throw error;

          set((state) => ({
            scheduledTrips: state.scheduledTrips.map((trip) =>
              trip.id === tripId
                ? { ...trip, ...updates, updatedAt: new Date().toISOString() }
                : trip
            ),
          }));
          return { success: true };
        } catch (error) {
          console.error('Update scheduled trip error:', error);
          return { success: false, error: error.message };
        }
      },

      deleteScheduledTrip: async (tripId, deleteType = 'single') => {
        try {
          if (deleteType === 'series') {
            const { error } = await supabase
              .from('scheduled_trips')
              .delete()
              .eq('id', tripId);

            if (error) throw error;

            set((state) => ({
              scheduledTrips: state.scheduledTrips.filter((trip) => trip.id !== tripId),
            }));
          } else {
            // For single occurrence, just mark as cancelled
            const { error } = await supabase
              .from('scheduled_trips')
              .update({ status: 'cancelled', updated_at: new Date().toISOString() })
              .eq('id', tripId);

            if (error) throw error;

            set((state) => ({
              scheduledTrips: state.scheduledTrips.map((trip) =>
                trip.id === tripId ? { ...trip, status: 'cancelled' } : trip
              ),
            }));
          }
          return { success: true };
        } catch (error) {
          console.error('Delete scheduled trip error:', error);
          return { success: false, error: error.message };
        }
      },

      pauseScheduledTrip: async (tripId) => {
        try {
          const { error } = await supabase
            .from('scheduled_trips')
            .update({ status: 'paused', updated_at: new Date().toISOString() })
            .eq('id', tripId);

          if (error) throw error;

          set((state) => ({
            scheduledTrips: state.scheduledTrips.map((trip) =>
              trip.id === tripId ? { ...trip, status: 'paused' } : trip
            ),
          }));
          return { success: true };
        } catch (error) {
          console.error('Pause scheduled trip error:', error);
          return { success: false, error: error.message };
        }
      },

      resumeScheduledTrip: async (tripId) => {
        try {
          const { error } = await supabase
            .from('scheduled_trips')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', tripId);

          if (error) throw error;

          set((state) => ({
            scheduledTrips: state.scheduledTrips.map((trip) =>
              trip.id === tripId ? { ...trip, status: 'active' } : trip
            ),
          }));
          return { success: true };
        } catch (error) {
          console.error('Resume scheduled trip error:', error);
          return { success: false, error: error.message };
        }
      },

      // Computed selectors
      getActiveScheduledTrips: () => {
        return get().scheduledTrips.filter((trip) => trip.status === 'active');
      },

      getScheduledTripsByPassenger: (passengerId) => {
        return get().scheduledTrips.filter((trip) => trip.passengerId === passengerId);
      },

      getScheduledTripsByServiceType: (serviceType) => {
        return get().scheduledTrips.filter((trip) => trip.serviceType === serviceType);
      },

      getTotalScheduledTrips: () => {
        return get().scheduledTrips.length;
      },

      clearError: () => set({ scheduledTripsError: null }),
    }),
    { name: 'ScheduledTripsStore' }
  )
);

export default useScheduledTripsStore;

