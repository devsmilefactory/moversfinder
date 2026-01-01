import React from 'react';
import RideRequestsView from './RideRequestsView';
import { useAuthStore } from '../../../stores';

/**
 * Refactored Ride Requests Page
 * 
 * This is a simplified version of the RideRequestsPage that uses
 * the new modular RideRequestsView component.
 */
const RefactoredRideRequestsPage = () => {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to access the driver dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Driver Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your ride requests and earnings
          </p>
        </div>

        <RideRequestsView
          autoRefresh={true}
          refreshInterval={30000}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default RefactoredRideRequestsPage;