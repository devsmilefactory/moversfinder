/**
 * GracePeriodBanner - Grace Period Countdown Banner
 * BMTOA Platform (Operators Only)
 * 
 * Shows countdown for operators in grace period
 * Color-coded: Green (>3 days), Yellow (2-3 days), Red (<2 days)
 * Can be dismissed but reappears on next login
 */

import React from 'react';
import Icon from '../AppIcon';
import Button from './Button';
import useAuthStore from '../../stores/authStore';
import useProfileCompletion from '../../hooks/useProfileCompletion';

const GracePeriodBanner = () => {
  const user = useAuthStore((state) => state.user);
  const {
    gracePeriodActive,
    gracePeriodDaysRemaining,
    shouldShowGracePeriodBanner,
    dismissGracePeriodBanner,
    getGracePeriodColor,
  } = useProfileCompletion(user);

  const handleComplete = () => {
    window.dispatchEvent(new CustomEvent('openProfileCompletionModal'));
  };

  const handleDismiss = () => {
    dismissGracePeriodBanner();
  };

  if (!shouldShowGracePeriodBanner || !gracePeriodActive) return null;

  const colorScheme = getGracePeriodColor();
  const isUrgent = gracePeriodDaysRemaining <= 1;
  const isWarning = gracePeriodDaysRemaining <= 3 && gracePeriodDaysRemaining > 1;

  return (
    <div className={`border-b ${
      isUrgent 
        ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
        : isWarning
        ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200'
        : 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Message */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isUrgent 
                  ? 'bg-red-600'
                  : isWarning
                  ? 'bg-yellow-600'
                  : 'bg-green-600'
              }`}>
                <Icon name="Clock" className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className={`text-sm font-semibold ${
                isUrgent 
                  ? 'text-red-900'
                  : isWarning
                  ? 'text-yellow-900'
                  : 'text-green-900'
              }`}>
                {isUrgent 
                  ? '⚠️ Grace Period Ending Soon!'
                  : isWarning
                  ? '⏰ Grace Period Reminder'
                  : '✓ Grace Period Active'
                }
              </h3>
              <p className={`text-xs mt-0.5 ${
                isUrgent 
                  ? 'text-red-700'
                  : isWarning
                  ? 'text-yellow-700'
                  : 'text-green-700'
              }`}>
                You have <strong>{gracePeriodDaysRemaining} {gracePeriodDaysRemaining === 1 ? 'day' : 'days'}</strong> remaining 
                with limited access. Complete your profile to unlock full BMTOA features.
                {isUrgent && ' Your access will become read-only after the grace period expires.'}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleComplete}
              size="sm"
              className={`text-white ${
                isUrgent 
                  ? 'bg-red-600 hover:bg-red-700'
                  : isWarning
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <Icon name="Edit" className="w-4 h-4 mr-1" />
              Complete Now
            </Button>
            
            <button
              onClick={handleDismiss}
              className={`p-2 rounded-full transition-colors ${
                isUrgent 
                  ? 'hover:bg-red-200'
                  : isWarning
                  ? 'hover:bg-yellow-200'
                  : 'hover:bg-green-200'
              }`}
              aria-label="Dismiss banner"
            >
              <Icon name="X" className={`w-4 h-4 ${
                isUrgent 
                  ? 'text-red-600'
                  : isWarning
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`} />
            </button>
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="mt-3">
          <div className={`w-full h-2 rounded-full overflow-hidden ${
            isUrgent 
              ? 'bg-red-200'
              : isWarning
              ? 'bg-yellow-200'
              : 'bg-green-200'
          }`}>
            <div 
              className={`h-full transition-all duration-500 ${
                isUrgent 
                  ? 'bg-red-600'
                  : isWarning
                  ? 'bg-yellow-600'
                  : 'bg-green-600'
              }`}
              style={{ width: `${(gracePeriodDaysRemaining / 7) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${
              isUrgent 
                ? 'text-red-700'
                : isWarning
                ? 'text-yellow-700'
                : 'text-green-700'
            }`}>
              {gracePeriodDaysRemaining} of 7 days remaining
            </span>
            <span className={`text-xs ${
              isUrgent 
                ? 'text-red-700'
                : isWarning
                ? 'text-yellow-700'
                : 'text-green-700'
            }`}>
              {Math.round((gracePeriodDaysRemaining / 7) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GracePeriodBanner;

