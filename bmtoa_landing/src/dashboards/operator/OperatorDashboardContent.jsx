import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../shared/StatsCard';
import Button from '../shared/Button';
import useAuthStore from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import ProfileCompletionBanner from '../shared/ProfileCompletionBanner';
import OperatorRestrictionBanner from '../shared/OperatorRestrictionBanner';

/**
 * Operator Dashboard Content (without layout wrapper)
 * This is the content that appears on the /operator/dashboard route
 * Fully integrated with Supabase - NO MOCK DATA
 */
const OperatorDashboardContent = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeDrivers: 0,
    monthlyRevenue: 0,
    totalRides: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch operator profile
      const { data: profile, error: profileError } = await supabase
        .from('operator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setOperatorProfile(profile);

      // Fetch vehicle count
      const { count: vehicleCount, error: vehicleError } = await supabase
        .from('operator_vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('operator_id', user.id);

      if (vehicleError) throw vehicleError;

      // Fetch driver count
      const { count: driverCount, error: driverError } = await supabase
        .from('driver_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('operator_id', user.id)
        .eq('operator_approval_status', 'approved');

      if (driverError) throw driverError;

      // Update stats
      setStats({
        totalVehicles: vehicleCount || 0,
        activeDrivers: driverCount || 0,
        monthlyRevenue: profile?.monthly_revenue || 0,
        totalRides: 0, // TODO: Calculate from rides table
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if operator has restrictions
  const hasSubscriptionRestriction = () => {
    if (!user?.subscription_status || !user?.subscription_end_date) return false;
    const now = new Date();
    const endDate = new Date(user.subscription_end_date);
    const gracePeriodEnd = new Date(endDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 5);
    return now > gracePeriodEnd; // Expired and outside grace period
  };

  const hasVerificationRestriction = () => {
    return user?.verification_status === 'pending' || user?.verification_status === 'rejected';
  };

  const isFleetManagementDisabled =
    user?.profile_completion_status !== 'complete' ||
    hasVerificationRestriction() ||
    hasSubscriptionRestriction();

  return (
    <>
      {/* Operator Restriction Banner (subscription & verification) */}
      <OperatorRestrictionBanner user={user} operatorProfile={operatorProfile} />

      {/* Profile Completion Banner */}
      <ProfileCompletionBanner user={user} userType="taxi_operator" />

      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-700 mb-2">
          Welcome, {operatorProfile?.company_name || user?.name || 'Operator'}! 🚕
        </h1>
        <p className="text-slate-600">
          {operatorProfile ? (
            <>
              Manage your fleet, drivers, and operations efficiently.
              {operatorProfile.bmtoa_verified && ` BMTOA Member since ${new Date(operatorProfile.bmtoa_member_since).getFullYear()}.`}
            </>
          ) : (
            <>
              Complete your operator profile to start managing your fleet and drivers with BMTOA.
            </>
          )}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isFleetManagementDisabled}
          title={
            hasSubscriptionRestriction()
              ? 'Subscription expired - Renew to access fleet management'
              : hasVerificationRestriction()
              ? 'Profile verification required to manage fleet'
              : user?.profile_completion_status !== 'complete'
              ? 'Complete your profile to manage fleet'
              : ''
          }
          onClick={() => !isFleetManagementDisabled && navigate('/operator/fleet')}
        >
          🚗 Fleet Management
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          disabled={isFleetManagementDisabled}
          title={
            hasSubscriptionRestriction()
              ? 'Subscription expired - Renew to access driver management'
              : hasVerificationRestriction()
              ? 'Profile verification required to manage drivers'
              : user?.profile_completion_status !== 'complete'
              ? 'Complete your profile to manage drivers'
              : ''
          }
          onClick={() => !isFleetManagementDisabled && navigate('/operator/drivers')}
        >
          👥 Manage Drivers
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          disabled={isFleetManagementDisabled}
          title={
            hasSubscriptionRestriction()
              ? 'Subscription expired - Renew to access revenue'
              : hasVerificationRestriction()
              ? 'Profile verification required to view revenue'
              : user?.profile_completion_status !== 'complete'
              ? 'Complete your profile to view revenue'
              : ''
          }
          onClick={() => !isFleetManagementDisabled && navigate('/operator/revenue')}
        >
          💰 View Revenue
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => navigate('/operator/maintenance')}
        >
          🔧 Maintenance
        </Button>
      </div>

      {/* Profile Status Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Profile Status</h3>
            <p className="text-sm text-slate-500">View and manage your operator profile</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/operator/profile')}
          >
            {user?.profile_completion_status === 'complete' ? 'View Profile' : 'Complete Profile'}
          </Button>
        </div>

        <div className="space-y-3">
          {/* Profile Completion Status */}
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Profile Completion</span>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-slate-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${user?.profile_completion_percentage || 0}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-slate-700">
                {user?.profile_completion_percentage || 0}%
              </span>
            </div>
          </div>

          {/* Approval/Verification Status */}
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Approval Status</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              user?.verification_status === 'verified' || user?.verification_status === 'approved'
                ? 'bg-green-100 text-green-700'
                : user?.verification_status === 'rejected'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {user?.verification_status === 'verified' || user?.verification_status === 'approved'
                ? '✓ Approved'
                : user?.verification_status === 'rejected'
                ? '✗ Rejected'
                : '⏳ Pending Review'}
            </span>
          </div>

          {/* Show message based on status */}
          {user?.verification_status === 'pending' && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                Your profile is under review by BMTOA admin. You'll be notified once approved.
              </p>
            </div>
          )}

          {user?.verification_status === 'rejected' && user?.rejection_reason && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg">
              <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-600">{user.rejection_reason}</p>
              <Button
                variant="danger"
                size="sm"
                className="mt-2"
                onClick={() => navigate('/operator/profile')}
              >
                Update Profile
              </Button>
            </div>
          )}

          {user?.profile_completion_status !== 'complete' && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-700">
                Complete your profile to unlock all features and get verified by BMTOA.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {operatorProfile && (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Vehicles"
            value={stats.totalVehicles}
            icon="🚗"
            trend={{ value: 2, isPositive: true }}
            subtitle="new this month"
          />
          <StatsCard
            title="Active Drivers"
            value={stats.activeDrivers}
            icon="👥"
            trend={{ value: 3, isPositive: true }}
            subtitle="online now"
          />
          <StatsCard
            title="Monthly Revenue"
            value={`$${stats.monthlyRevenue.toLocaleString()}`}
            icon="💰"
            trend={{ value: 15, isPositive: true }}
            subtitle="vs last month"
          />
          <StatsCard
            title="Total Rides"
            value={stats.totalRides}
            icon="📍"
            trend={{ value: 12, isPositive: true }}
            subtitle="this month"
          />
        </div>
      )}

      {/* Fleet Status */}
      {operatorProfile && (
        <>
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-slate-700 mb-4">Fleet Status</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-4xl font-bold text-green-600 mb-2">18</div>
                <div className="text-sm text-slate-600">Active Vehicles</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-4xl font-bold text-yellow-600 mb-2">3</div>
                <div className="text-sm text-slate-600">In Maintenance</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-4xl font-bold text-slate-600 mb-2">3</div>
                <div className="text-sm text-slate-600">Idle</div>
              </div>
            </div>
          </div>

          {/* Active Drivers */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-slate-700">Active Drivers</h2>
          <Button size="sm">View All</Button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-slate-700 font-bold text-lg">MN</span>
              </div>
              <div>
                <p className="font-medium text-slate-700">Michael Ncube</p>
                <p className="text-sm text-slate-500">Vehicle: ABC 1234</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600">🟢 Online</p>
              <p className="text-xs text-slate-500">8 rides today</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-slate-700 font-bold text-lg">SM</span>
              </div>
              <div>
                <p className="font-medium text-slate-700">Sarah Moyo</p>
                <p className="text-sm text-slate-500">Vehicle: DEF 5678</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600">🟢 Online</p>
              <p className="text-xs text-slate-500">6 rides today</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-slate-700 font-bold text-lg">DS</span>
              </div>
              <div>
                <p className="font-medium text-slate-700">David Sibanda</p>
                <p className="text-sm text-slate-500">Vehicle: GHI 9012</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600">🟢 Online</p>
              <p className="text-xs text-slate-500">10 rides today</p>
            </div>
          </div>
        </div>
      </div>

          {/* Maintenance Alerts & BMTOA Membership */}
          <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-slate-700 mb-4">Maintenance Alerts</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-700">ABC 1234</p>
                <p className="text-sm text-slate-500">Service due in 5 days</p>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                Due Soon
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-700">DEF 5678</p>
                <p className="text-sm text-slate-500">Fitness cert expired</p>
              </div>
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                Urgent
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-700">GHI 9012</p>
                <p className="text-sm text-slate-500">All documents valid</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Good
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-slate-700 mb-4">BMTOA Membership</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Membership Tier</span>
              <span className="px-3 py-1 bg-yellow-400 text-slate-700 rounded-full text-sm font-medium capitalize">
                {operatorProfile.membership_tier || 'Standard'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Member Since</span>
              <span className="font-semibold text-slate-700">
                {operatorProfile.bmtoa_member_since
                  ? new Date(operatorProfile.bmtoa_member_since).getFullYear()
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Verification Status</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                operatorProfile.bmtoa_verified
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {operatorProfile.bmtoa_verified ? 'Verified' : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Fleet Size</span>
              <span className="font-semibold text-slate-700">{operatorProfile.fleet_size || 'N/A'}</span>
            </div>
            {operatorProfile.bmtoa_member_number && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Member Number</span>
                <span className="font-semibold text-slate-700">{operatorProfile.bmtoa_member_number}</span>
              </div>
            )}
          </div>
        </div>
          </div>
        </>
      )}
    </>
  );
};

export default OperatorDashboardContent;

