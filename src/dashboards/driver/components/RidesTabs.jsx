/**
 * RidesTabs Component
 * 
 * Presentational component for tab navigation in driver rides feed.
 * Follows existing DriverRidesHub tab styling patterns.
 */

import React from 'react';

const RidesTabs = ({ activeTab, onTabChange, counts }) => {
  const tabs = [
    {
      id: 'AVAILABLE',
      label: 'Available',
      icon: '🔍',
      count: counts.available,
      activeColor: 'text-blue-600 border-b-2 border-blue-600 bg-blue-50',
      badgeColor: 'bg-blue-600'
    },
    {
      id: 'BID',
      label: 'My Bids',
      icon: '⏰',
      count: counts.bid,
      activeColor: 'text-yellow-600 border-b-2 border-yellow-600 bg-yellow-50',
      badgeColor: 'bg-yellow-600'
    },
    {
      id: 'ACTIVE',
      label: 'In Progress',
      icon: '🚗',
      count: counts.active,
      activeColor: 'text-green-600 border-b-2 border-green-600 bg-green-50',
      badgeColor: 'bg-green-600'
    },
    {
      id: 'COMPLETED',
      label: 'Completed',
      icon: '✅',
      count: counts.completed,
      activeColor: 'text-purple-600 border-b-2 border-purple-600 bg-purple-50',
      badgeColor: 'bg-purple-600'
    }
  ];

  return (
    <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-shrink-0 px-6 py-3.5 text-center font-medium transition-all relative whitespace-nowrap ${
            activeTab === tab.id
              ? tab.activeColor
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          aria-label={`${tab.label} tab`}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-base">{tab.icon}</span>
            <span className="text-sm font-semibold">{tab.label}</span>
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 ${tab.badgeColor} text-white text-xs rounded-full font-semibold`}>
                {tab.count}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default RidesTabs;
