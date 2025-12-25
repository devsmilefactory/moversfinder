import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../dashboards/shared/Button';
import useProfileStore from '../../stores/profileStore';
import useAuthStore from '../../stores/authStore';
import useDriverStore from '../../stores/driverStore';
import { getDriverStatus } from '../../utils/driverStatusCheck';
import { useToast } from '../ui/ToastProvider';


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
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [justApproved, setJustApproved] = useState(false);

  const navigate = useNavigate();
  const { activeProfile, activeProfileType, refreshProfiles, switchToProfile, checkProfileExists, loadProfileData } = useProfileStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();

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
  }, [profileType, user?.id, loadDocuments]);

  // Use unified status check for drivers - single source of truth
  // ALWAYS use unified calculation for drivers to ensure consistency
  // Wait for documents to load before calculating (docsReady ensures documents are loaded)
  const driverStatus = profileType === 'driver' && docsReady && activeProfile
    ? getDriverStatus(activeProfile, documents || [])
    : null;

  // Reset justApproved flag when status changes
  useEffect(() => {
    if (driverStatus && !driverStatus.canAccessRides) {
      setJustApproved(false);
    }
  }, [driverStatus]);

  // For drivers, ALWAYS use unified status calculation (hardcoded to use same logic everywhere)
  // This ensures status page and profile edit page show the same completion percentage
  // For others, use legacy logic
  const approvalStatus = driverStatus?.approvalStatus || activeProfile?.approval_status || 'pending';
  
  // CRITICAL: Always use unified calculation for drivers - never use DB stored value
  // This ensures consistency between status page and profile edit page
  const completionPercentage = profileType === 'driver' && driverStatus
    ? driverStatus.completionPercentage  // Always from unified computeDriverCompletion calculation
    : (activeProfile?.completion_percentage ?? 0);
    
  const accountStatus = driverStatus?.accountStatus || activeProfile?.account_status || user?.account_status || 'active';
  const rejectionReason = driverStatus?.rejectionReason || activeProfile?.rejection_reason;
  const suspensionReason = user?.suspension_reason;
  
  // CRITICAL: Always use unified calculation for drivers
  const isProfileComplete = profileType === 'driver' && driverStatus
    ? driverStatus.isProfileComplete  // Always from unified calculation
    : (
      String(activeProfile?.profile_completion_status || 'incomplete').toLowerCase() === 'complete' || 
      Number(completionPercentage) >= 100
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

  // Handle refresh status - check latest status and show current state
  const handleRefreshStatus = async () => {
    if (!user?.id) {
      addToast({ type: 'error', message: 'User not found' });
      return;
    }
    try {
      setRefreshingStatus(true);
      setJustApproved(false);
      
      // Refresh all profile data
      await refreshProfiles(user.id);
      if (profileType === 'driver') {
        await loadProfileData(user.id, 'driver');
        await loadDocuments(user.id);
        
        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Re-fetch fresh data directly from database to check latest status
        const { supabase } = await import('../../lib/supabase');
        const { data: refreshedProfile } = await supabase
          .from('driver_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (refreshedProfile) {
          const { data: refreshedDocs } = await supabase
            .from('driver_documents')
            .select('*')
            .eq('driver_id', user.id);
          
          const refreshedStatus = getDriverStatus(refreshedProfile, refreshedDocs || []);
          
          // If approved after refresh, show CTA to start accepting rides
          if (refreshedStatus.canAccessRides) {
            setJustApproved(true);
            addToast({ type: 'success', message: 'Profile approved! You can now start accepting rides.' });
            // Force re-render by updating state
            await refreshProfiles(user.id);
            await loadProfileData(user.id, 'driver');
            setRefreshingStatus(false);
            return;
          } else {
            addToast({ type: 'info', message: `Status: ${refreshedStatus.state === 'incomplete' ? 'Profile incomplete' : 'Approval pending'}` });
          }
        } else {
          addToast({ type: 'info', message: 'Profile not found. Please complete your profile.' });
        }
      } else {
        addToast({ type: 'success', message: 'Status refreshed' });
      }
      setRefreshingStatus(false);
    } catch (e) {
      console.error('Failed to refresh status', e);
      addToast({ type: 'error', message: 'Failed to refresh status. Please try again.' });
      setRefreshingStatus(false);
    }
  };

  // Handle view profile - navigate to profile page
  const handleViewProfile = useCallback((e) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileStatusPage.jsx:239',message:'handleViewProfile called',data:{profileType,currentPath:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('[ProfileStatusPage] View Profile clicked', { profileType, user: user?.id });
    
    if (profileType === 'driver') {
      console.log('[ProfileStatusPage] Navigating to /driver/profile');
      const targetPath = '/driver/profile';
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileStatusPage.jsx:250',message:'About to call navigate',data:{targetPath,currentPath:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'J'})}).catch(()=>{});
        // #endregion
        navigate(targetPath, { replace: false });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileStatusPage.jsx:251',message:'navigate() called',data:{targetPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'J'})}).catch(()=>{});
        // #endregion
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileStatusPage.jsx:252',message:'Navigation error',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'K'})}).catch(()=>{});
        // #endregion
        console.error('[ProfileStatusPage] Navigation error, using window.location:', error);
        window.location.href = targetPath;
      }
    } else if (profileType === 'operator') {
      navigate('/operator/profile', { replace: false });
    } else {
      handleOpenProfileForm();
    }
  }, [profileType, user?.id, navigate]);

  // Handle edit profile - navigate to profile page in edit mode
  const handleEditProfile = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('[ProfileStatusPage] Edit Profile clicked', { profileType, user: user?.id });
    
    if (profileType === 'driver') {
      console.log('[ProfileStatusPage] Navigating to /driver/profile with edit mode');
      const targetPath = '/driver/profile';
      try {
        navigate(targetPath, { state: { edit: true }, replace: false });
      } catch (error) {
        console.error('[ProfileStatusPage] Navigation error, using window.location:', error);
        window.location.href = `${targetPath}?edit=true`;
      }
    } else if (profileType === 'operator') {
      navigate('/operator/profile', { state: { edit: true }, replace: false });
    } else {
      handleOpenProfileForm();
    }
  }, [profileType, user?.id, navigate]);

  // Handle start accepting rides - navigate to rides page
  const handleStartAcceptingRides = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('[ProfileStatusPage] Start Accepting Rides clicked');
    const targetPath = '/driver/rides';
    try {
      navigate(targetPath, { replace: true });
    } catch (error) {
      console.error('[ProfileStatusPage] Navigation error, using window.location:', error);
      window.location.href = targetPath;
    }
  }, [navigate]);

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

          {/* Action Buttons - Only Refresh Status, View Profile, Edit Profile */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              variant="primary"
              size="lg"
              disabled={refreshingStatus}
              onClick={handleRefreshStatus}
              className="bg-yellow-400 text-slate-900 hover:bg-yellow-500"
            >
              {refreshingStatus ? 'Refreshing...' : 'Refresh Status'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={(e) => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileStatusPage.jsx:475',message:'View Profile button clicked',data:{pathname:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'J'})}).catch(()=>{});
                // #endregion
                console.log('View Profile button clicked directly');
                handleViewProfile(e);
              }}
              type="button"
            >
              View Profile
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={(e) => {
                console.log('Edit Profile button clicked directly');
                handleEditProfile(e);
              }}
              type="button"
            >
              Edit Profile
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

          {/* CTA Buttons - Only Refresh Status, View Profile, Edit Profile */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              variant="primary"
              size="lg"
              disabled={refreshingStatus}
              onClick={handleRefreshStatus}
              className="bg-yellow-400 text-slate-900 hover:bg-yellow-500"
            >
              {refreshingStatus ? 'Refreshing...' : 'Refresh Status'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={(e) => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileStatusPage.jsx:475',message:'View Profile button clicked',data:{pathname:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'J'})}).catch(()=>{});
                // #endregion
                console.log('View Profile button clicked directly');
                handleViewProfile(e);
              }}
              type="button"
            >
              View Profile
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={(e) => {
                console.log('Edit Profile button clicked directly');
                handleEditProfile(e);
              }}
              type="button"
            >
              Edit Profile
            </Button>
          </div>

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

  // STATE 2: Approval Pending (only after profile is complete)
  // Check if just approved after refresh - show CTA to start accepting rides
  if (isProfileComplete && (approvalStatus === 'pending' || approvalStatus === 'under_review')) {
    // If just approved after refresh, show approved state with CTA
    if (justApproved && driverStatus?.canAccessRides) {
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
              Your Driver profile is complete and approved. You're all set to start accepting rides!
            </p>

            {/* CTA Button - Start Accepting Rides */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Button
                variant="primary"
                size="lg"
                onClick={(e) => {
                  console.log('Start Accepting Rides button clicked directly');
                  handleStartAcceptingRides(e);
                }}
                type="button"
                className="bg-green-500 text-white hover:bg-green-600 px-8"
              >
                Start Accepting Rides
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={(e) => {
                  console.log('View Profile button clicked directly (approved state)');
                  handleViewProfile(e);
                }}
                type="button"
              >
                View Profile
              </Button>
            </div>

            {/* Info */}
            <div className="mt-8 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Ready to go!</strong> Click the button above to start accepting ride requests and earning money.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Still pending - show pending message
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⏳</span>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Approval Pending
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            Your profile is currently under review. You will be notified once your account has been approved.
          </p>

          {/* Action Buttons - Only Refresh Status, View Profile, Edit Profile */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              variant="primary"
              size="lg"
              disabled={refreshingStatus}
              onClick={handleRefreshStatus}
              className="bg-yellow-400 text-slate-900 hover:bg-yellow-500"
            >
              {refreshingStatus ? 'Refreshing...' : 'Refresh Status'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={(e) => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/f9cc1608-1488-4be4-8f82-84524eec9f81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileStatusPage.jsx:475',message:'View Profile button clicked',data:{pathname:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'J'})}).catch(()=>{});
                // #endregion
                console.log('View Profile button clicked directly');
                handleViewProfile(e);
              }}
              type="button"
            >
              View Profile
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={(e) => {
                console.log('Edit Profile button clicked directly');
                handleEditProfile(e);
              }}
              type="button"
            >
              Edit Profile
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
  if (approvalStatus === 'approved' || (driverStatus && driverStatus.canAccessRides)) {
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
            Your Driver profile is complete and approved. You're all set to start accepting rides!
          </p>

          {/* CTA Button - Start Accepting Rides */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button
              variant="primary"
              size="lg"
              onClick={(e) => {
                console.log('Start Accepting Rides button clicked directly (approved state final)');
                handleStartAcceptingRides(e);
              }}
              type="button"
              className="bg-green-500 text-white hover:bg-green-600 px-8"
            >
              Start Accepting Rides
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={(e) => {
                console.log('View Profile button clicked directly (approved state final)');
                handleViewProfile(e);
              }}
              type="button"
            >
              View Profile
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={(e) => {
                console.log('Edit Profile button clicked directly (approved state final)');
                handleEditProfile(e);
              }}
              type="button"
            >
              Edit Profile
            </Button>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Ready to go!</strong> Click the button above to start accepting ride requests and earning money.
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

