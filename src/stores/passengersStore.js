import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

/**
 * Passengers Store (Corporate)
 * Manages employees and clients for corporate accounts
 * Renamed from "Employees" to support both employee and client types
 */
const usePassengersStore = create(
  devtools(
    (set, get) => ({
      // State
      passengers: [],
      passengersLoading: false,
      passengersError: null,

      // Actions
      loadPassengers: async (companyId) => {
        set({ passengersLoading: true, passengersError: null });
        try {
          const { data, error } = await supabase
            .from('corporate_passengers')
            .select('*')
            .eq('company_id', companyId)
            .eq('platform', 'taxicab')
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Transform data to match expected format
          const passengers = (data || []).map(passenger => ({
            id: passenger.id,
            companyId: passenger.company_id,
            type: passenger.passenger_type, // 'employee', 'client', 'student', 'group'
            passengerType: passenger.passenger_type, // Legacy field
            name: passenger.name,
            email: passenger.email,
            phone: passenger.phone,
            department: passenger.department,
            employeeId: passenger.employee_id,
            companyName: passenger.company_name,
            schoolName: passenger.school_name,
            grade: passenger.grade,
            parentName: passenger.parent_name,
            parentPhone: passenger.parent_phone,
            groupDescription: passenger.group_description,
            contactPerson: passenger.contact_person,
            contactPhone: passenger.contact_phone,
            contactEmail: passenger.contact_email,
            memberCount: passenger.member_count,
            status: passenger.status,
            avatar: passenger.avatar,
            notes: passenger.notes,
            createdAt: passenger.created_at,
            totalRides: passenger.total_rides,
            lastRideDate: passenger.last_ride_date,
          }));

          set({ passengers, passengersLoading: false });
          return { success: true, data: passengers };
        } catch (error) {
          console.error('Load passengers error:', error);
          set({ passengersError: error.message, passengersLoading: false, passengers: [] });
          return { success: false, error: error.message };
        }
      },

      createPassenger: async (passengerData) => {
        try {
          const { data, error } = await supabase
            .from('corporate_passengers')
            .insert([{
              company_id: passengerData.companyId,
              passenger_type: passengerData.passengerType,
              name: passengerData.name,
              email: passengerData.email,
              phone: passengerData.phone,
              employee_id: passengerData.employeeId,
              department: passengerData.department,
              company_name: passengerData.companyName,
              school_name: passengerData.schoolName,
              grade: passengerData.grade,
              parent_name: passengerData.parentName,
              parent_phone: passengerData.parentPhone,
              group_description: passengerData.groupDescription,
              contact_person: passengerData.contactPerson,
              contact_phone: passengerData.contactPhone,
              contact_email: passengerData.contactEmail,
              member_count: passengerData.memberCount,
              status: 'active',
              notes: passengerData.notes,
              platform: 'taxicab',
            }])
            .select()
            .single();

          if (error) throw error;

          const newPassenger = {
            id: data.id,
            companyId: data.company_id,
            type: data.passenger_type,
            passengerType: data.passenger_type,
            name: data.name,
            email: data.email,
            phone: data.phone,
            department: data.department,
            employeeId: data.employee_id,
            companyName: data.company_name,
            schoolName: data.school_name,
            grade: data.grade,
            parentName: data.parent_name,
            parentPhone: data.parent_phone,
            groupDescription: data.group_description,
            contactPerson: data.contact_person,
            contactPhone: data.contact_phone,
            contactEmail: data.contact_email,
            memberCount: data.member_count,
            status: data.status,
            avatar: data.avatar,
            notes: data.notes,
            createdAt: data.created_at,
            totalRides: data.total_rides,
            lastRideDate: data.last_ride_date,
          };

          set((state) => ({ passengers: [newPassenger, ...state.passengers] }));
          return { success: true, data: newPassenger };
        } catch (error) {
          console.error('Create passenger error:', error);
          return { success: false, error: error.message };
        }
      },

      updatePassenger: async (passengerId, updates) => {
        try {
          const { error } = await supabase
            .from('corporate_passengers')
            .update({
              name: updates.name,
              email: updates.email,
              phone: updates.phone,
              employee_id: updates.employeeId,
              department: updates.department,
              company_name: updates.companyName,
              school_name: updates.schoolName,
              grade: updates.grade,
              parent_name: updates.parentName,
              parent_phone: updates.parentPhone,
              group_description: updates.groupDescription,
              contact_person: updates.contactPerson,
              contact_phone: updates.contactPhone,
              contact_email: updates.contactEmail,
              member_count: updates.memberCount,
              status: updates.status,
              notes: updates.notes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', passengerId);

          if (error) throw error;

          set((state) => ({
            passengers: state.passengers.map((passenger) =>
              passenger.id === passengerId ? { ...passenger, ...updates } : passenger
            ),
          }));
          return { success: true };
        } catch (error) {
          console.error('Update passenger error:', error);
          return { success: false, error: error.message };
        }
      },

      deletePassenger: async (passengerId) => {
        try {
          // Soft delete by setting status to inactive
          const { error } = await supabase
            .from('corporate_passengers')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('id', passengerId);

          if (error) throw error;

          set((state) => ({
            passengers: state.passengers.filter((passenger) => passenger.id !== passengerId),
          }));
          return { success: true };
        } catch (error) {
          console.error('Delete passenger error:', error);
          return { success: false, error: error.message };
        }
      },

      // Computed selectors
      getEmployees: () => {
        return get().passengers.filter((p) => p.passengerType === 'employee');
      },

      getClients: () => {
        return get().passengers.filter((p) => p.passengerType === 'client');
      },

      getActivePassengers: () => {
        return get().passengers.filter((p) => p.status === 'active');
      },

      getPassengersByDepartment: (department) => {
        return get().passengers.filter((p) => p.department === department);
      },

      // New selectors by type
      getPassengersByType: (type) => {
        return get().passengers.filter((p) => p.type === type);
      },

      getStaff: () => {
        return get().passengers.filter((p) => p.type === 'staff');
      },

      getClientsList: () => {
        return get().passengers.filter((p) => p.type === 'clients');
      },

      getStudents: () => {
        return get().passengers.filter((p) => p.type === 'students');
      },

      getGroups: () => {
        return get().passengers.filter((p) => p.type === 'groups');
      },

      getTotalPassengers: () => {
        return get().passengers.length;
      },

      getTotalEmployees: () => {
        return get().passengers.filter((p) => p.passengerType === 'employee').length;
      },

      getTotalClients: () => {
        return get().passengers.filter((p) => p.passengerType === 'client').length;
      },

      // Stats calculations
      getActiveEmployeesCount: () => {
        return get().passengers.filter((p) => p.type === 'staff' && p.status === 'active').length;
      },

      clearError: () => set({ passengersError: null }),
    }),
    { name: 'PassengersStore' }
  )
);

export default usePassengersStore;

