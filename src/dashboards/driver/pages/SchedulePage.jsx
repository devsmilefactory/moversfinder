import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import FormInput, { FormTextarea } from '../../shared/FormInput';
import { useAuthStore } from '../../../stores';
import useDriverStore from '../../../stores/driverStore';
import { supabase } from '../../../lib/supabase';

/**
 * Driver Schedule Page
 *
 * Features:
 * - View weekly schedule based on completed rides
 * - Set availability toggle (updates driver_profiles)
 * - Time off requests (stored in support_tickets)
 * - Today's scheduled rides
 *
 * Supabase Integration:
 * - Fetches rides from rides table
 * - Updates is_available in driver_profiles
 * - Creates time off requests as support tickets
 */

const SchedulePage = () => {
  const user = useAuthStore((state) => state.user);
  const { driverProfile, rides, loading, loadDashboardData } = useDriverStore();
  const [isAvailable, setIsAvailable] = useState(true);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeOffData, setTimeOffData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    if (user?.id) {
      loadDashboardData(user.id);
    }
  }, [user?.id, loadDashboardData]);

  useEffect(() => {
    if (driverProfile) {
      setIsAvailable(driverProfile.is_available || false);
    }
  }, [driverProfile]);

  // Calculate weekly schedule from completed rides
  const getWeeklySchedule = () => {
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

    return weekDays.map((day, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);

      // Count rides for this day
      const dayRides = rides?.filter(ride => {
        const rideDate = new Date(ride.created_at);
        return rideDate.toDateString() === date.toDateString() &&
               (ride.ride_status === 'trip_completed' || ride.ride_status === 'trip_started');
      }) || [];

      return {
        day,
        date: date.toLocaleDateString(),
        rides: dayRides.length,
        status: dayRides.length > 0 ? 'scheduled' : 'available'
      };
    });
  };

  // Get today's upcoming rides
  const getTodaysRides = () => {
    const today = new Date().toDateString();
    return rides?.filter(ride => {
      const rideDate = new Date(ride.created_at);
      return rideDate.toDateString() === today &&
             (ride.ride_status === 'pending' || ride.ride_status === 'accepted' || ride.ride_status === 'trip_started');
    }) || [];
  };

  const toggleAvailability = async () => {
    if (!user?.id) return;

    const newStatus = !isAvailable;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('driver_profiles')
        .update({
          is_available: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsAvailable(newStatus);
      alert(`You are now ${newStatus ? 'AVAILABLE' : 'UNAVAILABLE'} for rides`);
    } catch (error) {
      console.error('Error updating availability:', error);
      alert(`Failed to update availability: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeOffSubmit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    setSubmitting(true);

    try {
      // Create time off request as a support ticket
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: `Time Off Request: ${timeOffData.startDate} to ${timeOffData.endDate}`,
          category: 'time_off',
          priority: 'medium',
          description: `Time off request from ${timeOffData.startDate} to ${timeOffData.endDate}.\n\nReason: ${timeOffData.reason}`,
          status: 'open'
        });

      if (error) throw error;

      setShowTimeOffModal(false);
      setTimeOffData({ startDate: '', endDate: '', reason: '' });
      alert('Time off request submitted successfully! You will be notified once reviewed.');
    } catch (error) {
      console.error('Error submitting time off request:', error);
      alert(`Failed to submit request: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const schedule = getWeeklySchedule();
  const todaysRides = getTodaysRides();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">My Schedule</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your availability and view your schedule
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowTimeOffModal(true)}>
            Request Time Off
          </Button>
          <button
            onClick={toggleAvailability}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              isAvailable
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {isAvailable ? '✓ Available' : '✗ Unavailable'}
          </button>
        </div>
      </div>

      {/* Availability Status Banner */}
      <div className={`rounded-lg p-4 mb-6 ${
        isAvailable ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
      }`}>
        <p className={`font-medium ${isAvailable ? 'text-green-700' : 'text-red-700'}`}>
          {isAvailable
            ? '🟢 You are currently AVAILABLE for ride requests'
            : '🔴 You are currently UNAVAILABLE for ride requests'}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Weekly Schedule */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Weekly Schedule</h2>
          <div className="space-y-3">
            {schedule.map((day) => (
              <div key={day.day} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-slate-700">{day.day}</p>
                  <p className="text-sm text-slate-500">{day.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">{day.rides} rides</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    day.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {day.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Upcoming Rides */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Today's Rides</h2>
          {todaysRides.length > 0 ? (
            <div className="space-y-3">
              {todaysRides.map((ride) => (
                <div key={ride.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <p className="font-bold text-blue-700">
                    {new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-slate-700 mt-1">Ride #{ride.id.slice(0, 8)}</p>
                  <div className="text-xs text-slate-600 mt-2">
                    <p>📍 {ride.pickup_location || 'Pickup location'}</p>
                    <p>→ {ride.dropoff_location || 'Dropoff location'}</p>
                  </div>
                  <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                    ride.ride_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    ride.ride_status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                    ride.ride_status === 'trip_started' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {ride.ride_status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p className="text-3xl mb-2">📅</p>
              <p>No rides scheduled for today</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Schedule Information</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-slate-700 mb-2">
            📊 Your weekly schedule is automatically generated based on your completed rides.
          </p>
          <p className="text-sm text-slate-700 mb-2">
            🔔 Toggle your availability status to control when you receive ride requests.
          </p>
          <p className="text-sm text-slate-700">
            📅 Need time off? Submit a request and management will review it within 24-48 hours.
          </p>
        </div>
      </div>

      {/* Time Off Request Modal */}
      <Modal
        isOpen={showTimeOffModal}
        onClose={() => {
          setShowTimeOffModal(false);
          setTimeOffData({ startDate: '', endDate: '', reason: '' });
        }}
        title="Request Time Off"
        size="md"
      >
        <form onSubmit={handleTimeOffSubmit}>
          <FormInput
            label="Start Date"
            type="date"
            value={timeOffData.startDate}
            onChange={(e) => setTimeOffData({ ...timeOffData, startDate: e.target.value })}
            required
          />

          <FormInput
            label="End Date"
            type="date"
            value={timeOffData.endDate}
            onChange={(e) => setTimeOffData({ ...timeOffData, endDate: e.target.value })}
            required
          />

          <FormTextarea
            label="Reason"
            value={timeOffData.reason}
            onChange={(e) => setTimeOffData({ ...timeOffData, reason: e.target.value })}
            placeholder="Please provide a reason for your time off request..."
            rows={4}
            required
          />

          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <p className="text-xs text-blue-700">
              ℹ️ Your request will be reviewed by management. You will be notified once approved or denied.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTimeOffModal(false);
                setTimeOffData({ startDate: '', endDate: '', reason: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SchedulePage;
