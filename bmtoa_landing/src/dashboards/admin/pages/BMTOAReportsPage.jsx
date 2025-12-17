import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import { BarChart, LineChart, PieChart } from '../../shared/Charts';
import { supabase } from '../../../lib/supabase';

/**
 * BMTOA Reports Page
 * 
 * Features:
 * - View membership statistics
 * - Revenue reports
 * - Member activity reports
 * - Export reports
 */

const BMTOAReportsPage = () => {
  const [reportType, setReportType] = useState('membership');
  const [dateRange, setDateRange] = useState('month');
  const [membershipData, setMembershipData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [tierDistribution, setTierDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    monthlyRevenue: 0,
    activeOperators: 0,
    activeDrivers: 0,
    newMembersThisMonth: 0,
    renewalRate: 0,
    avgRevenuePerMember: 0
  });
  const [topPerformers, setTopPerformers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // Load report data from Supabase
  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      let startDate;
      if (dateRange === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateRange === 'quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      // Fetch all BMTOA operator profiles for stats
      const { data: allOperators, error: allOperatorsError } = await supabase
        .from('operator_profiles')
        .select('*')
        .eq('bmtoa_verified', true)
        .in('platform', ['bmtoa', 'both']);

      if (allOperatorsError) throw allOperatorsError;

      // Fetch membership growth data from operator_profiles
      const { data: operators, error: operatorError } = await supabase
        .from('operator_profiles')
        .select('created_at, bmtoa_member_since')
        .eq('bmtoa_verified', true)
        .in('platform', ['bmtoa', 'both'])
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (operatorError) throw operatorError;

      // Group by month
      const membershipByMonth = {};
      (operators || []).forEach(op => {
        const date = new Date(op.bmtoa_member_since || op.created_at);
        const monthKey = date.toLocaleString('default', { month: 'short' });
        membershipByMonth[monthKey] = (membershipByMonth[monthKey] || 0) + 1;
      });

      const membershipChartData = Object.entries(membershipByMonth).map(([label, value]) => ({
        label,
        value
      }));

      // Fetch subscription payments for revenue
      const { data: payments, error: paymentsError } = await supabase
        .from('subscription_payments')
        .select('amount, payment_date, verification_status')
        .eq('verification_status', 'verified')
        .gte('payment_date', startDate.toISOString().split('T')[0]);

      if (paymentsError) throw paymentsError;

      // Group revenue by month
      const revenueByMonth = {};
      (payments || []).forEach(p => {
        const date = new Date(p.payment_date);
        const monthKey = date.toLocaleString('default', { month: 'short' });
        revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + parseFloat(p.amount || 0);
      });

      const revenueChartData = Object.entries(revenueByMonth).map(([label, value]) => ({
        label,
        value: Math.round(value)
      }));

      // Fetch tier distribution from operator_profiles with bmtoa_verified = true
      // Using database aggregation for accurate counts
      const { data: tierData, error: tierError} = await supabase
        .from('operator_profiles')
        .select('membership_tier, monthly_fee')
        .eq('bmtoa_verified', true)
        .in('platform', ['bmtoa', 'both']);

      if (tierError) throw tierError;

      // Group by tier and calculate counts and revenue
      const tierStats = {};
      (tierData || []).forEach(op => {
        const tier = op.membership_tier || 'standard';
        if (!tierStats[tier]) {
          tierStats[tier] = { count: 0, revenue: 0 };
        }
        tierStats[tier].count += 1;
        tierStats[tier].revenue += parseFloat(op.monthly_fee || 0);
      });

      const tierChartData = Object.entries(tierStats).map(([label, stats]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value: stats.count,
        revenue: Math.round(stats.revenue)
      }));

      // Calculate stats from operator profiles
      const totalMembers = allOperators?.length || 0;
      const activeMembers = allOperators?.filter(op => op.subscription_status === 'active').length || 0;

      // Monthly revenue from verified payments
      // Note: Supabase doesn't support SUM aggregation directly in select
      // We fetch the data and calculate on client side, which is acceptable for reports
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data: monthlyPayments } = await supabase
        .from('subscription_payments')
        .select('amount')
        .eq('verification_status', 'verified')
        .gte('payment_date', monthStart.toISOString().split('T')[0]);

      const monthlyRevenue = (monthlyPayments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      // Count active BMTOA operators (already have this in allOperators)
      const activeOperatorsCount = allOperators?.filter(op => 
        op.approval_status === 'approved' && op.subscription_status === 'active'
      ).length || 0;

      // Count active drivers associated with BMTOA operators
      const { data: drivers } = await supabase
        .from('driver_profiles')
        .select('user_id, operator_id, profiles!driver_profiles_user_id_fkey(verification_status)')
        .eq('profiles.verification_status', 'approved')
        .in('operator_id', (allOperators || []).map(op => op.user_id));

      // New members this month
      const newMembersThisMonth = (allOperators || []).filter(op => {
        const joinedDate = new Date(op.bmtoa_member_since || op.created_at);
        return joinedDate >= monthStart;
      }).length;

      // Calculate renewal rate (active vs inactive subscriptions)
      const inactiveMembers = (allOperators || []).filter(op => 
        op.subscription_status === 'inactive' || op.subscription_status === 'expired'
      ).length;
      const renewedMembers = activeMembers;
      const renewalRate = inactiveMembers > 0 ? Math.round((renewedMembers / (renewedMembers + inactiveMembers)) * 100) : 100;

      // Average revenue per member
      const avgRevenuePerMember = activeMembers > 0 ? Math.round(monthlyRevenue / activeMembers) : 0;

      setStats({
        totalMembers,
        monthlyRevenue: Math.round(monthlyRevenue),
        activeOperators: activeOperatorsCount,
        activeDrivers: drivers?.length || 0,
        newMembersThisMonth,
        renewalRate,
        avgRevenuePerMember
      });

      setMembershipData(membershipChartData);
      setRevenueData(revenueChartData);
      setTierDistribution(tierChartData);

      // Fetch top performers (operators with most payments)
      const { data: topPayments } = await supabase
        .from('subscription_payments')
        .select(`
          user_id,
          amount,
          profiles!subscription_payments_user_id_fkey(name),
          memberships!subscription_payments_membership_id_fkey(membership_tier)
        `)
        .eq('verification_status', 'verified')
        .gte('payment_date', monthStart.toISOString().split('T')[0]);

      // Group by user and sum amounts
      const userPayments = {};
      (topPayments || []).forEach(p => {
        if (!userPayments[p.user_id]) {
          userPayments[p.user_id] = {
            name: p.profiles?.name || 'Unknown',
            tier: p.memberships?.membership_tier || 'standard',
            total: 0
          };
        }
        userPayments[p.user_id].total += parseFloat(p.amount || 0);
      });

      const topPerformersList = Object.entries(userPayments)
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      setTopPerformers(topPerformersList);

      // Fetch recent activity
      const { data: recentPayments } = await supabase
        .from('subscription_payments')
        .select(`
          id,
          amount,
          payment_date,
          verification_status,
          verified_at,
          profiles!subscription_payments_user_id_fkey(name),
          memberships!subscription_payments_membership_id_fkey(membership_tier)
        `)
        .order('verified_at', { ascending: false, nullsFirst: false })
        .limit(5);

      const recentActivities = (recentPayments || []).map(p => ({
        type: 'payment',
        title: 'Payment Received',
        description: `${p.profiles?.name || 'Unknown'} - $${parseFloat(p.amount || 0).toFixed(2)} (${(p.memberships?.membership_tier || 'standard').charAt(0).toUpperCase() + (p.memberships?.membership_tier || 'standard').slice(1)})`,
        time: p.verified_at ? new Date(p.verified_at).toLocaleString() : 'Recently'
      }));

      setRecentActivity(recentActivities);

    } catch (error) {
      console.error('Error loading report data:', error);
      setMembershipData([]);
      setRevenueData([]);
      setTierDistribution([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-700 mb-2">📄 BMTOA Reports</h1>
        <p className="text-slate-600">View comprehensive reports and analytics for BMTOA</p>
      </div>

      {/* Report Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="membership">Membership Report</option>
              <option value="revenue">Revenue Report</option>
              <option value="activity">Activity Report</option>
              <option value="tier">Tier Distribution</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              🖨️ Print
            </Button>
            <Button>
              📊 Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Members</p>
              <p className="text-2xl font-bold text-slate-700">{stats.totalMembers}</p>
              <p className="text-xs text-slate-500 mt-1">BMTOA members</p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-green-600">${stats.monthlyRevenue.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">From subscriptions</p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active Operators</p>
              <p className="text-2xl font-bold text-blue-600">{stats.activeOperators}</p>
              <p className="text-xs text-slate-500 mt-1">Approved operators</p>
            </div>
            <div className="text-3xl">🚕</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active Drivers</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.activeDrivers}</p>
              <p className="text-xs text-slate-500 mt-1">Approved drivers</p>
            </div>
            <div className="text-3xl">👤</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading report data...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Membership Growth */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-4">📈 Membership Growth</h3>
              {membershipData.length > 0 ? (
                <BarChart data={membershipData} />
              ) : (
                <p className="text-slate-500 text-center py-8">No membership data available</p>
              )}
            </div>

            {/* Revenue Trend */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-4">💰 Revenue Trend</h3>
              {revenueData.length > 0 ? (
                <LineChart data={revenueData} />
              ) : (
                <p className="text-slate-500 text-center py-8">No revenue data available</p>
              )}
            </div>
          </div>

          {/* Tier Distribution */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-4">🎯 Membership Tier Distribution</h3>
              {tierDistribution.length > 0 ? (
                <PieChart data={tierDistribution} />
              ) : (
                <p className="text-slate-500 text-center py-8">No tier data available</p>
              )}
            </div>

        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">🏆 Top Paying Members (This Month)</h3>
          {topPerformers.length > 0 ? (
            <div className="space-y-4">
              {topPerformers.map((performer, index) => {
                const medals = ['🥇', '🥈', '🥉'];
                const bgColors = ['bg-yellow-50', 'bg-gray-50', 'bg-orange-50'];
                return (
                  <div key={performer.userId} className={`flex items-center justify-between p-4 ${bgColors[index]} rounded-lg`}>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{medals[index]}</div>
                      <div>
                        <p className="font-semibold text-slate-700">{performer.name}</p>
                        <p className="text-sm text-slate-600 capitalize">{performer.tier} Tier</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${performer.total.toFixed(2)}</p>
                      <p className="text-xs text-slate-600">Total Payments</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No payment data available for this period</p>
          )}
        </div>
      </div>
        </>
      )}

      {/* Detailed Statistics Table */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">📊 Detailed Statistics</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="border-l-4 border-yellow-400 pl-4">
            <p className="text-sm text-slate-600">New Members This Month</p>
            <p className="text-3xl font-bold text-slate-700">{stats.newMembersThisMonth}</p>
            <p className="text-sm text-slate-500 mt-1">New registrations</p>
          </div>
          <div className="border-l-4 border-green-400 pl-4">
            <p className="text-sm text-slate-600">Renewal Rate</p>
            <p className="text-3xl font-bold text-slate-700">{stats.renewalRate}%</p>
            <p className="text-sm text-slate-500 mt-1">Active vs expired</p>
          </div>
          <div className="border-l-4 border-blue-400 pl-4">
            <p className="text-sm text-slate-600">Average Revenue per Member</p>
            <p className="text-3xl font-bold text-slate-700">${stats.avgRevenuePerMember}</p>
            <p className="text-sm text-slate-500 mt-1">Monthly average</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">🔔 Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-2xl">💳</span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-700">{activity.title}</p>
                  <p className="text-sm text-slate-600">{activity.description}</p>
                </div>
                <span className="text-xs text-slate-500">{activity.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No recent activity</p>
        )}
      </div>
    </div>
  );
};

export default BMTOAReportsPage;

