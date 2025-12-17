import React from 'react';
import RideRequestCard from './RideRequestCard';

/**
 * RideRequestsList Component
 * 
 * Displays a list of ride requests with action buttons
 */
const RideRequestsList = ({
  rides = [],
  selectedRide,
  driverLocation,
  onRideSelect,
  onBidClick,
  onAcceptClick,
  onDeclineClick,
  onShowDetails,
  loading = false
}) => {
  if (rides.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2">🔍</div>
        <p>No ride requests found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rides.map((ride) => (
        <RideRequestCard
          key={ride.id}
          ride={ride}
          isSelected={selectedRide?.id === ride.id}
          driverLocation={driverLocation}
          onSelect={() => onRideSelect(ride)}
          onBidClick={() => onBidClick(ride)}
          onAcceptClick={() => onAcceptClick(ride.id)}
          onDeclineClick={(reason) => onDeclineClick(ride.id, reason)}
          onShowDetails={() => onShowDetails(ride)}
          loading={loading}
        />
      ))}
    </div>
  );
};



export default RideRequestsList;