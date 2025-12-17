import React from 'react';
import ActiveTripsView from '../components/ActiveTripsView';

/**
 * Active Trips Page (Driver Version)
 * 
 * Full page view for drivers to track and manage their active trips
 * Uses the ActiveTripsView component
 */
const ActiveTripsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Active Trips</h1>
          <p className="text-gray-600 mt-2">Manage your current trips and update status</p>
        </div>
        
        <ActiveTripsView />
      </div>
    </div>
  );
};

export default ActiveTripsPage;

