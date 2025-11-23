import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../dashboards/shared/Button';
import useProfileStore from '../../stores/profileStore';
import useAuthStore from '../../stores/authStore';
import useDriverStore from '../../stores/driverStore';
import { computeDriverCompletion } from '../../utils/driverCompletion';


import ComingSoon from '../common/ComingSoon';
import { isComingSoon } from '../../config/profileAvailability';

/**
 * ProfileStatusPage - Reusable dynamic status page for all profile types
 *
 * Displays different UI states based on:
 * - profile_completion_status (incomplete/complete)
 * - approval_status (pending/approved/rejected)
 * - account_status (active/disabled/suspended)
 *
 * States:
 * 1. Profile Incomplete - Prompt to complete profile
 * 2. Awaiting Approval - Show waiting message with timeline
 * 3. Profile Approved - Success message with CTA to main page
 * 4. Profile Rejected - Show rejection reason with resubmit option
 * 5. Account Disabled - User-initiated disable with reactivate option
 * 6. Account Suspended - Platform-initiated suspension with appeal option
 *
 * @param {Object} props
 * @param {string} props.profileType - Profile type: 'individual', 'corporate', 'driver', 'operator'
 */
const ProfileStatusPage = ({ profileType }) => {
  const { documents, loadDocuments } = useDriverStore();

  const [docsReady, setDocsReady] = useState(profileType !== 'driver');

  const navigate = useNavigate();
  const { activeProfile, activeProfileType, refreshProfiles, switchToProfile, checkProfileExists } = useProfileStore();
  const { user } = useAuthStore();

  // Refresh profile data when component mounts or when navigating to this page
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user?.id) return;
      // Refresh all profiles to get latest data
      await refreshProfiles(user.id);

      // Only attempt switch if the target profile exists to avoid flip-flopping
      if (activeProfileType !== profileType) {
        const exists = await checkProfileExists(user.id, profileType);
        if (!cancelled && exists) {
          await switchToProfile(user.id, profileType);
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user?.id, profileType, activeProfileType]); // Re-run when user or profileType changes

  // Profile type configuration
  const profileConfig = {
    individual: {
      name: 'Individual',
      icon: '👤',
      mainRoute: '/user/book-ride',
      mainAction: 'Start Booking Rides',
      supportRoute: '/user/support',
      requirements: 'Basic profile information and service preferences',
    },
    corporate: {
      name: 'Corporate',
      icon: '🏢',
      mainRoute: '/corporate/book-ride',
      mainAction: 'Start Booking Rides',
      supportRoute: '/corporate/support',
      requirements: 'Company details, business registration, tax ID, billing information',
    },
    driver: {
      name: 'Driver',
      icon: '🚗',
      mainRoute: '/driver/rides',
      mainAction: 'View Available Rides',
      supportRoute: '/driver/support',
      requirements: 'Personal information, driver\'s license, vehicle details, required documents (PSV license, insurance, roadworthy certificate)',
    },
    operator: {
      name: 'Operator',
      icon: '🚕',
      mainRoute: '/operator/dashboard',
      mainAction: 'Go to Dashboard',
      supportRoute: '/operator/support',
      requirements: 'Business details, registration documents, fleet information',
    },
  };
  // Coming Soon gate for phased rollout
  if ((profileType === 'corporate' || profileType === 'operator') && isComingSoon(profileType)) {
    return <ComingSoon profileType={profileType} />;
  }


  const config = profileConfig[profileType] || profileConfig.individual;

  // Get status from activeProfile or user
  // Prefer driver-specific fields from activeProfile; fall back to safe defaults
  const profileCompletionStatus = activeProfile?.profile_completion_status || 'incomplete';
  const profileStatus = activeProfile?.profile_status || 'in_progress'; // legacy/back-compat only
  const dbCompletion = activeProfile?.completion_percentage ?? 0;
  // Ensure driver documents are loaded before rendering completion to avoid flicker
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (profileType !== 'driver' || !user?.id) {
        setDocsReady(true);
        return;
      }
      setDocsReady(false);
      try {
        await loadDocuments(user.id);
      } finally {
        if (!cancelled) setDocsReady(true);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [profileType, user?.id]);

  const approvalStatus = activeProfile?.approval_status || 'pending';

  // Unified driver completion: presence-based, via shared util; fallback to DB field
  const completionPercentage = profileType === 'driver'
    ? computeDriverCompletion(activeProfile || {}, documents || [])
    : dbCompletion;
  const accountStatus = activeProfile?.account_status || user?.account_status || 'active';
  const rejectionReason = activeProfile?.rejection_reason;
  const suspensionReason = user?.suspension_reason;

  // Derived booleans
  const isProfileComplete = (
    String(profileCompletionStatus).toLowerCase() === 'complete' || Number(completionPercentage) >= 100
  );

  // Open profile completion modal or navigate to profile page
  const handleOpenProfileForm = () => {
    // For driver and operator profiles, navigate to dedicated profile page
    if (profileType === 'driver') {
      navigate('/driver/profile');
    } else if (profileType === 'operator') {
      navigate('/operator/profile');
    } else {
      // For individual and corporate, use modal
      window.dispatchEvent(new CustomEvent('openProfileCompletionModal'));
    }
  };

  // Navigate to main page
  const handleGoToMain = () => {
    navigate(config.mainRoute);
  };

  // Navigate to support
  const handleContactSupport = () => {
    navigate(config.supportRoute);
  };

  // Handle reactivate account
  const handleReactivateAccount = async () => {
    // TODO: Implement reactivation logic
    console.log('Reactivate account');
  };

  // Handle appeal suspension
  const handleAppealSuspension = () => {
    // TODO: Implement appeal logic
    navigate(config.supportRoute);
  };

  // STATE 6: Account Suspended (highest priority)
  if (accountStatus === 'suspended') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">🚫</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            Account Suspended
          </h1>

          {/* Message */}
          <p className="text-lg text-slate-600 mb-6">
            Your {config.name} account has been suspended by the platform administrator.
          </p>

          {/* Suspension Reason */}
          {suspensionReason && (
            <div className="mb-8 p-4 bg-red-50 rounded-lg text-left">
              <p className="text-sm font-semibold text-red-900 mb-2">Reason:</p>
              <p className="text-sm text-red-800">{suspensionReason}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={handleAppealSuspension}
            >
              Appeal Suspension
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleContactSupport}
            >
              Contact Support
            </Button>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Need help?</strong> Contact our support team to discuss your account suspension
              and explore options for reinstatement.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // STATE 5: Account Disabled (user-initiated)
  if (accountStatus === 'disabled') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">⏸️</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            Account Disabled
          </h1>

          {/* Message */}
          <p className="text-lg text-slate-600 mb-6">
            Your {config.name} account is currently disabled. You can reactivate it at any time.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button
              variant="primary"
              size="lg"
              onClick={handleReactivateAccount}
              className="px-8"
            >
              Reactivate Account
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleContactSupport}
            >
              Contact Support
            </Button>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Reactivation is instant.</strong> Click the button above to reactivate your account
              and resume using our services.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // STATE 4: Profile Rejected
  if (approvalStatus === 'rejected') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">❌</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            Profile Not Approved
          </h1>

          {/* Message */}
          <p className="text-lg text-slate-600 mb-6">
            Unfortunately, your {config.name} profile application was not approved.
          </p>

          {/* Rejection Reason */}
          {rejectionReason && (
            <div className="mb-8 p-4 bg-red-50 rounded-lg text-left">
              <p className="text-sm font-semibold text-red-900 mb-2">Reason:</p>
              <p className="text-sm text-red-800">{rejectionReason}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={handleOpenProfileForm}
            >
              Resubmit Profile
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleContactSupport}
            >
              Contact Support
            </Button>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Need clarification?</strong> Contact support to understand the rejection reason
              and get guidance on resubmitting your profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // STATE 1: Profile Incomplete
  // Prioritize completeness: if not complete, always prompt to complete profile
  if (!isProfileComplete) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">📝</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            Profile Incomplete
          </h1>

          {/* Message */}
          <p className="text-lg text-slate-600 mb-6">
            Complete your {config.name} profile to access all features and start using our services.
          </p>

          {/* Completion Progress */}
          {(profileType !== 'driver' || docsReady) ? (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Profile Completion</span>
                <span className="text-sm font-bold text-yellow-600">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Profile Completion</span>
                <span className="text-sm font-bold text-yellow-600">—</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div className="bg-slate-300 h-full rounded-full animate-pulse" style={{ width: '25%' }} />
              </div>
            </div>
          )}

          {/* CTA Button */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleOpenProfileForm}
            className="w-full sm:w-auto px-8"
          >
            Complete Profile Now
          </Button>

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>What you need:</strong> {config.requirements}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // STATE 2: Awaiting Approval (only after profile is complete)
  if (isProfileComplete && (approvalStatus === 'pending' || approvalStatus === 'under_review')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">⏳</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            Profile Awaiting Approval
          </h1>

          {/* Message */}
          <p className="text-lg text-slate-600 mb-6">
            Your {config.name} profile has been submitted and is pending admin review.
            You'll be notified once your account has been approved.
          </p>

          {/* Status Timeline */}
          <div className="mb-8 text-left">
            <div className="space-y-4">
              {/* Step 1 - Complete */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">Profile Submitted</h3>
                  <p className="text-sm text-slate-600">Your profile has been submitted for review</p>
                </div>
              </div>

              {/* Step 2 - In Progress */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-sm">⋯</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">Under Review</h3>
                  <p className="text-sm text-slate-600">Admin is reviewing your profile</p>
                </div>
              </div>

              {/* Step 3 - Pending */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-400">Approval</h3>
                  <p className="text-sm text-slate-500">You'll receive a notification when approved</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={handleOpenProfileForm}
            >
              View Profile Details
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleContactSupport}
            >
              Contact Support
            </Button>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Typical review time:</strong> 24-48 hours.
              We'll send you an email and in-app notification once your profile is approved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // STATE 3: Profile Approved
  if (approvalStatus === 'approved') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">✅</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            Profile Approved!
          </h1>

          {/* Message */}
          <p className="text-lg text-slate-600 mb-6">
            Your {config.name} profile is complete and approved. You're all set to start using our services!
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button
              variant="primary"
              size="lg"
              onClick={handleGoToMain}
              className="px-8"
            >
              {config.mainAction}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleOpenProfileForm}
            >
              Update Profile
            </Button>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Ready to go?</strong> Click the button above to start using our services.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default fallback - Loading
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-slate-600">Loading profile status...</p>
      </div>
    </div>
  );
};

export default ProfileStatusPage;

