/**
 * ProfileCompletionModal - Main Profile Completion Wrapper
 * TaxiCab Platform
 * 
 * Shows after login if profile is incomplete
 * Can be dismissed but forced after 3 logins
 */

import React, { useState, useEffect } from 'react';
import Icon from '../ui/AppIcon';
import Button from '../ui/Button';
import useAuthStore from '../../stores/authStore';
import useProfileCompletion from '../../hooks/useProfileCompletion';
import IndividualProfileForm from './IndividualProfileForm';
import CorporateProfileForm from './CorporateProfileForm';
import DriverProfileForm from './DriverProfileForm';

const ProfileCompletionModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [canDismiss, setCanDismiss] = useState(true);
  
  const user = useAuthStore((state) => state.user);
  const {
    completionPercentage,
    completionStatus,
    shouldShowCompletionModal,
    dismissCompletionModal,
  } = useProfileCompletion(user);

  // Check if modal should be shown
  useEffect(() => {
    if (user && shouldShowCompletionModal) {
      setIsOpen(true);
      // ALWAYS allow dismissing for drivers - they can view status page instead
      setCanDismiss(true);
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

  // Individual users don't need profile completion (optional)
  if (userType === 'individual') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <div
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button - Always visible with high z-index */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-lg z-[60] border border-gray-200"
            aria-label="Close modal"
          >
            <Icon name="X" className="w-6 h-6 text-gray-700" />
          </button>

          <div className="p-8">
            <IndividualProfileForm onComplete={handleComplete} onSkip={handleClose} />
          </div>
        </div>
      </div>
    );
  }

  // Corporate and Driver users need profile completion
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Always visible with high z-index */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-lg z-[60] border border-gray-200"
          aria-label="Close modal"
        >
          <Icon name="X" className="w-6 h-6 text-gray-700" />
        </button>

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
              <p className="mt-1 text-sm text-gray-600">
                Complete your profile to unlock all features
              </p>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{completionPercentage}%</p>
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
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeDasharray={`${completionPercentage}, 100`}
                  />
                </svg>
              </div>
            </div>
          </div>

        </div>

        {/* Content */}
        <div className="p-8">
          {userType === 'corporate' && (
            <CorporateProfileForm onComplete={handleComplete} canDismiss={canDismiss} />
          )}
          
          {userType === 'driver' && (
            <DriverProfileForm onComplete={handleComplete} canDismiss={canDismiss} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;

