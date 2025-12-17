/**
 * ProfileCompletionBanner - Persistent Profile Completion Reminder
 * BMTOA Platform
 * 
 * Shows at top of dashboard when profile is incomplete
 * Displays completion percentage and CTA button
 * Can be dismissed but reappears on next login
 */

import React from 'react';
import Icon from '../AppIcon';
import Button from './Button';
import useAuthStore from '../../stores/authStore';
import useProfileCompletion from '../../hooks/useProfileCompletion';

const ProfileCompletionBanner = () => {
  const user = useAuthStore((state) => state.user);
  const {
    completionPercentage,
    shouldShowBanner,
    requiredFields,
    dismissBanner,
  } = useProfileCompletion(user);

  const handleComplete = () => {
    window.dispatchEvent(new CustomEvent('openProfileCompletionModal'));
  };

  const handleDismiss = () => {
    dismissBanner();
  };

  if (!shouldShowBanner || !user) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Message */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-[#FFC107] rounded-full flex items-center justify-center">
                <span className="text-[#334155] font-bold text-sm">{completionPercentage}%</span>
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Complete Your Profile
              </h3>
              <p className="text-xs text-gray-700 mt-0.5">
                {completionPercentage < 50 
                  ? `You're just getting started! Complete your profile to unlock all BMTOA features.`
                  : completionPercentage < 100
                  ? `You're almost there! Just a few more details needed.`
                  : 'Your profile is complete!'
                }
                {requiredFields.length > 0 && (
                  <span className="ml-1">
                    ({requiredFields.length} field{requiredFields.length !== 1 ? 's' : ''} remaining)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleComplete}
              size="sm"
              className="bg-[#334155] hover:bg-[#FFC107] hover:text-[#334155] text-white"
            >
              <Icon name="Edit" className="w-4 h-4 mr-1" />
              Complete Profile
            </Button>
            
            <button
              onClick={handleDismiss}
              className="p-2 rounded-full hover:bg-yellow-200 transition-colors"
              aria-label="Dismiss banner"
            >
              <Icon name="X" className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full h-2 bg-yellow-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#FFC107] transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionBanner;

