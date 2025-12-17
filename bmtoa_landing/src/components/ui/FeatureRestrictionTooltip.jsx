/**
 * FeatureRestrictionTooltip - Tooltip for Restricted Features
 * BMTOA Platform
 * 
 * Wraps buttons/links that are restricted
 * Shows tooltip on hover explaining why feature is locked
 * Disables click interaction
 */

import React, { useState } from 'react';
import Icon from '../AppIcon';
import useAuthStore from '../../stores/authStore';
import useProfileCompletion from '../../hooks/useProfileCompletion';

const FeatureRestrictionTooltip = ({ children, featureName, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const user = useAuthStore((state) => state.user);
  const {
    isFeatureRestricted,
    getRestrictionMessage,
  } = useProfileCompletion(user);

  const restricted = isFeatureRestricted(featureName);

  const handleClick = (e) => {
    if (restricted) {
      e.preventDefault();
      e.stopPropagation();
      // Open profile completion modal
      window.dispatchEvent(new CustomEvent('openProfileCompletionModal'));
    }
  };

  if (!restricted) {
    return <>{children}</>;
  }

  const message = getRestrictionMessage(featureName);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleClick}
    >
      {/* Wrapped Content (disabled) */}
      <div className="opacity-50 cursor-not-allowed pointer-events-none">
        {children}
      </div>

      {/* Lock Icon Overlay */}
      <div className="absolute top-0 right-0 -mt-1 -mr-1">
        <div className="w-5 h-5 bg-[#FFC107] rounded-full flex items-center justify-center">
          <Icon name="Lock" className="w-3 h-3 text-[#334155]" />
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-[#334155] text-white text-xs rounded-lg py-2 px-3 max-w-xs shadow-lg">
            <div className="flex items-start gap-2">
              <Icon name="Lock" className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Feature Locked</p>
                <p className="text-gray-300">{message}</p>
                <p className="text-[#FFC107] mt-1 font-medium">Click to complete profile</p>
              </div>
            </div>
            
            {/* Arrow */}
            <div className={`absolute w-2 h-2 bg-[#334155] transform rotate-45 ${
              position === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' :
              position === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' :
              position === 'left' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2' :
              'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2'
            }`} />
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureRestrictionTooltip;

