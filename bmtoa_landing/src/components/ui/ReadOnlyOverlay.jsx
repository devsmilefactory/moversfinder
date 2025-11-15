/**
 * ReadOnlyOverlay - Feature Restriction Overlay
 * BMTOA Platform
 * 
 * Overlays restricted features when profile is incomplete or grace period expired
 * Shows "Complete Profile" message and button
 * Prevents interaction with restricted features
 */

import React from 'react';
import Icon from '../AppIcon';
import Button from './Button';
import useAuthStore from '../../stores/authStore';
import useProfileCompletion from '../../hooks/useProfileCompletion';

const ReadOnlyOverlay = ({ children, featureName }) => {
  const user = useAuthStore((state) => state.user);
  const {
    isReadOnly,
    isFeatureRestricted,
    getRestrictionMessage,
    gracePeriodActive,
  } = useProfileCompletion(user);

  const handleComplete = () => {
    window.dispatchEvent(new CustomEvent('openProfileCompletionModal'));
  };

  // Check if this specific feature is restricted
  const restricted = featureName ? isFeatureRestricted(featureName) : isReadOnly;

  if (!restricted) {
    return <>{children}</>;
  }

  const message = featureName 
    ? getRestrictionMessage(featureName)
    : gracePeriodActive
    ? 'Complete your profile before grace period expires to access this feature'
    : 'Complete your profile to access this feature';

  return (
    <div className="relative">
      {/* Blurred Content */}
      <div className="pointer-events-none select-none blur-sm opacity-50">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Lock" className="w-8 h-8 text-[#FFC107]" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Feature Locked
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            {message}
          </p>
          
          <Button
            onClick={handleComplete}
            className="bg-[#334155] hover:bg-[#FFC107] hover:text-[#334155] text-white"
          >
            <Icon name="Edit" className="w-4 h-4 mr-2" />
            Complete Profile
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReadOnlyOverlay;

