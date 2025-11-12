import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useProfileStore from '../stores/profileStore';
import useAuthStore from '../stores/authStore';
import { isComingSoon } from '../config/profileAvailability';


/**
 * Shared Profile Switching Hook
 *
 * Provides unified profile switching logic used across:
 * - ProfileSwitcher modal (hamburger menu)
 * - ModeSelection page (root profile selection)
 *
 * Returns:
 * - handleProfileSwitch: function to switch profiles
 * - switching: boolean indicating if switch is in progress
 * - confirmationModal: object with modal state and handlers
 */
const useProfileSwitch = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    checkProfileExists,
    switchToProfile,
    createProfile,
    activeProfileType
  } = useProfileStore();

  const [switching, setSwitching] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'info'
  });

  /**
   * Get the appropriate route for a profile based on its status
   * Always allows navigation - the destination page will show appropriate status view
   */
  const getProfileRoute = (profileType, profileData) => {
    if (profileType === 'individual') {
      return '/user/book-ride';
    } else if (profileType === 'corporate') {
      // Corporate is in phased rollout; send to status when marked Coming Soon
      return isComingSoon('corporate') ? '/corporate/status' : '/corporate/book-ride';
    } else if (profileType === 'driver') {
      // Driver routing based on profile status
      // Always allow navigation - ProfilePage will show appropriate status view
      const profileStatus = profileData?.profile_status;
      const approvalStatus = profileData?.approval_status;

      if (profileStatus === 'approved' && approvalStatus === 'approved') {
        // Fully approved - go to rides
        return '/driver/rides';
      } else if (profileStatus === 'pending_approval' || approvalStatus === 'pending') {
        // Pending approval - go to status page
        return '/driver/status';
      } else if (profileStatus === 'rejected' || approvalStatus === 'rejected') {
        // Rejected - go to profile page (can resubmit)
        return '/driver/profile';
      } else if (profileStatus === 'incomplete' || profileStatus === 'in_progress') {
        // Incomplete - go to profile page
        return '/driver/profile';
      } else {
        // Default to profile page
        return '/driver/profile';
      }
    } else if (profileType === 'operator') {
      // Operator is PWA-disabled; always go to status (Coming Soon)
      return '/operator/status';
    }
    return '/';
  };

  // Profile configurations
  const profileConfigs = {
    individual: {
      title: 'Passenger',
    },
    corporate: {
      title: 'Corporate',
    },
    driver: {
      title: 'Driver',
    },
    operator: {
      title: 'Operator',
    }
  };

  /**
   * Show confirmation modal
   */
  const showConfirmation = (title, message, onConfirm, type = 'info') => {
    setConfirmationModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      type
    });
  };

  /**
   * Close confirmation modal
   */
  const closeConfirmation = () => {
    setConfirmationModal({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: null,
      type: 'info'
    });
  };

  /**
   * Show error modal
   */
  const showError = (message) => {
    showConfirmation(
      'Error',
      message,
      () => {},
      'error'
    );
  };

  /**
   * Handle profile switching - ALWAYS allows navigation
   *
   * Flow:
   * 1. Switch the active_profile_type unconditionally
   * 2. Navigate to the appropriate route for that profile type
   * 3. The destination page will check profile status and show appropriate view:
   *    - Incomplete: Show profile completion form
   *    - Pending approval: Show "awaiting approval" status page
   *    - Approved: Show full functionality
   *    - Rejected: Show rejection message with resubmit option
   *
   * NO MODALS OR BLOCKING - Navigation is always allowed
   */
  const handleProfileSwitch = async (profileType, onSuccess = null) => {
    console.log('🔄 handleProfileSwitch called with profileType:', profileType);

    const config = profileConfigs[profileType];
    if (!config) {
      console.error(`Unknown profile type: ${profileType}`);
      return;
    }

    setSwitching(true);

    try {
      // STEP 1: Check if target profile exists
      console.log(`Checking database for ${profileType} profile...`);
      const profileData = await checkProfileExists(user.id, profileType);
      console.log('Profile data:', profileData);

      // STEP 2: If profile doesn't exist, handle creation/flow by type
      if (!profileData) {
        console.log(`${profileType} profile not found. Handling creation/flow...`);
        if (profileType === 'individual' || profileType === 'corporate') {
          if (profileType === 'corporate' && isComingSoon('corporate')) {
            // Do not create corporate while Coming Soon; just switch and show status
            await switchToProfile(user.id, profileType);
            console.log('Corporate is Coming Soon. Navigating to /corporate/status');
            navigate('/corporate/status');
            if (onSuccess) onSuccess();
            return;
          }
          // Auto-create Individual/Corporate (when not Coming Soon) as complete+approved+active
          const created = await createProfile(user.id, profileType);
          if (!created?.success) {
            throw new Error(created?.error || `Failed to create ${profileType} profile`);
          }
          await switchToProfile(user.id, profileType);
          const route = getProfileRoute(profileType, created.data);
          console.log(`Created ${profileType} profile. Navigating to ${route}`);
          navigate(route);
          if (onSuccess) onSuccess();
          return;
        }

        if (profileType === 'driver') {
          // Do not auto-create; send user to driver profile form
          await switchToProfile(user.id, profileType);
          console.log('Navigating to /driver/profile for new driver profile setup');
          navigate('/driver/profile');
          if (onSuccess) onSuccess();
          return;
        }

        if (profileType === 'operator') {
          // Do not auto-create; send user to operator status (will reflect state)
          await switchToProfile(user.id, profileType);
          console.log('Navigating to /operator/status for operator setup/status');
          navigate('/operator/status');
          if (onSuccess) onSuccess();
          return;
        }
      }

      // STEP 3: Profile exists - switch and navigate based on status
      console.log(`Switching to existing ${profileType} profile...`);
      const result = await switchToProfile(user.id, profileType);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to switch profile');
      }

      const route = getProfileRoute(profileType, profileData);
      console.log(`Successfully switched to ${config.title} profile, navigating to ${route}`);
      navigate(route);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error during profile switch:', error);
      showError(`An error occurred while switching profiles. Please try again.`);
    } finally {
      setSwitching(false);
    }
  };

  return {
    handleProfileSwitch,
    switching,
    confirmationModal: {
      ...confirmationModal,
      onClose: closeConfirmation
    }
  };
};

export default useProfileSwitch;

