import React, { useState } from 'react';
import Button from '../../shared/Button';

/**
 * Admin Reports Page (BMTOA - Cross-Platform)
 *
 * Features:
 * - Generate system-wide reports
 * - Cross-platform analytics reports
 * - Compliance reports
 * - Financial reports
 */

const ReportsPage = () => {
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  const reportTemplates = [
    { id: 1, name: 'Platform Overview Report', description: 'Complete system analytics', icon: '📊', platforms: 'Both' },
    { id: 2, name: 'User Activity Report', description: 'User engagement and activity', icon: '👥', platforms: 'Both' },
    { id: 3, name: 'Financial Summary Report', description: 'Revenue and commission breakdown', icon: '💰', platforms: 'Both' },
    { id: 4, name: 'Driver Performance Report', description: 'Driver ratings and statistics', icon: '⭐', platforms: 'Both' },
    { id: 5, name: 'BMTOA Compliance Report', description: 'Membership and compliance status', icon: '📋', platforms: 'BMTOA' },
    { id: 6, name: 'Corporate Usage Report', description: 'Corporate client analytics', icon: '🏢', platforms: 'TaxiCab' }
  ];

  const recentReports = [
    { name: 'December 2024 Platform Overview', date: '2025-01-01', type: 'Platform', format: 'PDF', platform: 'Both' },
    { name: 'Q4 2024 Financial Summary', date: '2024-12-31', type: 'Financial', format: 'Excel', platform: 'Both' },
    { name: 'November 2024 BMTOA Compliance', date: '2024-12-01', type: 'Compliance', format: 'PDF', platform: 'BMTOA' }
  ];

  const generateReport = (template) => {
    alert(`Generating ${template.name}...`);
  };

  const downloadReport = (report) => {
    alert(`Downloading ${report.name} as ${report.format}...`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">System Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Generate cross-platform system reports</p>
        </div>
      </div>

      {/* Platform Filter */}
      <div className="flex gap-2 mb-6">
        {['all', 'taxicab', 'bmtoa'].map(platform => (
          <button
            key={platform}
            onClick={() => setSelectedPlatform(platform)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
              selectedPlatform === platform
                ? 'bg-yellow-500 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {platform === 'all' ? 'All Platforms' : platform}
          </button>
        ))}
      </div>

      {/* Report Templates */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Report Templates</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {reportTemplates
            .filter(t => selectedPlatform === 'all' || t.platforms === 'Both' || t.platforms.toLowerCase() === selectedPlatform)
            .map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-4xl">{template.icon}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    template.platforms === 'Both' ? 'bg-purple-100 text-purple-700' :
                    template.platforms === 'TaxiCab' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {template.platforms}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-700 mb-2">{template.name}</h3>
                <p className="text-sm text-slate-600 mb-4">{template.description}</p>
                <Button variant="primary" className="w-full" onClick={() => generateReport(template)}>
                  Generate Report
                </Button>
              </div>
            ))}
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Recent Reports</h2>
        <div className="space-y-3">
          {recentReports.map((report, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-slate-700">{report.name}</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    report.platform === 'Both' ? 'bg-purple-100 text-purple-700' :
                    report.platform === 'TaxiCab' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {report.platform}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{report.type} • Generated on {report.date}</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {report.format}
                </span>
                <Button variant="outline" size="sm" onClick={() => downloadReport(report)}>
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
