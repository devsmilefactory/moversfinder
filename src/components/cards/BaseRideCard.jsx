/**
 * BaseRideCard Component
 * 
 * Foundational card component that provides consistent structure and styling
 * for all ride cards across the application.
 */

import React, { useState } from 'react';

/**
 * BaseRideCard - Base component for all ride cards
 * @param {Object} props
 * @param {Object} props.ride - Ride object
 * @param {string} props.role - User role ('driver' or 'passenger')
 * @param {string} props.context - Card context (e.g., 'available', 'pending', 'active')
 * @param {Function} props.onClick - Click handler for the card
 * @param {Function} props.onAction - Action handler for CTAs
 * @param {boolean} props.showExpandable - Whether to show expandable details
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Card content
 */
const BaseRideCard = ({
  ride,
  role = 'passenger',
  context = 'pending',
  onClick,
  onAction,
  showExpandable = false,
  className = '',
  children
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine border color based on context
  const getBorderColor = () => {
    if (context === 'active') return 'border-blue-300';
    if (context === 'completed') return 'border-green-200';
    if (context === 'cancelled') return 'border-red-200';
    if (context === 'available' && role === 'driver') return 'border-gray-200';
    return 'border-slate-200';
  };

  // Determine hover effects
  const getHoverEffects = () => {
    if (onClick) {
      return 'hover:shadow-md hover:border-blue-400 cursor-pointer';
    }
    return '';
  };

  const handleCardClick = (e) => {
    // Don't trigger card click if clicking on a button or interactive element
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    
    if (onClick) {
      onClick(ride);
    }
  };

  const handleToggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border-2 transition-all ${getBorderColor()} ${getHoverEffects()} ${className}`}
      onClick={handleCardClick}
    >
      {/* Card Content */}
      <div className="p-4">
        {children}
      </div>

      {/* Expandable Details Section */}
      {showExpandable && (
        <>
          {isExpanded && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Ride ID:</span>
                  <div className="font-mono text-xs truncate">{ride?.id || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-500">State:</span>
                  <div className="font-medium">{ride?.state || ride?.ride_status || 'N/A'}</div>
                </div>
                {ride?.execution_sub_state && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Sub-state:</span>
                    <div className="font-medium">{ride.execution_sub_state}</div>
                  </div>
                )}
                {ride?.status_group && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Status Group:</span>
                    <div className="font-medium">{ride.status_group}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Toggle Button */}
          <button
            onClick={handleToggleExpand}
            className="w-full px-4 py-2 text-xs text-gray-600 hover:text-gray-800 border-t border-gray-100 transition-colors font-medium"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </button>
        </>
      )}
    </div>
  );
};

export default BaseRideCard;
