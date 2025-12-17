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

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
  const currentIndex = activeIndex === -1 ? 0 : activeIndex;

  return (
    <div className="bg-white border-b border-slate-200 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-0 px-2 py-2 min-w-max">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isCompleted = index < currentIndex;

          return (
            <React.Fragment key={tab.id}>
              <button
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 text-center flex-shrink-0 min-w-[75px] rounded-lg transition-all
                  ${isActive ? `${tab.bgColor} ring-2 ${tab.borderColor} ring-offset-1 shadow-md scale-105` : 'hover:bg-slate-50'}
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                    ${isCompleted ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : ''}
                    ${isActive ? `${tab.bgColor} ${tab.color} border-current shadow-lg` : ''}
                    ${!isActive && !isCompleted ? 'bg-slate-100 text-slate-500 border-slate-300' : ''}
                  `}
                >
                  {isCompleted ? '✓' : index + 1}
                </span>
                <div className="flex flex-col items-center gap-0">
                  <span className={`text-[10px] font-bold ${isActive ? tab.color : 'text-slate-600'}`}>
                    {tab.label}
                  </span>
                  <div className="flex items-center gap-0.5 text-[10px] text-slate-500">
                    <Icon className={`w-3 h-3 ${isActive ? tab.color : 'text-slate-400'}`} />
                    {tab.count > 0 && (
                      <span
                        className={`px-1 py-0 rounded-full text-[10px] font-bold ${
                          isActive ? `bg-white border ${tab.borderColor}` : tab.bgColor
                        } ${tab.color}`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              {index < tabs.length - 1 && (
                <div
                  className={`h-0.5 w-8 ${isCompleted ? 'bg-emerald-500' : isActive ? 'bg-slate-300' : 'bg-slate-200'}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default RideTabs;

