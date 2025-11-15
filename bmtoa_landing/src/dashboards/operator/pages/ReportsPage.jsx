import React, { useState } from 'react';
import Button from '../../shared/Button';

/**
 * Operator Reports Page (BMTOA)
 *
 * Features:
 * - Generate fleet reports
 * - Driver performance reports
 * - Revenue reports
 * - Download reports
 */

const ReportsPage = () => {
  const [selectedReport, setSelectedReport] = useState(null);

  const reportTemplates = [
    { id: 1, name: 'Fleet Performance Report', description: 'Vehicle usage and maintenance', icon: '🚗' },
    { id: 2, name: 'Driver Performance Report', description: 'Driver ratings and statistics', icon: '👨‍✈️' },
    { id: 3, name: 'Revenue Report', description: 'Earnings breakdown by vehicle/driver', icon: '💰' },
    { id: 4, name: 'Maintenance Report', description: 'Maintenance costs and schedule', icon: '🔧' },
    { id: 5, name: 'BMTOA Compliance Report', description: 'Membership and compliance status', icon: '📋' },
    { id: 6, name: 'Monthly Summary Report', description: 'Complete monthly overview', icon: '📊' }
  ];

  const recentReports = [
    { name: 'December 2024 Revenue', date: '2025-01-01', type: 'Revenue', format: 'PDF' },
    { name: 'Q4 2024 Fleet Performance', date: '2024-12-31', type: 'Fleet', format: 'Excel' },
    { name: 'November 2024 Driver Performance', date: '2024-12-01', type: 'Driver', format: 'PDF' }
  ];

  const generateReport = (template) => {
    setSelectedReport(template);
    alert(`Generating ${template.name}...`);
  };

  const downloadReport = (report) => {
    alert(`Downloading ${report.name} as ${report.format}...`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">Operator Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Generate and download fleet reports</p>
        </div>
      </div>

      {/* Report Templates */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Report Templates</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {reportTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-3">{template.icon}</div>
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
              <div>
                <p className="font-medium text-slate-700">{report.name}</p>
                <p className="text-sm text-slate-500">{report.type} • Generated on {report.date}</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
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
