/**
 * ProfileCompletionModal - Main Profile Completion Wrapper
 * BMTOA Platform
 * 
 * Shows after login if profile is incomplete
 * Can be dismissed but forced after 3 logins
 * Includes grace period tracking for operators
 */

import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';
import Button from '../ui/Button';
import useAuthStore from '../../stores/authStore';
import useProfileCompletion from '../../hooks/useProfileCompletion';
import DriverProfileForm from './DriverProfileForm';
import OperatorProfileForm from './OperatorProfileForm';

const ProfileCompletionModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [canDismiss, setCanDismiss] = useState(true);
  
  const user = useAuthStore((state) => state.user);
  const {
    completionPercentage,
    completionStatus,
    shouldShowCompletionModal,
    gracePeriodActive,
    gracePeriodDaysRemaining,
    dismissCompletionModal,
  } = useProfileCompletion(user);

  // Check if modal should be shown
  useEffect(() => {
    if (user && shouldShowCompletionModal) {
      setIsOpen(true);
      // Can't dismiss if forced (after 3 logins)
      const loginCount = user.login_count || 0;
      setCanDismiss(loginCount < 3);
    }
  }, [user, shouldShowCompletionModal]);

  // Listen for manual trigger
  useEffect(() => {
    const handleOpenModal = () => {
      setIsOpen(true);
      setCanDismiss(true);
    };

    window.addEventListener('openProfileCompletionModal', handleOpenModal);
    return () => window.removeEventListener('openProfileCompletionModal', handleOpenModal);
  }, []);

  const handleClose = () => {
    if (!canDismiss) {
      // Show warning that profile completion is required
      alert('Profile completion is required to continue using BMTOA. Please complete your profile.');
      return;
    }
    
    setIsOpen(false);
    dismissCompletionModal();
  };

  const handleComplete = () => {
    setIsOpen(false);
    
    // Dispatch completion event
    window.dispatchEvent(new CustomEvent('profileCompleted', {
      detail: { user }
    }));

    // Refresh page to update access level
    window.location.reload();
  };

  if (!isOpen || !user) return null;

  const userType = user.user_type || user.userType;
  const isOperator = userType === 'taxi_operator' || userType === 'operator';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button (only if can dismiss) */}
        {canDismiss && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
          >
            <Icon name="X" className="w-5 h-5 text-gray-500" />
          </button>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
              <p className="mt-1 text-sm text-gray-600">
                {canDismiss 
                  ? 'Complete your profile to unlock all BMTOA features'
                  : 'Profile completion is required to continue'
                }
              </p>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-[#FFC107]">{completionPercentage}%</p>
                <p className="text-xs text-gray-500">Complete</p>
              </div>
              <div className="w-16 h-16">
                <svg className="transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#FFC107"
                    strokeWidth="3"
                    strokeDasharray={`${completionPercentage}, 100`}
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Grace Period Banner (for operators) */}
          {isOperator && gracePeriodActive && (
            <div className={`mt-4 p-3 border rounded-lg flex items-start gap-2 ${
              gracePeriodDaysRemaining <= 1 
                ? 'bg-red-50 border-red-200'
                : gracePeriodDaysRemaining <= 3
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <Icon name="Clock" className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                gracePeriodDaysRemaining <= 1 
                  ? 'text-red-600'
                  : gracePeriodDaysRemaining <= 3
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  gracePeriodDaysRemaining <= 1 
                    ? 'text-red-900'
                    : gracePeriodDaysRemaining <= 3
                    ? 'text-yellow-900'
                    : 'text-green-900'
                }`}>
                  Grace Period: {gracePeriodDaysRemaining} {gracePeriodDaysRemaining === 1 ? 'day' : 'days'} remaining
                </p>
                <p className={`text-xs mt-1 ${
                  gracePeriodDaysRemaining <= 1 
                    ? 'text-red-700'
                    : gracePeriodDaysRemaining <= 3
                    ? 'text-yellow-700'
                    : 'text-green-700'
                }`}>
                  You have limited access until your profile is complete and BMTOA verified.
                  {gracePeriodDaysRemaining <= 3 && ' Complete your profile soon to avoid access restrictions.'}
                </p>
              </div>
            </div>
          )}

          {/* Warning if forced */}
          {!canDismiss && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <Icon name="AlertTriangle" className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Profile Completion Required</p>
                <p className="text-xs text-yellow-700 mt-1">
                  You've logged in 3 times without completing your profile. Please complete it now to continue using BMTOA.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {userType === 'driver' && (
            <DriverProfileForm onComplete={handleComplete} canDismiss={canDismiss} />
          )}
          
          {isOperator && (
            <OperatorProfileForm onComplete={handleComplete} canDismiss={canDismiss} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;

