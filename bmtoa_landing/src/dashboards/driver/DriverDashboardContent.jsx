import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../shared/StatsCard';
import Button from '../shared/Button';
import { useAuthStore } from '../../stores';
import useDriverStore from '../../stores/driverStore';
import ProfileCompletionBanner from '../shared/ProfileCompletionBanner';
import RideRequestsView from './components/RideRequestsView';

/**
 * Driver Dashboard Content (without layout wrapper)
 * This is the content that appears on the /driver/dashboard route
 *
 * For approved drivers: Shows ride requests as primary interface
 * For unapproved drivers: Shows profile completion banner and stats
 *
 * Supabase Integration:
 * - Fetches driver profile from driver_profiles table
 * - Fetches earnings stats from rides table (aggregated)
 * - Fetches active ride requests from ride_acceptance_queue table
 * - Real-time updates via Supabase subscriptions
 */
const DriverDashboardContent = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { driverProfile, stats, activeRequests, loading, loadDashboardData } = useDriverStore();

  useEffect(() => {
    if (user?.id) {
      loadDashboardData(user.id);
    }
  }, [user?.id, loadDashboardData]);

  const handleViewProfile = () => {
    navigate('/driver/profile');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  // If driver profile is complete and approved, show ride requests as primary interface
  if (user?.profile_completion_status === 'complete' && user?.approval_status === 'approved') {
    return (
      <>
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-700 mb-2">
            Welcome back, {user?.name || driverProfile?.full_name || 'Driver'}! 🚗
          </h1>
          <p className="text-slate-600">
            Vehicle: {driverProfile?.license_plate || 'Not assigned'} | Rating: ⭐ {driverProfile?.rating || 0} | Total Trips: {driverProfile?.total_trips || 0}
          </p>
        </div>

        {/* Ride Requests View (Primary Interface) */}
        <RideRequestsView />
      </>
    );
  }

  // For unapproved or incomplete profiles, show traditional dashboard
  return (
    <>
      {/* Profile Completion Banner */}
      <ProfileCompletionBanner user={user} userType="driver" />

      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-700 mb-2">
          Welcome back, {user?.name || driverProfile?.full_name || 'Driver'}! 🚗
        </h1>
        <p className="text-slate-600">
          {driverProfile ? (
            <>
              Vehicle: {driverProfile?.license_plate || 'Not assigned'} | Rating: ⭐ {driverProfile?.rating || 0} | Total Trips: {driverProfile?.total_trips || 0}
            </>
          ) : (
            <>
              Complete your profile to start accepting rides and earning money with BMTOA.
            </>
          )}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleViewProfile}
        >
          👤 Complete Profile
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => navigate('/driver/support')}
        >
          💬 Contact Support
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Today's Earnings"
          value={`$${(stats?.todayEarnings || 0).toFixed(2)}`}
          icon="💵"
          trend={stats?.todayTrend}
          subtitle="vs yesterday"
        />
        <StatsCard
          title="Week Earnings"
          value={`$${(stats?.weekEarnings || 0).toFixed(2)}`}
          icon="💰"
          trend={stats?.weekTrend}
          subtitle="vs last week"
        />
        <StatsCard
          title="Month Earnings"
          value={`$${(stats?.monthEarnings || 0).toFixed(2)}`}
          icon="💎"
          trend={stats?.monthTrend}
          subtitle="vs last month"
        />
        <StatsCard
          title="Active Requests"
          value={activeRequests?.length || 0}
          icon="📞"
        />
      </div>

      {/* Active Ride Requests */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">Active Ride Requests</h2>
        {activeRequests && activeRequests.length > 0 ? (
          <div className="space-y-4">
            {activeRequests.map((request) => (
              <div key={request.id} className="border border-slate-200 rounded-lg p-4 bg-yellow-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-slate-700">{request.customer_name || 'Customer'}</p>
                    <p className="text-sm text-slate-500">
                      Requested {new Date(request.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-400 text-slate-700 rounded-full text-sm font-medium">
                    {request.status}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-1">📍</span>
                    <span className="text-slate-700 text-sm">{request.pickup_location}</span>
                  </div>
                  <span className="text-slate-400">→</span>
                  <div className="flex items-center">
                    <span className="text-red-600 mr-1">📍</span>
                    <span className="text-slate-700 text-sm">{request.dropoff_location}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-600">
                    Est. <span className="font-semibold">${request.fare?.toFixed(2)}</span> | {request.distance} km
                  </p>
                  <div className="space-x-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => useDriverStore.getState().acceptRideRequest(request.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => useDriverStore.getState().declineRideRequest(request.id)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            No active ride requests at the moment
          </div>
        )}
      </div>

      {/* Today's Summary */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-slate-700 mb-4">Today's Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Completed Trips</span>
              <span className="font-semibold text-slate-700">{stats?.todayTrips || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Total Distance</span>
              <span className="font-semibold text-slate-700">{stats?.todayDistance || 0} km</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Online Time</span>
              <span className="font-semibold text-slate-700">{stats?.onlineTime || '0h 0m'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Average Rating</span>
              <span className="font-semibold text-slate-700">⭐ {stats?.averageRating || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-slate-700 mb-4">Document Status</h3>
          {driverProfile?.documents && driverProfile.documents.length > 0 ? (
            <div className="space-y-3">
              {driverProfile.documents.map((doc) => (
                <div key={doc.id} className="flex justify-between items-center">
                  <span className="text-slate-600">{doc.document_type}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    doc.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : doc.status === 'expiring_soon'
                      ? 'bg-yellow-100 text-yellow-700'
                      : doc.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {doc.status === 'approved' ? 'Valid' : doc.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500">
              No documents uploaded yet
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DriverDashboardContent;

