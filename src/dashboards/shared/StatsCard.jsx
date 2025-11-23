import React from 'react';

/**
 * Stats Card Component
 * Reusable card for displaying key metrics
 * Supabase-ready with real-time data support
 */
const StatsCard = ({
  title,
  value,
  change,
  changeType = 'neutral', // 'positive', 'negative', 'neutral'
  icon,
  iconBgColor = 'bg-yellow-100',
  iconColor = 'text-yellow-600',
  trend,
  loading = false,
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive':
        return '↗';
      case 'negative':
        return '↘';
      default:
        return '→';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-slate-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-20"></div>
          </div>
          <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* Title */}
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>

          {/* Value */}
          <h3 className="text-3xl font-bold text-slate-700 mb-2">{value}</h3>

          {/* Change Indicator */}
          {change && (
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${getChangeColor()}`}>
                {getChangeIcon()} {change}
              </span>
              {trend && (
                <span className="text-xs text-slate-500">{trend}</span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
            <span className={`text-2xl ${iconColor}`}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;

