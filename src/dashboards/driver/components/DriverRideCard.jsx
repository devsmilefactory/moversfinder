import React from 'react';
import { 
  DollarSign, 
  Phone, 
  User, 
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { summarizeErrandTasks } from '../../../utils/errandTasks';
import { getRoundTripDisplay } from '../../../utils/roundTripHelpers';
import { getRideCostDisplay, isRoundTripRide } from '../../../utils/rideCostDisplay';
import { formatPrice } from '../../../utils/formatters';
import BaseRideCard from '../../../components/cards/BaseRideCard';
import CardHeader from '../../../components/cards/CardHeader';
import RouteDisplay from '../../../components/cards/RouteDisplay';
import ErrandTaskList from '../../../components/cards/ErrandTaskList';
import CardMetadata from '../../../components/cards/CardMetadata';
import CardActions from '../../../components/cards/CardActions';

/**
 * Standardized DriverRideCard using BaseRideCard components
 * - Uses CardHeader for consistent service type, timing, and time display
 * - Uses RouteDisplay for pickup/dropoff or ErrandTaskList for errands
 * - Uses CardMetadata for distance, cost, and passenger info
 * - Uses CardActions for context-aware action buttons
 */
const DriverRideCard = ({ 
  ride, 
  feedCategory = 'available', 
  onPlaceBid, 
  onStartTrip, 
  onCallPassenger 
}) => {
  if (!ride) return null;

  const isErrand = ride.service_type === 'errands';
  const isCourier = ride.service_type === 'courier';
  const isRecurring = ride.is_series || ride.ride_timing === 'scheduled_recurring';
  
  // Get round trip info
  const roundTripInfo = getRoundTripDisplay(ride);
  const isRoundTrip = isRoundTripRide(ride);
  
  // Get cost display
  const costDisplay = getRideCostDisplay(ride);
  
  // Get errand summary
  const errandSummary = isErrand ? summarizeErrandTasks(ride.errand_tasks) : null;
  
  // Normalize feedCategory to lowercase for comparison
  const normalizedCategory = feedCategory?.toLowerCase();
  
  // Determine ride timing for CardHeader
  const getRideTiming = () => {
    if (isRecurring) return 'scheduled_recurring';
    if (ride.ride_timing === 'scheduled_single' || ride.scheduled_datetime) return 'scheduled_single';
    return 'instant';
  };

  // Handle actions
  const handleAction = (actionType, data) => {
    switch (actionType) {
      case 'place_bid':
        onPlaceBid?.(ride);
        break;
      case 'start_trip':
      case 'continue_trip':
        onStartTrip?.(ride);
        break;
      case 'call_passenger':
        onCallPassenger?.(ride.passenger_phone);
        break;
      default:
        console.warn('Unknown action type:', actionType);
    }
  };

  return (
    <BaseRideCard
      ride={ride}
      role="driver"
      context={normalizedCategory}
      onAction={handleAction}
      className="hover:shadow-md transition-shadow"
    >
      {/* Header with service type, timing, and time posted */}
      <CardHeader
        serviceType={ride.service_type}
        rideTiming={getRideTiming()}
        createdAt={ride.created_at}
        context={normalizedCategory}
      />

      {/* Round Trip Leg Display */}
      {isRoundTrip && (
        <div className="mb-3 bg-indigo-50 rounded-lg p-3 border border-indigo-200">
          <div className="flex items-center gap-2">
            {roundTripInfo.legType === 'return' ? (
              <ArrowLeft className="w-5 h-5 text-indigo-600" />
            ) : (
              <ArrowRight className="w-5 h-5 text-indigo-600" />
            )}
            <div className="flex-1">
              <p className="text-sm font-bold text-indigo-900">
                {roundTripInfo.displayText}
              </p>
              <p className="text-xs text-indigo-600">
                {roundTripInfo.legType === 'outbound' ? 'Pickup → Destination' : 'Destination → Pickup'}
              </p>
            </div>
            {costDisplay.breakdown && (
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">
                  {formatPrice(costDisplay.currentLegCost || ride.estimated_cost)}
                </p>
                <p className="text-xs text-indigo-600">This leg</p>
              </div>
            )}
          </div>
          {costDisplay.breakdown && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-indigo-200">
              <div className="flex items-center gap-3 text-xs text-indigo-600">
                <span>Out: {formatPrice(costDisplay.breakdown.outbound)}</span>
                <span>Ret: {formatPrice(costDisplay.breakdown.return)}</span>
              </div>
              <div className="text-xs text-indigo-600">
                Total: {formatPrice(costDisplay.total)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content based on service type */}
      {isErrand ? (
        <ErrandTaskList
          tasks={ride.errand_tasks}
          compact={true}
          showStatus={true}
          showCosts={true}
        />
      ) : (
        <>
          <RouteDisplay
            pickupAddress={ride.pickup_address}
            dropoffAddress={ride.dropoff_address}
            compact={true}
          />
          {/* Courier package details */}
          {isCourier && (ride.courier_package_details || ride.package_size) && (
            <div className="mt-2 bg-amber-50 rounded-lg p-2 border border-amber-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {ride.courier_package_details || 'Package delivery'}
                  </p>
                  {ride.package_size && (
                    <p className="text-xs text-amber-700">Size: {ride.package_size}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Recurring trip info */}
          {isRecurring && (
            <div className="mt-2 bg-purple-50 rounded-lg p-2 border border-purple-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔄</span>
                <div>
                  <p className="text-sm font-medium text-purple-800">
                    {ride.total_trips || 1} Trip{(ride.total_trips || 1) !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-purple-700">
                    {formatPrice(costDisplay.perTrip || costDisplay.perTripCost)}/trip
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Metadata: distance, cost, passenger info */}
      <CardMetadata
        ride={ride}
        role="driver"
        showDistance={true}
        showCost={true}
        showPassengerInfo={normalizedCategory === 'in_progress'}
        showDriverInfo={false}
      />

      {/* Actions based on feed category */}
      <CardActions
        ride={ride}
        role="driver"
        context={normalizedCategory}
        onAction={handleAction}
      />
    </BaseRideCard>
  );
};

export default DriverRideCard;