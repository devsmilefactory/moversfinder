import React, { useState } from 'react';
import { 
  Calendar,
  DollarSign,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  Phone,
  User,
  CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getRideCostDisplay } from '../../../utils/rideCostDisplay';
import { getRideProgress } from '../../../utils/rideProgressTracking';
import { formatPrice } from '../../../utils/formatters';

/**
 * Simplified RecurringSeriesCard - Shows only essential information
 * - Service type + Recurring badge
 * - Total trips + Series total price
 * - Place Bid / More Details buttons
 * - Expandable details for breakdown
 */
const RecurringSeriesCard = ({ 
  series, 
  feedCategory = 'available', 
  onPlaceBid, 
  onMoreDetails,
  onActivateNext,
  onViewDetails 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!series) return null;

  // Format price
  const formatPrice = (price) => {
    if (!price) return '$0.00';
    const num = typeof price === 'number' ? price : parseFloat(price);
    return `$${num.toFixed(2)}`;
  };

  // Get service type display
  const getServiceDisplay = () => {
    const icons = {
      taxi: '🚗',
      courier: '📦',
      errands: '🛒',
      school_run: '🚌'
    };
    const labels = {
      taxi: 'Taxi',
      courier: 'Courier',
      errands: 'Errands',
      school_run: 'School Run'
    };
    return {
      icon: icons[series.service_type] || '🚗',
      label: labels[series.service_type] || 'Ride'
    };
  };

  const service = getServiceDisplay();
  
  // Use centralized cost display utility
  const costDisplay = getRideCostDisplay(series);
  const totalTrips = series.rides_total || series.total_trips || 1;
  
  // Use centralized progress tracking utility
  const progressInfo = getRideProgress(series);

  // Get primary action based on feed category
  const renderActions = () => {
    if (feedCategory === 'available') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => onMoreDetails?.(series) || onViewDetails?.(series)}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <Info className="w-4 h-4" />
            More Details
          </button>
          <button
            onClick={() => onPlaceBid?.(series)}
            className="flex-1 px-3 py-2 text-sm font-semibold text-slate-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <DollarSign className="w-4 h-4" />
            Place Bid
          </button>
        </div>
      );
    }

    if (feedCategory === 'my_bids') {
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Your Bid:</span>
            <span className="font-semibold text-gray-900">{formatPrice(series.quoted_price)}</span>
          </div>
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
            Pending
          </span>
        </div>
      );
    }

    if (feedCategory === 'in_progress') {
      return (
        <div className="flex gap-2">
          {series.remaining_trips > 0 && (
            <button
              onClick={() => onActivateNext?.(series)}
              className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Activate Next Trip
            </button>
          )}
        </div>
      );
    }

    if (feedCategory === 'completed') {
      return (
        <div className="flex items-center justify-center gap-2 text-emerald-600">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Series Complete</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-purple-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header - Service Type + Recurring Badge */}
      <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{service.icon}</span>
          <span className="font-semibold text-gray-900">{service.label}</span>
          <span className="px-2 py-0.5 text-xs font-medium bg-purple-600 text-white rounded-full flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Recurring
          </span>
        </div>
        {series.created_at && (
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(series.created_at), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Series Summary - Total Trips + Total Price */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">
              {totalTrips} Trip{totalTrips !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-green-600">
              {costDisplay.display}
            </span>
            <p className="text-xs text-gray-500">
              {costDisplay.perTripDisplay}/trip
            </p>
          </div>
        </div>

        {/* Progress (for in_progress/completed) */}
        {(feedCategory === 'in_progress' || feedCategory === 'completed') && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">
                {progressInfo.completed}/{progressInfo.total}
              </span>
            </div>
            <div className="w-full bg-purple-100 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${progressInfo.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Passenger Info (for in_progress) */}
        {feedCategory === 'in_progress' && series.passenger_name && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{series.passenger_name}</span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-gray-100">
          {renderActions()}
        </div>
      </div>

      {/* Expandable Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full px-4 py-2 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 border-t border-purple-100 flex items-center justify-center gap-1 transition-colors"
      >
        {showDetails ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide Details
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            View Details
          </>
        )}
      </button>

      {/* Expanded Details */}
      {showDetails && (
        <div className="px-4 py-3 bg-purple-50 border-t border-purple-100 space-y-3">
          {/* Trip Breakdown */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="text-xs text-gray-500">Total</p>
              <p className="font-semibold text-purple-700">{totalTrips}</p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="text-xs text-gray-500">Done</p>
              <p className="font-semibold text-green-600">{series.completed_trips || 0}</p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="text-xs text-gray-500">Left</p>
              <p className="font-semibold text-blue-600">{series.remaining_trips || totalTrips}</p>
            </div>
          </div>

          {/* Route */}
          {series.pickup_address && (
            <div className="space-y-1 pt-2 border-t border-purple-200">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <p className="text-xs text-gray-600">{series.pickup_address}</p>
              </div>
              {series.dropoff_address && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-xs text-gray-600">{series.dropoff_address}</p>
                </div>
              )}
            </div>
          )}

          {/* Next Trip Date */}
          {series.next_trip_date && feedCategory === 'in_progress' && (
            <div className="text-xs text-purple-600 pt-2 border-t border-purple-200">
              Next trip: {new Date(series.next_trip_date).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecurringSeriesCard;
