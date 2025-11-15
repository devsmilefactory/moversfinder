import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../stores';
import useDriverStore from '../../../stores/driverStore';

/**
 * Driver Performance Page
 *
 * Features:
 * - Performance metrics and ratings (from rides data)
 * - Monthly statistics (calculated from rides)
 * - Achievement badges (based on actual performance)
 * - Performance trends
 *
 * Supabase Integration:
 * - Fetches rides from rides table
 * - Calculates metrics from actual ride data
 * - Shows real earnings and completion rates
 */

const PerformancePage = () => {
  const user = useAuthStore((state) => state.user);
  const { rides, earnings, loading, loadDashboardData } = useDriverStore();
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    if (user?.id) {
      loadDashboardData(user.id);
    }
  }, [user?.id, loadDashboardData]);

  // Calculate performance stats from actual rides
  const calculateStats = () => {
    if (!rides || rides.length === 0) {
      return {
        rating: 0,
        totalRides: 0,
        completionRate: 0,
        onTimeRate: 0,
        acceptanceRate: 0,
        earnings: 0
      };
    }

    const completedRides = rides.filter(r => r.status === 'completed');
    const totalRides = rides.length;

    // Calculate average rating
    const ridesWithRating = completedRides.filter(r => r.rating);
    const avgRating = ridesWithRating.length > 0
      ? ridesWithRating.reduce((sum, r) => sum + (r.rating || 0), 0) / ridesWithRating.length
      : 0;

    // Calculate completion rate
    const completionRate = totalRides > 0
      ? (completedRides.length / totalRides) * 100
      : 0;

    // Calculate total earnings
    const totalEarnings = completedRides.reduce((sum, r) => sum + (parseFloat(r.fare_amount) || 0), 0);

    return {
      rating: avgRating.toFixed(1),
      totalRides: completedRides.length,
      completionRate: Math.round(completionRate),
      onTimeRate: 95, // TODO: Calculate from actual data when available
      acceptanceRate: 92, // TODO: Calculate from actual data when available
      earnings: totalEarnings.toFixed(2)
    };
  };

  // Calculate monthly data from rides
  const getMonthlyData = () => {
    if (!rides || rides.length === 0) return [];

    const monthlyStats = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    rides.forEach(ride => {
      if (ride.status === 'completed') {
        const date = new Date(ride.created_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const monthName = months[date.getMonth()];

        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = {
            month: monthName,
            rides: 0,
            earnings: 0,
            ratings: []
          };
        }

        monthlyStats[monthKey].rides++;
        monthlyStats[monthKey].earnings += parseFloat(ride.fare_amount) || 0;
        if (ride.rating) {
          monthlyStats[monthKey].ratings.push(ride.rating);
        }
      }
    });

    // Convert to array and calculate average ratings
    return Object.values(monthlyStats)
      .map(stat => ({
        ...stat,
        rating: stat.ratings.length > 0
          ? (stat.ratings.reduce((a, b) => a + b, 0) / stat.ratings.length).toFixed(1)
          : 0,
        earnings: stat.earnings.toFixed(0)
      }))
      .slice(-5); // Last 5 months
  };

  // Calculate achievements based on actual performance
  const getAchievements = () => {
    const stats = calculateStats();

    return [
      {
        icon: '🏆',
        title: 'Top Rated Driver',
        description: '4.5+ rating',
        earned: parseFloat(stats.rating) >= 4.5
      },
      {
        icon: '⭐',
        title: '50 Rides Milestone',
        description: 'Completed 50 rides',
        earned: stats.totalRides >= 50
      },
      {
        icon: '🎯',
        title: '100 Rides Milestone',
        description: 'Completed 100 rides',
        earned: stats.totalRides >= 100
      },
      {
        icon: '🚀',
        title: 'High Completion Rate',
        description: '95%+ completion rate',
        earned: stats.completionRate >= 95
      },
      {
        icon: '💎',
        title: 'Premium Driver',
        description: '500+ rides completed',
        earned: stats.totalRides >= 500
      }
    ];
  };

  const stats = calculateStats();
  const monthlyData = getMonthlyData();
  const achievements = getAchievements();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading performance data...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">Performance Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Track your performance metrics and achievements</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-lg p-6 border-2 border-yellow-200">
          <p className="text-sm text-yellow-700 mb-1">Overall Rating</p>
          <p className="text-4xl font-bold text-yellow-700">
            {stats.rating > 0 ? `${stats.rating} ⭐` : 'N/A'}
          </p>
          <p className="text-xs text-yellow-600 mt-2">Based on {stats.totalRides} rides</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg p-6 border-2 border-green-200">
          <p className="text-sm text-green-700 mb-1">Completion Rate</p>
          <p className="text-4xl font-bold text-green-700">{stats.completionRate}%</p>
          <p className="text-xs text-green-600 mt-2">
            {stats.completionRate >= 95 ? 'Excellent!' : stats.completionRate >= 80 ? 'Good' : 'Keep improving'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg p-6 border-2 border-blue-200">
          <p className="text-sm text-blue-700 mb-1">Total Earnings</p>
          <p className="text-4xl font-bold text-blue-700">${stats.earnings}</p>
          <p className="text-xs text-blue-600 mt-2">From completed rides</p>
        </div>
      </div>

      {/* Performance Trend */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Performance Trend (Last 5 Months)</h2>
        {monthlyData.length > 0 ? (
          <div className="space-y-3">
            {monthlyData.map((data, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="w-12 text-sm font-medium text-slate-700">{data.month}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full flex items-center justify-end pr-3"
                    style={{ width: `${Math.min((data.rides / 50) * 100, 100)}%` }}
                  >
                    <span className="text-xs font-medium text-white">{data.rides} rides</span>
                  </div>
                </div>
                <span className="w-16 text-sm font-bold text-yellow-600">
                  {data.rating > 0 ? `${data.rating} ⭐` : 'N/A'}
                </span>
                <span className="w-24 text-sm font-bold text-green-600">${data.earnings}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p className="text-3xl mb-2">📊</p>
            <p>No performance data yet. Complete rides to see your trends!</p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Achievements */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Achievements</h2>
          <div className="space-y-3">
            {achievements.map((achievement, index) => (
              <div key={index} className={`p-4 rounded-lg flex items-center gap-3 ${
                achievement.earned ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-slate-50 opacity-60'
              }`}>
                <span className="text-3xl">{achievement.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-700">{achievement.title}</p>
                  <p className="text-xs text-slate-600">{achievement.description}</p>
                </div>
                {achievement.earned && (
                  <span className="px-2 py-1 bg-green-500 text-white rounded text-xs font-medium">Earned</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Recent Feedback</h2>
          {rides && rides.filter(r => r.rating && r.feedback).length > 0 ? (
            <div className="space-y-3">
              {rides
                .filter(r => r.rating && r.feedback)
                .slice(0, 5)
                .map((ride) => (
                  <div key={ride.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-slate-700">Ride #{ride.id.slice(0, 8)}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(ride.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(ride.rating)].map((_, i) => (
                          <span key={i} className="text-yellow-500">⭐</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 italic">"{ride.feedback}"</p>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p className="text-3xl mb-2">💬</p>
              <p>No feedback yet. Complete rides to receive customer feedback!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformancePage;
