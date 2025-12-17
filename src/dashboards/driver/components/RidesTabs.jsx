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

  const connectorColor = (index) => {
    if (index < currentIndex) return 'bg-emerald-500';
    if (index === currentIndex) return 'bg-yellow-400';
    return 'bg-gray-200';
  };

  const getStepClasses = (isActive, isCompleted) => {
    const baseClasses =
      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 transition-all min-w-[110px] justify-center shadow-sm font-semibold';

    if (isActive) {
      return `${baseClasses} bg-yellow-400 border-yellow-500 text-slate-900 ring-2 ring-yellow-200 shadow-lg scale-105`;
    }

    if (isCompleted) {
      return `${baseClasses} bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100`;
    }

    return `${baseClasses} bg-white border-gray-300 text-gray-700 hover:border-yellow-400 hover:bg-yellow-50 hover:text-slate-900`;
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
              className="flex items-center gap-1.5 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2"
              aria-current={isActive ? 'page' : undefined}
              type="button"
            >
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
            </button>
            {index < steps.length - 1 && (
              <div className={`h-0.5 w-6 md:w-10 ${connectorColor(index)}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default RidesTabs;
