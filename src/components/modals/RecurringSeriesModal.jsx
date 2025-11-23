import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import SeriesProgressBar from '../recurring/SeriesProgressBar';
import { useToast } from '../ui/ToastProvider';
import { getSeriesRides, updateSeriesStatus } from '../../services/recurringTripService';
import { MapPin, Calendar, Clock, DollarSign, Pause, Play, XCircle, CheckCircle } from 'lucide-react';

/**
 * Recurring Series Modal Component
 * 
 * Displays full details of a recurring trip series
 * Shows upcoming trips, series schedule, and management actions
 * 
 * @param {boolean} isOpen - Whether modal is open
 * @param {Function} onClose - Callback to close modal
 * @param {Object} series - The series data to display
 * @param {string} userId - Current user ID (for authorization)
 * @param {Function} onSeriesUpdated - Callback when series is updated
 */
const RecurringSeriesModal = ({ isOpen, onClose, series, userId, onSeriesUpdated }) => {
  const { addToast } = useToast();
  const [rides, setRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, schedule, rides

  useEffect(() => {
    if (isOpen && series?.id) {
      loadSeriesRides();
    }
  }, [isOpen, series?.id]);

  // Load rides in this series
  const loadSeriesRides = async () => {
    if (!series?.id) return;

    setLoadingRides(true);
    try {
      const result = await getSeriesRides(series.id, 50);
      if (result.success) {
        setRides(result.data || []);
      } else {
        console.error('Failed to load series rides:', result.error);
      }
    } catch (error) {
      console.error('Error loading series rides:', error);
    } finally {
      setLoadingRides(false);
    }
  };

  // Handle status change (pause/resume/cancel)
  const handleStatusChange = async (newStatus) => {
    if (!series?.id || !userId) return;

    setUpdatingStatus(true);
    try {
      const result = await updateSeriesStatus(series.id, newStatus, userId);
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Success',
          message: result.message || `Series ${newStatus} successfully`,
          duration: 3000
        });
        
        if (onSeriesUpdated) {
          onSeriesUpdated();
        }
        
        onClose();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: result.message || `Failed to ${newStatus} series`,
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error updating series status:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'An unexpected error occurred',
        duration: 5000
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format time only
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5); // HH:MM
  };

  // Get recurrence pattern display
  const getRecurrenceDisplay = () => {
    if (!series) return '';
    const patterns = {
      daily: 'Every day',
      weekly: 'Every week',
      weekdays: 'Monday - Friday',
      weekends: 'Saturday - Sunday',
      custom: 'Custom schedule'
    };
    return patterns[series.recurrence_pattern] || series.recurrence_pattern;
  };

  // Get ride status badge
  const getRideStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
      accepted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Accepted' },
      driver_on_way: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'On Way' },
      driver_arrived: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Arrived' },
      trip_started: { bg: 'bg-green-100', text: 'text-green-800', label: 'In Progress' },
      trip_completed: { bg: 'bg-green-200', text: 'text-green-900', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex px-2 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>
        {badge.label}
      </span>
    );
  };

  if (!series) return null;

  const tripsRemaining = series.trips_remaining || (series.total_trips - series.completed_trips - series.cancelled_trips);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={series.series_name || 'Recurring Trip Series'} size="xl">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {['overview', 'schedule', 'rides'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Progress */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Series Progress</h3>
              <SeriesProgressBar
                totalTrips={series.total_trips}
                completedTrips={series.completed_trips}
                cancelledTrips={series.cancelled_trips}
                size="lg"
              />
            </div>

            {/* Locations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pickup Location</p>
                    <p className="text-gray-900">{series.pickup_address}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dropoff Location</p>
                    <p className="text-gray-900">{series.dropoff_address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Service Type</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {series.service_type?.replace('_', ' ') || 'Standard'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className="font-semibold text-gray-900 capitalize">{series.status}</p>
              </div>

              {series.estimated_cost && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Cost per Trip</p>
                  <p className="font-semibold text-green-700">
                    ${parseFloat(series.estimated_cost).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Next Trip */}
            {series.status === 'active' && series.next_trip_date && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-900">Next Trip</h3>
                </div>
                <p className="text-lg font-bold text-yellow-900">
                  {formatDate(series.next_trip_date)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Recurrence Pattern</h3>
                </div>
                <p className="text-lg text-gray-700">{getRecurrenceDisplay()}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Trip Time</h3>
                </div>
                <p className="text-lg text-gray-700">{formatTime(series.trip_time)}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Start Date</p>
                <p className="font-semibold text-gray-900">{formatDate(series.start_date)}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">End Date</p>
                <p className="font-semibold text-gray-900">
                  {series.end_date ? formatDate(series.end_date) : 'No end date'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rides Tab */}
        {activeTab === 'rides' && (
          <div className="space-y-3">
            {loadingRides ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">Loading rides...</p>
              </div>
            ) : rides.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No rides found in this series</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {rides.map(ride => (
                  <div key={ride.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          Trip #{ride.series_trip_number}
                        </span>
                        {getRideStatusBadge(ride.ride_status)}
                      </div>
                      {ride.estimated_cost && (
                        <span className="text-sm font-semibold text-green-600">
                          ${parseFloat(ride.estimated_cost).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {ride.scheduled_datetime && (
                      <p className="text-sm text-gray-600">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatDate(ride.scheduled_datetime)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          {series.status === 'active' && (
            <Button
              variant="warning"
              onClick={() => handleStatusChange('paused')}
              disabled={updatingStatus}
              className="flex-1"
            >
              <Pause className="w-4 h-4 mr-2" />
              {updatingStatus ? 'Pausing...' : 'Pause Series'}
            </Button>
          )}

          {series.status === 'paused' && (
            <Button
              variant="success"
              onClick={() => handleStatusChange('active')}
              disabled={updatingStatus}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              {updatingStatus ? 'Resuming...' : 'Resume Series'}
            </Button>
          )}

          {(series.status === 'active' || series.status === 'paused') && (
            <Button
              variant="danger"
              onClick={() => handleStatusChange('cancelled')}
              disabled={updatingStatus}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {updatingStatus ? 'Cancelling...' : 'Cancel Series'}
            </Button>
          )}

          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RecurringSeriesModal;
