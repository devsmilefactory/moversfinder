import React from 'react';
import { Clock, Car, CheckCircle, XCircle, Bookmark } from 'lucide-react';

/**
 * Tabbed navigation for different ride states
 */
const RideTabs = ({ activeTab, onTabChange, counts }) => {
  const tabs = [
    {
      id: 'pending',
      label: 'Pending',
      icon: Clock,
      count: counts.pending || 0,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-400'
    },
    {
      id: 'active',
      label: 'Active',
      icon: Car,
      count: counts.active || 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-400'
    },
    {
      id: 'completed',
      label: 'Past',
      icon: CheckCircle,
      count: counts.completed || 0,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-400'
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      icon: XCircle,
      count: counts.cancelled || 0,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400'
    },
    {
      id: 'saved',
      label: 'Saved',
      icon: Bookmark,
      count: counts.saved || 0,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-400'
    }
  ];

  return (
    <div className="bg-white border-b border-slate-200 overflow-x-auto">
      <div className="flex gap-1 p-2 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
                ${isActive 
                  ? `${tab.bgColor} ${tab.color} border-2 ${tab.borderColor}` 
                  : 'text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-bold
                  ${isActive ? 'bg-white' : tab.bgColor}
                  ${tab.color}
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RideTabs;

