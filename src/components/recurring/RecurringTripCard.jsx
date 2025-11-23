import React from 'react';
import Button from '../ui/Button';
import { Calendar, MapPin, DollarSign, Clock } from 'lucide-react';

/**
 * Recurring Trip Card Component
 * 
 * Displays a recurring trip series with progress tracking and next trip information
 * 
 * @param {Object} series - The recurring trip series data
 * @param {Function} onViewDetails - Callback when "View Details" is clicked
 */
const RecurringTripCard = ({ series, onViewDetails }) => {
  // Calculate progress
  const tripsRemaining = series.trips_remaining || (series.total_trips - series.completed_trips - series.cancelled_trips);
  const progressPercent = series.total_trips > 0 
    ? Math.round((series.completed_trips / series.total_trips) * 100) 
    : 0;

  // Format next trip date
  const formatNextTripDate = (dateString) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    // If within 24 hours
    if (diffHours < 24 && diffHours >= 0) {
      if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `In ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
      }
      return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    }

    // If tomorrow
    if (diffDays === 1) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // If within a week
    if (diffDays < 7 && diffDays > 0) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    // Otherwise show full date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get status badge styling
  const getStatusBadge = () => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Paused' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
    };
    
    const badge = badges[series.status] || badges.active;
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // Get recurrence pattern display
  const getRecurrenceDisplay = () => {
    const patterns = {
      daily: 'Daily',
      weekly: 'Weekly',
      weekdays: 'Weekdays',
      weekends: 'Weekends',
      custom: 'Custom'
    };
    return patterns[series.recurrence_pattern] || series.recurrence_pattern;
  };

  const nextTripFormatted = formatNextTripDate(series.next_trip_date);
  const isWithin24Hours = series.next_trip_date && new Date(series.next_trip_date) - new Date() < 24 * 60 * 60 * 1000;

  return (
    <div className="bg-white rounded-lg border-2 border-purple-200 p-4 hover:border-purple-300 transition-all shadow-sm">
      {/* Series Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔄</span>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {series.series_name || 'Recurring Trip'}
            </h3>
            <p className="text-sm text-gray-600">{getRecurrenceDisplay()}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-semibold text-purple-700">
            {series.completed_trips} / {series.total_trips} trips
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {tripsRemaining} trip{tripsRemaining !== 1 ? 's' : ''} remaining
        </p>
      </div>

      {/* Next Trip */}
      {series.status === 'active' && nextTripFormatted && (
        <div className={`rounded-lg p-3 mb-3 ${isWithin24Hours ? 'bg-yellow-50 border border-yellow-200' : 'bg-purple-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className={`w-4 h-4 ${isWithin24Hours ? 'text-yellow-600' : 'text-purple-600'}`} />
            <p className={`text-xs font-medium ${isWithin24Hours ? 'text-yellow-600' : 'text-purple-600'}`}>
              Next Trip
            </p>
          </div>
          <p className={`text-sm font-semibold ${isWithin24Hours ? 'text-yellow-900' : 'text-purple-900'}`}>
            {nextTripFormatted}
          </p>
        </div>
      )}

      {/* Locations */}
      <div className="space-y-2 text-sm mb-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Pickup</p>
            <p className="text-gray-700 truncate">{series.pickup_address}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Dropoff</p>
            <p className="text-gray-700 truncate">{series.dropoff_address}</p>
          </div>
        </div>
      </div>

      {/* Estimated Cost */}
      {series.estimated_cost && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="text-gray-600">Per trip:</span>
          <span className="font-semibold text-green-600">
            ${parseFloat(series.estimated_cost).toFixed(2)}
          </span>
        </div>
      )}

      {/* Actions */}
      <Button 
        onClick={() => onViewDetails(series)} 
        className="w-full"
        variant="outline"
      >
        View Details
      </Button>
    </div>
  );
};

export default RecurringTripCard;
