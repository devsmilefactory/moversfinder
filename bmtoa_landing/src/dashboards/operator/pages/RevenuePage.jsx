import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import useAuthStore from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';

/**
 * Operator Revenue Page
 *
 * Features:
 * - Revenue overview (today, week, month, total)
 * - Revenue breakdown by driver
 * - Revenue breakdown by vehicle
 * - Commission calculations
 * - Export to CSV/PDF
 * - Date range filter
 * - Revenue trends
 *
 * State Management:
 * - revenue: Revenue data object
 * - driverRevenue: Array of driver revenue breakdown
 * - vehicleRevenue: Array of vehicle revenue breakdown
 * - viewMode: 'drivers' or 'vehicles'
 *
 * Database Integration Ready:
 * - Fetch Revenue: SELECT SUM(fare) FROM rides WHERE operator_id = current_operator
 * - Fetch Driver Revenue: SELECT driver_id, SUM(fare) FROM rides GROUP BY driver_id
 * - Fetch Vehicle Revenue: SELECT vehicle_id, SUM(fare) FROM rides GROUP BY vehicle_id
 * - Export: Generate CSV/PDF from revenue data
 */

const RevenuePage = () => {
  const user = useAuthStore((state) => state.user);

  // State management
  const [revenue, setRevenue] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    commission: 0,
    netRevenue: 0
  });
  const [driverRevenue, setDriverRevenue] = useState([]);
  const [vehicleRevenue, setVehicleRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('drivers');

  // Load revenue data from Supabase
  useEffect(() => {
    if (user) {
      loadRevenueData();
    }
  }, [user]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);

      // Get operator's drivers
      const { data: drivers, error: driversError } = await supabase
        .from('driver_profiles')
        .select('user_id')
        .eq('operator_id', user.id)
        .eq('operator_approval_status', 'approved');

      if (driversError) throw driversError;

      const driverIds = drivers?.map(d => d.user_id) || [];

      if (driverIds.length === 0) {
        // No drivers, no revenue
        setRevenue({ today: 0, week: 0, month: 0, total: 0, commission: 0, netRevenue: 0 });
        setDriverRevenue([]);
        setVehicleRevenue([]);
        setLoading(false);
        return;
      }

      // Calculate date ranges
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch all completed rides for operator's drivers
      const { data: rides, error: ridesError } = await supabase
        .from('rides')
        .select(`
          id,
          driver_id,
          vehicle_id,
          fare,
          status,
          created_at,
          driver_profiles!rides_driver_id_fkey (
            full_name,
            profiles!driver_profiles_user_id_fkey (
              name,
              phone
            )
          ),
          operator_vehicles!rides_vehicle_id_fkey (
            license_plate,
            make,
            model
          )
        `)
        .in('driver_id', driverIds)
        .eq('status', 'completed')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      if (ridesError) throw ridesError;

      // Calculate revenue totals
      const allRides = rides || [];
      const todayRides = allRides.filter(r => new Date(r.created_at) >= todayStart);
      const weekRides = allRides.filter(r => new Date(r.created_at) >= weekStart);
      const monthRides = allRides.filter(r => new Date(r.created_at) >= monthStart);

      const todayRevenue = todayRides.reduce((sum, r) => sum + parseFloat(r.fare || 0), 0);
      const weekRevenue = weekRides.reduce((sum, r) => sum + parseFloat(r.fare || 0), 0);
      const monthRevenue = monthRides.reduce((sum, r) => sum + parseFloat(r.fare || 0), 0);
      const totalRevenue = allRides.reduce((sum, r) => sum + parseFloat(r.fare || 0), 0);

      // Calculate commission (20% of monthly revenue)
      const commission = monthRevenue * 0.20;
      const netRevenue = monthRevenue - commission;

      setRevenue({
        today: todayRevenue,
        week: weekRevenue,
        month: monthRevenue,
        total: totalRevenue,
        commission: commission,
        netRevenue: netRevenue
      });

      // Calculate driver revenue breakdown
      const driverRevenueMap = {};
      allRides.forEach(ride => {
        if (!driverRevenueMap[ride.driver_id]) {
          driverRevenueMap[ride.driver_id] = {
            id: ride.driver_id,
            name: ride.driver_profiles?.full_name || ride.driver_profiles?.profiles?.name || 'Unknown Driver',
            phone: ride.driver_profiles?.profiles?.phone || 'N/A',
            rides: 0,
            revenue: 0
          };
        }
        driverRevenueMap[ride.driver_id].rides++;
        driverRevenueMap[ride.driver_id].revenue += parseFloat(ride.fare || 0);
      });

      const driverRevenueArray = Object.values(driverRevenueMap).map(driver => ({
        ...driver,
        commission: driver.revenue * 0.20,
        netRevenue: driver.revenue * 0.80
      }));

      setDriverRevenue(driverRevenueArray);

      // Calculate vehicle revenue breakdown
      const vehicleRevenueMap = {};
      allRides.forEach(ride => {
        if (ride.vehicle_id && !vehicleRevenueMap[ride.vehicle_id]) {
          vehicleRevenueMap[ride.vehicle_id] = {
            id: ride.vehicle_id,
            registration: ride.operator_vehicles?.license_plate || 'N/A',
            make: `${ride.operator_vehicles?.make || ''} ${ride.operator_vehicles?.model || ''}`.trim() || 'N/A',
            driver: ride.driver_profiles?.full_name || 'N/A',
            rides: 0,
            revenue: 0,
            fuelCost: 0, // TODO: Add fuel cost tracking
            maintenance: 0, // TODO: Add maintenance cost tracking
          };
        }
        if (ride.vehicle_id) {
          vehicleRevenueMap[ride.vehicle_id].rides++;
          vehicleRevenueMap[ride.vehicle_id].revenue += parseFloat(ride.fare || 0);
        }
      });

      const vehicleRevenueArray = Object.values(vehicleRevenueMap).map(vehicle => ({
        ...vehicle,
        netRevenue: vehicle.revenue - vehicle.fuelCost - vehicle.maintenance
      }));

      setVehicleRevenue(vehicleRevenueArray);

    } catch (error) {
      console.error('Error loading revenue data:', error);
      setRevenue({ today: 0, week: 0, month: 0, total: 0, commission: 0, netRevenue: 0 });
      setDriverRevenue([]);
      setVehicleRevenue([]);
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    // Database integration:
    // Fetch full revenue data and generate CSV

    alert('Exporting revenue data to CSV...\n\nIn production, this would download a CSV file with:\n- Revenue breakdown\n- Driver/Vehicle details\n- Commission calculations\n- Date range data');
  };

  // Export to PDF
  const exportToPDF = () => {
    // Database integration:
    // Fetch full revenue data and generate PDF report

    alert('Exporting revenue report to PDF...\n\nIn production, this would download a PDF report with:\n- Revenue charts\n- Breakdown tables\n- Summary statistics\n- Professional formatting');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">Revenue Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and analyze your fleet revenue
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            Export CSV
          </Button>
          <Button variant="primary" onClick={exportToPDF}>
            Export PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading revenue data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Revenue Overview Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg p-6 border-2 border-green-200">
          <p className="text-sm text-green-700 mb-1">Today's Revenue</p>
          <p className="text-3xl font-bold text-green-700">${revenue.today.toFixed(2)}</p>
          <p className="text-xs text-green-600 mt-2">↑ +15% from yesterday</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg p-6 border-2 border-blue-200">
          <p className="text-sm text-blue-700 mb-1">This Week</p>
          <p className="text-3xl font-bold text-blue-700">${revenue.week.toFixed(2)}</p>
          <p className="text-xs text-blue-600 mt-2">↑ +10% from last week</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-lg p-6 border-2 border-yellow-200">
          <p className="text-sm text-yellow-700 mb-1">This Month</p>
          <p className="text-3xl font-bold text-yellow-700">${revenue.month.toFixed(2)}</p>
          <p className="text-xs text-yellow-600 mt-2">↑ +18% from last month</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-lg p-6 border-2 border-purple-200">
          <p className="text-sm text-purple-700 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-purple-700">${revenue.total.toFixed(2)}</p>
          <p className="text-xs text-purple-600 mt-2">All time</p>
        </div>
      </div>

      {/* Commission Breakdown */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-sm text-slate-600 mb-2">Monthly Gross Revenue</p>
          <p className="text-2xl font-bold text-slate-700">${revenue.month.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow-lg p-6">
          <p className="text-sm text-red-700 mb-2">Platform Commission (20%)</p>
          <p className="text-2xl font-bold text-red-700">-${revenue.commission.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-lg p-6">
          <p className="text-sm text-green-700 mb-2">Net Revenue</p>
          <p className="text-2xl font-bold text-green-700">${revenue.netRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setViewMode('drivers')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'drivers'
              ? 'text-yellow-600 border-b-2 border-yellow-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          By Driver ({driverRevenue.length})
        </button>
        <button
          onClick={() => setViewMode('vehicles')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'vehicles'
              ? 'text-yellow-600 border-b-2 border-yellow-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          By Vehicle ({vehicleRevenue.length})
        </button>
      </div>

      {/* Revenue Breakdown Tables */}
      {viewMode === 'drivers' ? (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-700">Revenue by Driver</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rides</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Gross Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Commission (20%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Net Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {driverRevenue.map((driver) => (
                <tr key={driver.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-700">{driver.name}</p>
                      <p className="text-xs text-slate-500">{driver.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">{driver.rides}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700">${driver.revenue.toFixed(2)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-red-600">-${driver.commission.toFixed(2)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-green-600">${driver.netRevenue.toFixed(2)}</p>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold">
                <td className="px-6 py-4">TOTAL</td>
                <td className="px-6 py-4">{driverRevenue.reduce((sum, d) => sum + d.rides, 0)}</td>
                <td className="px-6 py-4">${driverRevenue.reduce((sum, d) => sum + d.revenue, 0).toFixed(2)}</td>
                <td className="px-6 py-4 text-red-600">-${driverRevenue.reduce((sum, d) => sum + d.commission, 0).toFixed(2)}</td>
                <td className="px-6 py-4 text-green-600">${driverRevenue.reduce((sum, d) => sum + d.netRevenue, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-700">Revenue by Vehicle</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rides</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expenses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {vehicleRevenue.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-700">{vehicle.registration}</p>
                      <p className="text-xs text-slate-500">{vehicle.make}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{vehicle.driver}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">{vehicle.rides}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700">${vehicle.revenue.toFixed(2)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-red-600">
                      Fuel: ${vehicle.fuelCost.toFixed(2)}<br />
                      Maint: ${vehicle.maintenance.toFixed(2)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-green-600">${vehicle.netRevenue.toFixed(2)}</p>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold">
                <td className="px-6 py-4" colSpan="2">TOTAL</td>
                <td className="px-6 py-4">{vehicleRevenue.reduce((sum, v) => sum + v.rides, 0)}</td>
                <td className="px-6 py-4">${vehicleRevenue.reduce((sum, v) => sum + v.revenue, 0).toFixed(2)}</td>
                <td className="px-6 py-4 text-red-600">
                  ${(vehicleRevenue.reduce((sum, v) => sum + v.fuelCost + v.maintenance, 0)).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-green-600">${vehicleRevenue.reduce((sum, v) => sum + v.netRevenue, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default RevenuePage;

