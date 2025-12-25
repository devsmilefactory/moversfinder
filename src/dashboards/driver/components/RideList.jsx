/**
 * RideList Component
 * 
 * Presentational component that displays a list of rides with loading and empty states.
 * Handles bulk ride grouping and recurring series display following existing patterns.
 */

import React from 'react';
import { isRecurringSeries } from '../../../services/driverRidesApi';
import RecurringSeriesCard from './RecurringSeriesCard';
import DriverRideCard from './DriverRideCard';
import RadarAnimation from './RadarAnimation';

const RideList = ({ 
  rides, 
  isLoading, 
  activeInstantRide, 
  onRideClick, 
  onAcceptRide, 
  onActivateRide,
  onActivateNextTrip,
  onMoreDetails,
  feedCategory = 'available'
}) => {
  // Loading state
  if (isLoading) {
    return <RadarAnimation />;
  }

  // Empty state
  if (!rides || rides.length === 0) {
    // Special case: If there's an active instant ride and we're on AVAILABLE tab
    // Show a helpful message with CTA to navigate to the active ride
    if (activeInstantRide && onActivateRide) {
      return (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🚗</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">You have an active ride</h3>
          <p className="text-gray-600 mb-6">
            Complete your current instant ride before accepting new ones.
          </p>
          <button
            onClick={() => onActivateRide(activeInstantRide)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
          >
            <span>View Active Ride</span>
            <span>→</span>
          </button>
        </div>
      );
    }

    // Default empty state
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

  // Group rides by batch_id for bulk rides
  const groupRides = () => {
    const seen = new Set();
    const groups = [];
    
    rides.forEach((ride) => {
      const isBulk = ride?.batch_id;
      const key = isBulk ? `bulk:${ride.batch_id}` : `single:${ride.id}`;
      
      if (seen.has(key)) return;
      seen.add(key);
      
      if (isBulk) {
        const members = rides.filter(r => r?.batch_id === ride.batch_id);
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
                {group.rides.map((ride) => (
                  <DriverRideCard
                    key={ride.id}
                    ride={ride}
                    feedCategory={feedCategory}
                    onPlaceBid={onAcceptRide}
                    onMoreDetails={onMoreDetails || onRideClick}
                    onStartTrip={onActivateRide}
                    onCompleteTrip={onActivateRide}
                  />
                ))}
              </div>
            </div>
          );
        } else {
          // Check if this is a recurring series
          if (isRecurringSeries(group.ride)) {
            return (
              <RecurringSeriesCard
                key={group.ride.series_id || group.ride.id}
                series={group.ride}
                feedCategory={group.ride.feed_category || feedCategory}
                onPlaceBid={onAcceptRide}
                onMoreDetails={onMoreDetails || onRideClick}
                onActivateNext={onActivateNextTrip}
                onViewDetails={onRideClick}
              />
            );
          }
          
          // Regular single ride
          return (
            <DriverRideCard
              key={group.ride.id}
              ride={group.ride}
              feedCategory={feedCategory}
              onPlaceBid={onAcceptRide}
              onMoreDetails={onMoreDetails || onRideClick}
              onStartTrip={onActivateRide}
              onCompleteTrip={onActivateRide}
            />
          );
        }
      })}
    </div>
  );
};

export default RideList;
