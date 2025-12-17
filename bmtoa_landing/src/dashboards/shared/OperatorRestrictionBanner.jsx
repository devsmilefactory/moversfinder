import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

/**
 * Operator Restriction Banner Component
 * Shows warnings for subscription expiry and profile completion/verification status
 * 
 * Displays different banners based on:
 * 1. Subscription status (expired with grace period)
 * 2. Profile completion status (incomplete)
 * 3. Verification status (pending, rejected)
 */
const OperatorRestrictionBanner = ({ user, operatorProfile }) => {
  const navigate = useNavigate();

  // Calculate subscription status and grace period
  const getSubscriptionStatus = () => {
    if (!user?.subscription_status || !user?.subscription_end_date) {
      return { isExpired: false, daysRemaining: null, inGracePeriod: false };
    }

    const now = new Date();
    const endDate = new Date(user.subscription_end_date);
    const gracePeriodEnd = new Date(endDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 5); // 5-day grace period

    const isExpired = now > endDate;
    const inGracePeriod = isExpired && now <= gracePeriodEnd;
    const daysRemaining = inGracePeriod 
      ? Math.ceil((gracePeriodEnd - now) / (1000 * 60 * 60 * 24))
      : 0;

    return { isExpired, daysRemaining, inGracePeriod };
  };

  const subscriptionStatus = getSubscriptionStatus();

  // Check verification status
  const isProfileIncomplete = user?.profile_completion_status !== 'complete';
  const isVerificationPending = user?.verification_status === 'pending';
  const isVerificationRejected = user?.verification_status === 'rejected';

  // Determine which banner to show (priority order)
  // 1. Subscription expired (outside grace period) - CRITICAL
  // 2. Subscription in grace period - WARNING
  // 3. Verification rejected - ERROR
  // 4. Verification pending - INFO
  // 5. Profile incomplete - INFO (handled by ProfileCompletionBanner)

  // CRITICAL: Subscription expired (outside grace period)
  if (subscriptionStatus.isExpired && !subscriptionStatus.inGracePeriod) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-6 shadow-lg">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">⚠️</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-red-800 mb-2">
              Subscription Expired - Access Restricted
            </h3>
            <p className="text-red-700 mb-4">
              Your BMTOA subscription has expired and the 5-day grace period has ended. 
              Most features are now restricted. Please renew your subscription to restore full access.
            </p>
            <div className="bg-red-100 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-red-800 mb-2">Restricted Features:</h4>
              <ul className="list-disc list-inside text-red-700 space-y-1 text-sm">
                <li>Fleet management (adding/editing vehicles)</li>
                <li>Driver management (adding/assigning drivers)</li>
                <li>Accepting new ride requests</li>
                <li>Revenue tracking and reports</li>
              </ul>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="danger" 
                size="md"
                onClick={() => navigate('/operator/membership')}
              >
                Renew Subscription Now
              </Button>
              <Button 
                variant="outline" 
                size="md"
                onClick={() => window.open('https://wa.me/263123456789', '_blank')}
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // WARNING: Subscription in grace period
  if (subscriptionStatus.inGracePeriod) {
    return (
      <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6 mb-6 shadow-lg">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">⏰</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-orange-800 mb-2">
              Subscription Expired - Grace Period Active
            </h3>
            <p className="text-orange-700 mb-4">
              Your BMTOA subscription has expired. You have{' '}
              <span className="font-bold text-orange-900">
                {subscriptionStatus.daysRemaining} day{subscriptionStatus.daysRemaining !== 1 ? 's' : ''}
              </span>{' '}
              remaining in your grace period to renew before access is restricted.
            </p>
            <div className="bg-orange-100 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-800">Grace Period Progress</span>
                <span className="text-sm font-bold text-orange-900">
                  {subscriptionStatus.daysRemaining} / 5 days remaining
                </span>
              </div>
              <div className="w-full bg-orange-200 rounded-full h-3">
                <div 
                  className="bg-orange-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(subscriptionStatus.daysRemaining / 5) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="warning" 
                size="md"
                onClick={() => navigate('/operator/membership')}
              >
                Renew Subscription
              </Button>
              <Button 
                variant="outline" 
                size="md"
                onClick={() => window.open('https://wa.me/263123456789', '_blank')}
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ERROR: Verification rejected
  if (isVerificationRejected) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-6 shadow-lg">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">❌</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-red-800 mb-2">
              Verification Rejected - Action Required
            </h3>
            <p className="text-red-700 mb-4">
              Your operator profile verification has been rejected by BMTOA admin. 
              Please review the feedback, update your profile, and resubmit for verification.
            </p>
            <div className="bg-red-100 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-red-800 mb-2">Restricted Until Verified:</h4>
              <ul className="list-disc list-inside text-red-700 space-y-1 text-sm">
                <li>Adding or managing drivers</li>
                <li>Adding or managing vehicles</li>
                <li>Accepting ride requests</li>
                <li>Driver assignment features</li>
              </ul>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="danger" 
                size="md"
                onClick={() => navigate('/operator/settings')}
              >
                Update Profile & Resubmit
              </Button>
              <Button 
                variant="outline" 
                size="md"
                onClick={() => navigate('/operator/support')}
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // INFO: Verification pending
  if (isVerificationPending) {
    return (
      <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 mb-6 shadow-lg">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">⏳</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-blue-800 mb-2">
              Verification Pending - Limited Access
            </h3>
            <p className="text-blue-700 mb-4">
              Your operator profile is currently under review by BMTOA admin. 
              Some features are temporarily restricted until verification is complete.
            </p>
            <div className="bg-blue-100 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-800 mb-2">Temporarily Restricted:</h4>
              <ul className="list-disc list-inside text-blue-700 space-y-1 text-sm">
                <li>Adding or managing drivers</li>
                <li>Adding or managing vehicles</li>
                <li>Accepting ride requests</li>
                <li>Driver assignment features</li>
              </ul>
              <p className="text-blue-600 text-sm mt-3">
                ✓ You can still view existing data and update your profile
              </p>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                size="md"
                onClick={() => navigate('/operator/settings')}
              >
                View Profile Status
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No restrictions - don't show banner
  return null;
};

export default OperatorRestrictionBanner;

