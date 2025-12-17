import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';

/**
 * Corporate Financial Reports Page
 * Detailed analytics and spending reports for corporate accounts
 */
const CorporateReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [reportData, setReportData] = useState({
    totalSpending: 0,
    totalTrips: 0,
    averageTripCost: 0,
    topServices: [],
    spendingByCompany: [],
    dailySpending: [],
    monthlyTrends: [],
    topRoutes: []
  });

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  // Load companies
  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('corporate_profiles')
        .select('user_id, company_name')
        .eq('platform', 'taxicab')
        .eq('verification_status', 'verified')
        .order('company_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  // Load report data
  const loadReportData = async () => {
    try {
      setLoading(true);

      // Build query
      let query = supabase
        .from('rides')
        .select(`
          id,
          company_id,
          service_type,
          fare,
          pickup_location,
          dropoff_location,
          created_at,
          status,
          payment_method,
          corporate_profiles!rides_company_id_fkey(company_name)
        `)
        .eq('platform', 'taxicab')
        .eq('status', 'completed')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);

      // Filter by company if selected
      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
      } else {
        query = query.not('company_id', 'is', null);
      }

      const { data: trips, error } = await query;

      if (error) throw error;

      // Calculate analytics
      const totalTrips = trips.length;
      const totalSpending = trips.reduce((sum, trip) => sum + parseFloat(trip.fare || 0), 0);
      const averageTripCost = totalTrips > 0 ? totalSpending / totalTrips : 0;

      // Top services
      const serviceMap = {};
      trips.forEach(trip => {
        const service = trip.service_type || 'taxi';
        if (!serviceMap[service]) {
          serviceMap[service] = { service, count: 0, total: 0 };
        }
        serviceMap[service].count++;
        serviceMap[service].total += parseFloat(trip.fare || 0);
      });
      const topServices = Object.values(serviceMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Spending by company
      const companyMap = {};
      trips.forEach(trip => {
        const companyName = trip.corporate_profiles?.company_name || 'Unknown';
        if (!companyMap[companyName]) {
          companyMap[companyName] = { company: companyName, trips: 0, spending: 0 };
        }
        companyMap[companyName].trips++;
        companyMap[companyName].spending += parseFloat(trip.fare || 0);
      });
      const spendingByCompany = Object.values(companyMap)
        .sort((a, b) => b.spending - a.spending);

      // Daily spending
      const dailyMap = {};
      trips.forEach(trip => {
        const date = new Date(trip.created_at).toISOString().split('T')[0];
        if (!dailyMap[date]) {
          dailyMap[date] = { date, trips: 0, spending: 0 };
        }
        dailyMap[date].trips++;
        dailyMap[date].spending += parseFloat(trip.fare || 0);
      });
      const dailySpending = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

      // Monthly trends (last 6 months)
      const monthlyMap = {};
      trips.forEach(trip => {
        const date = new Date(trip.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { month: monthKey, trips: 0, spending: 0 };
        }
        monthlyMap[monthKey].trips++;
        monthlyMap[monthKey].spending += parseFloat(trip.fare || 0);
      });
      const monthlyTrends = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

      // Top routes
      const routeMap = {};
      trips.forEach(trip => {
        const route = `${trip.pickup_location} → ${trip.dropoff_location}`;
        if (!routeMap[route]) {
          routeMap[route] = { route, count: 0, total: 0 };
        }
        routeMap[route].count++;
        routeMap[route].total += parseFloat(trip.fare || 0);
      });
      const topRoutes = Object.values(routeMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setReportData({
        totalSpending,
        totalTrips,
        averageTripCost,
        topServices,
        spendingByCompany,
        dailySpending,
        monthlyTrends,
        topRoutes
      });
    } catch (error) {
      console.error('Error loading report data:', error);
      alert(`Failed to load report data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [selectedCompany, dateRange]);

  // Export to CSV
  const exportToCSV = () => {
    let csvContent = '';

    if (exportFormat === 'csv') {
      // Summary
      csvContent += 'Corporate Financial Report\n';
      csvContent += `Date Range: ${dateRange.start} to ${dateRange.end}\n`;
      csvContent += `Company: ${selectedCompany === 'all' ? 'All Companies' : companies.find(c => c.user_id === selectedCompany)?.company_name}\n\n`;
      
      csvContent += 'Summary\n';
      csvContent += `Total Trips,${reportData.totalTrips}\n`;
      csvContent += `Total Spending,$${reportData.totalSpending.toFixed(2)}\n`;
      csvContent += `Average Trip Cost,$${reportData.averageTripCost.toFixed(2)}\n\n`;

      // Spending by Company
      if (selectedCompany === 'all') {
        csvContent += 'Spending by Company\n';
        csvContent += 'Company,Trips,Spending\n';
        reportData.spendingByCompany.forEach(item => {
          csvContent += `${item.company},${item.trips},$${item.spending.toFixed(2)}\n`;
        });
        csvContent += '\n';
      }

      // Top Services
      csvContent += 'Top Services\n';
      csvContent += 'Service,Trips,Total Spending\n';
      reportData.topServices.forEach(item => {
        csvContent += `${item.service},${item.count},$${item.total.toFixed(2)}\n`;
      });
      csvContent += '\n';

      // Top Routes
      csvContent += 'Top Routes\n';
      csvContent += 'Route,Trips,Total Spending\n';
      reportData.topRoutes.forEach(item => {
        csvContent += `"${item.route}",${item.count},$${item.total.toFixed(2)}\n`;
      });
    }

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corporate-report-${dateRange.start}-to-${dateRange.end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setShowExportModal(false);
    alert('✅ Report exported successfully!');
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-700 mb-2">📊 Corporate Financial Reports</h1>
          <p className="text-slate-600">Detailed analytics and spending reports</p>
        </div>
        <Button variant="primary" onClick={() => setShowExportModal(true)}>
          📥 Export Report
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All Companies</option>
              {companies.map(company => (
                <option key={company.user_id} value={company.user_id}>
                  {company.company_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading report data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Trips</p>
                  <p className="text-3xl font-bold">{reportData.totalTrips}</p>
                </div>
                <div className="text-4xl opacity-80">🚗</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Spending</p>
                  <p className="text-3xl font-bold">${reportData.totalSpending.toFixed(2)}</p>
                </div>
                <div className="text-4xl opacity-80">💰</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Avg Trip Cost</p>
                  <p className="text-3xl font-bold">${reportData.averageTripCost.toFixed(2)}</p>
                </div>
                <div className="text-4xl opacity-80">📊</div>
              </div>
            </div>
          </div>

          {/* Spending by Company (if all companies selected) */}
          {selectedCompany === 'all' && reportData.spendingByCompany.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Spending by Company</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Company</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Trips</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Total Spending</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Avg per Trip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.spendingByCompany.map((item, index) => (
                      <tr key={index} className="border-t border-slate-200">
                        <td className="px-4 py-3 text-sm text-slate-700">{item.company}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 text-right">{item.trips}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700 text-right">
                          ${item.spending.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">
                          ${(item.spending / item.trips).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Services */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Top Services</h2>
              <div className="space-y-3">
                {reportData.topServices.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 capitalize">{item.service}</p>
                        <p className="text-xs text-slate-500">{item.count} trips</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-700">${item.total.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">${(item.total / item.count).toFixed(2)}/trip</p>
                    </div>
                  </div>
                ))}
                {reportData.topServices.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Monthly Trends</h2>
              <div className="space-y-3">
                {reportData.monthlyTrends.slice(-6).map((item, index) => {
                  const maxSpending = Math.max(...reportData.monthlyTrends.map(m => m.spending));
                  const percentage = maxSpending > 0 ? (item.spending / maxSpending) * 100 : 0;

                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-600">{item.month}</span>
                        <span className="text-sm font-semibold text-slate-700">${item.spending.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{item.trips} trips</p>
                    </div>
                  );
                })}
                {reportData.monthlyTrends.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Top Routes */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Top Routes</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Route</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Trips</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">Avg Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.topRoutes.map((item, index) => (
                    <tr key={index} className="border-t border-slate-200">
                      <td className="px-4 py-3">
                        <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs font-bold text-yellow-600">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.route}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">{item.count}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700 text-right">
                        ${item.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">
                        ${(item.total / item.count).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.topRoutes.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No routes data available</p>
              )}
            </div>
          </div>

          {/* Daily Spending Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Daily Spending</h2>
            <div className="space-y-2">
              {reportData.dailySpending.slice(-14).map((item, index) => {
                const maxSpending = Math.max(...reportData.dailySpending.map(d => d.spending));
                const percentage = maxSpending > 0 ? (item.spending / maxSpending) * 100 : 0;

                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-24 text-xs text-slate-600">{item.date}</div>
                    <div className="flex-1">
                      <div className="w-full bg-slate-200 rounded-full h-6 relative">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 20 && (
                            <span className="text-xs font-semibold text-white">
                              ${item.spending.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-16 text-xs text-slate-600 text-right">{item.trips} trips</div>
                  </div>
                );
              })}
              {reportData.dailySpending.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No daily data available</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="📥 Export Report"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="csv">CSV (Excel Compatible)</option>
              <option value="pdf" disabled>PDF (Coming Soon)</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              📊 The report will include:
            </p>
            <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
              <li>Summary statistics</li>
              <li>Spending by company</li>
              <li>Top services breakdown</li>
              <li>Top routes analysis</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={exportToCSV}>
              📥 Export {exportFormat.toUpperCase()}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CorporateReportsPage;

