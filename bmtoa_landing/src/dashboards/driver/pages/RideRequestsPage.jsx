import React from 'react';
import RideRequestsView from '../components/RideRequestsView';

/**
 * Ride Requests Page (Driver)
 *
 * Primary interface for drivers after login
 * Shows online/offline toggle and pending ride requests
 */
const RideRequestsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Ride Requests</h1>
          <p className="text-gray-600 mt-2">View and respond to ride requests in your area</p>
        </div>

        <RideRequestsView />
      </div>
    </div>
  );
};

export default RideRequestsPage;
