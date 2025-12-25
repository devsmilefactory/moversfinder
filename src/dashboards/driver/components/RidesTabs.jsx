/**
 * RidesTabs Component
 * 
 * Presentational component for tab navigation in driver rides feed.
 * Follows existing DriverRidesHub tab styling patterns.
 */

import React from 'react';

const RidesTabs = ({ activeTab, onTabChange, counts = {} }) => {
  const steps = [
    {
      id: 'AVAILABLE',
      label: 'Available',
      icon: '🔍',
      count: counts.available || 0
    },
    {
      id: 'BID',
      label: 'My Bids',
      icon: '⏰',
      count: counts.bid || 0
    },
    {
      id: 'ACTIVE',
      label: 'In Progress',
      icon: '🚗',
      count: counts.active || 0
    },
    {
      id: 'COMPLETED',
      label: 'Completed',
      icon: '✅',
      count: counts.completed || 0
    }
  ];

  const activeIndex = steps.findIndex((step) => step.id === activeTab);
  const currentIndex = activeIndex === -1 ? 0 : activeIndex;

  const getStepClasses = (isActive, isCompleted) => {
    const baseClasses =
      'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all min-w-[110px] justify-center font-semibold';

    if (isActive) {
      return `${baseClasses} text-slate-900`;
    }

    if (isCompleted) {
      return `${baseClasses} text-gray-600 hover:text-gray-900`;
    }

    return `${baseClasses} text-gray-600 hover:text-gray-900`;
  };

  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-200 px-2 py-1 scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {steps.map((step, index) => {
        const isActive = step.id === activeTab;
        const isCompleted = index < currentIndex;

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => onTabChange(step.id)}
              className="relative flex items-center gap-1.5 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 pb-1"
              aria-current={isActive ? 'page' : undefined}
              type="button"
            >
              {/* Green dot indicator at top right for active tab */}
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full z-10"></span>
              )}
              <div className={getStepClasses(isActive, isCompleted)}>
                <span className="text-sm" aria-hidden="true">
                  {step.icon}
                </span>
                <span className="text-xs">{step.label}</span>
                {step.count > 0 && (
                  <span className={`px-1.5 py-0 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-slate-900 text-yellow-400' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {step.count}
                  </span>
                )}
              </div>
              {/* Bottom line indicator for active tab */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></div>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default RidesTabs;
