import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Users, Calendar, DollarSign, TrendingUp, Clock } from 'lucide-react';
import CorporatePWALayout from '../../../components/layouts/CorporatePWALayout';
import useAuthStore from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';

/**
 * Corporate Dashboard Page - PWA Version
 * Main dashboard for corporate users with stats and quick actions
 */
const CorporateDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalRides: 0,
    activeEmployees: 0,
    monthlySpend: 0,
    scheduledRides: 0
  });
  const [recentRides, setRecentRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      // Fetch total rides count
      const { count: totalRidesCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('corporate_user_id', user.id);

      // Fetch active passengers count
      const { count: activePassengersCount } = await supabase
        .from('corporate_passengers')
        .select('*', { count: 'exact', head: true })
        .eq('corporate_user_id', user.id)
        .eq('status', 'active');

      // Fetch scheduled rides count
      const { count: scheduledRidesCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('corporate_user_id', user.id)
        .eq('status', 'scheduled');

      // Fetch monthly spend (sum of completed rides this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyRides } = await supabase
        .from('rides')
        .select('estimated_cost')
        .eq('corporate_user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());

      const monthlySpend = (monthlyRides || []).reduce((sum, ride) => sum + (ride.estimated_cost || 0), 0);

      setStats({
        totalRides: totalRidesCount || 0,
        activeEmployees: activePassengersCount || 0,
        monthlySpend: monthlySpend,
        scheduledRides: scheduledRidesCount || 0
      });

      // Fetch recent rides
      const { data: ridesData } = await supabase
        .from('rides')
        .select(`
          *,
          passenger:corporate_passengers(name)
        `)
        .eq('corporate_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const transformedRides = (ridesData || []).map(ride => ({
        id: ride.id,
        passengerName: ride.passenger?.name || 'Unknown',
        pickup: ride.pickup_location,
        dropoff: ride.dropoff_location,
        status: ride.status,
        date: ride.created_at,
        cost: ride.estimated_cost || 0
      }));

      setRecentRides(transformedRides);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: Car,
      label: 'Book Ride',
      color: 'purple',
      onClick: () => navigate('/corporate/book-ride')
    },
    {
      icon: Users,
      label: 'Employees',
      color: 'blue',
      onClick: () => navigate('/corporate/employees')
    },
    {
      icon: Calendar,
      label: 'Rides',
      color: 'green',
      onClick: () => navigate('/corporate/rides')
    },
    {
      icon: DollarSign,
      label: 'Billing',
      color: 'yellow',
      onClick: () => navigate('/corporate/billing')
    }
  ];

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <CorporatePWALayout title="Dashboard">
      <div className="p-4">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">
            Welcome back! 👋
          </h2>
          <p className="text-slate-600">
            Here's what's happening with your company rides
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <Car className="w-6 h-6 opacity-80" />
              <TrendingUp className="w-4 h-4 opacity-60" />
            </div>
            <div className="text-2xl font-bold">{stats.totalRides}</div>
            <div className="text-xs opacity-90">Total Rides</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 opacity-80" />
              <TrendingUp className="w-4 h-4 opacity-60" />
            </div>
            <div className="text-2xl font-bold">{stats.activeEmployees}</div>
            <div className="text-xs opacity-90">Active Employees</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-6 h-6 opacity-80" />
              <TrendingUp className="w-4 h-4 opacity-60" />
            </div>
            <div className="text-2xl font-bold">${stats.monthlySpend.toFixed(0)}</div>
            <div className="text-xs opacity-90">Monthly Spend</div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-6 h-6 opacity-80" />
              <Calendar className="w-4 h-4 opacity-60" />
            </div>
            <div className="text-2xl font-bold">{stats.scheduledRides}</div>
            <div className="text-xs opacity-90">Scheduled</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              const colorClasses = {
                purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
                blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
                green: 'bg-green-50 text-green-600 hover:bg-green-100',
                yellow: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
              };
              
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`${colorClasses[action.color]} rounded-lg p-4 transition-colors flex flex-col items-center justify-center gap-2`}
                >
                  <Icon className="w-8 h-8" />
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Rides */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-800">Recent Rides</h3>
            <button
              onClick={() => navigate('/corporate/rides')}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              View All →
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : recentRides.length > 0 ? (
              recentRides.map((ride) => (
                <div
                  key={ride.id}
                  className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-800">{ride.passengerName}</h4>
                      <p className="text-xs text-slate-500">
                        {new Date(ride.date).toLocaleDateString()} • {new Date(ride.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(ride.status)}`}>
                      {ride.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-sm text-slate-600 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">📍</span>
                      <span className="truncate">{ride.pickup}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600">📍</span>
                      <span className="truncate">{ride.dropoff}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-lg font-bold text-purple-600">
                      ${ride.cost.toFixed(2)}
                    </span>
                    <button className="px-3 py-1 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                No recent rides
              </div>
            )}
          </div>
        </div>
      </div>
    </CorporatePWALayout>
  );
};

export default CorporateDashboardPage;

