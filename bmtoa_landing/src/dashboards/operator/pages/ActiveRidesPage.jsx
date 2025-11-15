import React from 'react';
import ActiveRidesView from '../components/ActiveRidesView';

/**
 * Active Rides Page
 * 
 * Full page view for tracking active rides
 * Uses the ActiveRidesView component
 */
const ActiveRidesPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Active Rides</h1>
          <p className="text-gray-600 mt-2">Track your current rides in real-time</p>
        </div>
        
        <ActiveRidesView />
      </div>
    </div>
  );
};

export default ActiveRidesPage;

