import React from 'react';

/**
 * Chart Components
 * Simple chart components for dashboard visualizations
 * Note: In production, replace with a proper charting library like Chart.js or Recharts
 * Supabase-ready with real-time data support
 */

// Line Chart Component
export const LineChart = ({ data, title, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-slate-400">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.value / maxValue) * 80;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>
      <div className="relative" style={{ height: `${height}px` }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="0.2"
            />
          ))}
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#FFC107"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Area under line */}
          <polygon
            points={`0,100 ${points} 100,100`}
            fill="url(#gradient)"
            opacity="0.3"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFC107" />
              <stop offset="100%" stopColor="#FFC107" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-500 mt-2">
          {data.map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Bar Chart Component
export const BarChart = ({ data, title, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-slate-400">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-600">{item.label}</span>
              <span className="text-sm font-semibold text-slate-700">{item.value}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-yellow-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Pie Chart Component (Donut style)
export const PieChart = ({ data, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-slate-400">
          No data available
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#FFC107', '#334155', '#64748b', '#94a3b8', '#cbd5e1'];

  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    return {
      ...item,
      percentage: percentage.toFixed(1),
      startAngle,
      endAngle: currentAngle,
      color: colors[index % colors.length],
    };
  });

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Donut Chart */}
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="20"
            />
            {segments.map((segment, index) => {
              const startAngle = (segment.startAngle * Math.PI) / 180;
              const endAngle = (segment.endAngle * Math.PI) / 180;
              const largeArc = segment.endAngle - segment.startAngle > 180 ? 1 : 0;

              const x1 = 50 + 40 * Math.cos(startAngle);
              const y1 = 50 + 40 * Math.sin(startAngle);
              const x2 = 50 + 40 * Math.cos(endAngle);
              const y2 = 50 + 40 * Math.sin(endAngle);

              return (
                <path
                  key={index}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={segment.color}
                  opacity="0.9"
                />
              );
            })}
            <circle cx="50" cy="50" r="25" fill="white" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-700">{total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: segment.color }}
                ></div>
                <span className="text-sm text-slate-600">{segment.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-700">
                  {segment.value}
                </span>
                <span className="text-xs text-slate-500 ml-1">
                  ({segment.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default { LineChart, BarChart, PieChart };

