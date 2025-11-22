/**
 * RideList Component
 * 
 * Presentational component that displays a list of rides with loading and empty states.
 * Handles bulk ride grouping following existing patterns.
 */

import React from 'react';

const RideList = ({ 
  rides, 
  isLoading, 
  activeInstantRide, 
  onRideClick, 
  onAcceptRide, 
  onActivateRide,
  renderRideCard 
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rides...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!rides || rides.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🚗</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No rides found</h3>
        <p className="text-gray-600">
          There are no rides matching your current filters.
        </p>
      </div>
    );
  }

  // Group rides by batch_id for bulk rides (following existing pattern)
  const groupRides = () => {
    const seen = new Set();
    const groups = [];
    
    rides.forEach((ride) => {
      const isBulk = ride?.booking_type === 'bulk' && ride?.batch_id;
      const key = isBulk ? `bulk:${ride.batch_id}` : `single:${ride.id}`;
      
      if (seen.has(key)) return;
      seen.add(key);
      
      if (isBulk) {
        const members = rides.filter(
          r => r?.booking_type === 'bulk' && r?.batch_id === ride.batch_id
        );
        if (members.length > 1) {
          groups.push({ type: 'bulk_group', batch_id: ride.batch_id, rides: members });
        } else {
          groups.push({ type: 'single', ride });
        }
      } else {
        groups.push({ type: 'single', ride });
      }
    });
    
    return groups;
  };

  const rideGroups = groupRides();

  return (
    <div className="space-y-3">
      {rideGroups.map((group) => {
        if (group.type === 'bulk_group') {
          // Bulk ride group
          return (
            <div 
              key={group.batch_id} 
              className="rounded-lg border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 overflow-hidden"
            >
              <div className="bg-indigo-600 text-white px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">👥</span>
                  <span className="font-semibold text-sm">
                    Bulk Ride - {group.rides.length} Trips
                  </span>
                </div>
                <div className="text-sm font-bold">
                  ${group.rides.reduce((sum, r) => sum + (parseFloat(r.estimated_cost) || 0), 0).toFixed(2)}
                </div>
              </div>
              <div className="p-2 space-y-2">
                {group.rides.map((ride) => renderRideCard(ride, activeInstantRide, onRideClick, onAcceptRide, onActivateRide))}
              </div>
            </div>
          );
        } else {
          // Single ride
          return renderRideCard(group.ride, activeInstantRide, onRideClick, onAcceptRide, onActivateRide);
        }
      })}
    </div>
  );
};

export default RideList;
