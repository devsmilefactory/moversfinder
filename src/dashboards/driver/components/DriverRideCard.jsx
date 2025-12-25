import React, { useState } from 'react';
import { 
  DollarSign, 
  Phone, 
  User, 
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Package
} from 'lucide-react';
import { summarizeErrandTasks } from '../../../utils/errandTasks';
import { getRoundTripDisplay } from '../../../utils/roundTripHelpers';
import { getRideCostDisplay, isRoundTripRide } from '../../../utils/rideCostDisplay';
import { formatPrice } from '../../../utils/formatters';
import { getRideTypeHandler } from '../../../utils/rideTypeHandlers';
import { isErrandService } from '../../../utils/serviceTypes';
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
  const [showAllPackages, setShowAllPackages] = useState(false);

  if (!ride) return null;

  // Get ride type handler for modular service-specific handling
  const rideTypeHandler = getRideTypeHandler(ride.service_type);
  
  const isErrand = rideTypeHandler.isServiceType(ride, 'errands');
  const isCourier = rideTypeHandler.isServiceType(ride, 'courier');
  const isRecurring = ride.is_series || ride.ride_timing === 'scheduled_recurring';
  
  // Get round trip info
  const roundTripInfo = getRoundTripDisplay(ride);
  const isRoundTrip = isRoundTripRide(ride);
  
  // Get cost display
  const costDisplay = getRideCostDisplay(ride);
  
  // Get errand summary
  const errandSummary = isErrand ? summarizeErrandTasks(ride.errand_tasks) : null;
  
  // Parse courier packages if available
  let courierPackages = [];
  try {
    if (ride.courier_packages) {
      courierPackages = typeof ride.courier_packages === 'string' 
        ? JSON.parse(ride.courier_packages) 
        : ride.courier_packages;
    }
  } catch (e) {
    console.warn('Failed to parse courier_packages:', e);
  }

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
            pickupAddress={ride.pickup_address || ride.pickup_location}
            dropoffAddress={ride.dropoff_address || ride.dropoff_location}
            compact={true}
          />
          
          {/* Courier package details */}
          {isCourier && (
            <div className="mt-2 bg-amber-50 rounded-lg p-2 border border-amber-200">
              <div className="flex items-start gap-2">
                <span className="text-lg mt-1">📦</span>
                <div className="flex-1">
                  {/* Summary of first package or legacy fields */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-800">
                      {courierPackages.length > 0 
                        ? (courierPackages[0].packageDescription || `Package 1: ${courierPackages[0].packageSize}`)
                        : (ride.courier_package_details || 'Package delivery')}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-amber-700">
                      {courierPackages.length > 0 ? (
                        <span>Size: <span className="font-semibold capitalize">{courierPackages[0].packageSize}</span></span>
                      ) : ride.package_size && (
                        <span>Size: <span className="font-semibold capitalize">{ride.package_size}</span></span>
                      )}
                      
                      {ride.vehicle_type && (
                        <span>Vehicle: <span className="font-semibold capitalize">{ride.vehicle_type.replace('-', ' ')}</span></span>
                      )}
                    </div>
                  </div>

                  {/* Multiple Packages Toggle */}
                  {courierPackages.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllPackages(!showAllPackages);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors"
                      >
                        {showAllPackages ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {showAllPackages ? 'Hide' : `Show all ${courierPackages.length} packages`}
                      </button>

                      {showAllPackages && (
                        <div className="mt-2 space-y-2 pl-2 border-l-2 border-amber-300">
                          {courierPackages.map((pkg, idx) => (
                            <div key={idx} className="text-xs text-amber-800">
                              <p className="font-semibold">Package {idx + 1}: {pkg.packageSize}</p>
                              {pkg.packageDescription && <p className="opacity-80">{pkg.packageDescription}</p>}
                              {pkg.dropoffLocation && <p className="opacity-80 text-[10px]">📍 {pkg.dropoffLocation.data?.address || pkg.dropoffLocation}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Special instructions */}
                  {(ride.special_requests || ride.special_instructions) && (
                    <p className="text-xs text-amber-700 mt-2 italic border-t border-amber-100 pt-1">
                      📝 {(ride.special_requests || ride.special_instructions).substring(0, 100)}
                      {((ride.special_requests || ride.special_instructions)?.length > 100) && '...'}
                    </p>
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
                    {ride.total_trips || ride.total_rides_in_series || 1} Trip{(ride.total_trips || ride.total_rides_in_series || 1) !== 1 ? 's' : ''}
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