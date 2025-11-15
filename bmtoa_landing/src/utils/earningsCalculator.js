import { supabase } from '../lib/supabase';

/**
 * Earnings Calculator Utility
 * 
 * Calculates driver earnings based on completed rides
 * Supports different commission structures and payment methods
 */

/**
 * Calculate total earnings for a driver
 * @param {string} driverId - Driver's user ID
 * @param {string} period - 'today', 'week', 'month', 'all'
 * @returns {Object} Earnings breakdown
 */
export const calculateDriverEarnings = async (driverId, period = 'all') => {
  try {
    let query = supabase
      .from('rides')
      .select('fare, estimated_cost, payment_method, actual_dropoff_time, created_at')
      .eq('driver_id', driverId)
      .eq('ride_status', 'trip_completed')
      .eq('payment_status', 'paid');

    // Apply date filter based on period
    const now = new Date();
    if (period === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      query = query.gte('actual_dropoff_time', startOfDay.toISOString());
    } else if (period === 'week') {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      query = query.gte('actual_dropoff_time', startOfWeek.toISOString());
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query = query.gte('actual_dropoff_time', startOfMonth.toISOString());
    }

    const { data: rides, error } = await query;

    if (error) throw error;

    // Calculate earnings
    const totalRides = rides.length;
    const grossEarnings = rides.reduce((sum, ride) => {
      const fare = parseFloat(ride.fare || ride.estimated_cost || 0);
      return sum + fare;
    }, 0);

    // Commission structure (can be customized)
    const commissionRate = 0.15; // 15% platform commission
    const commission = grossEarnings * commissionRate;
    const netEarnings = grossEarnings - commission;

    // Breakdown by payment method
    const cashRides = rides.filter(r => r.payment_method === 'cash');
    const ecocashRides = rides.filter(r => r.payment_method === 'ecocash');
    const cardRides = rides.filter(r => r.payment_method === 'card');

    const cashEarnings = cashRides.reduce((sum, ride) => {
      return sum + parseFloat(ride.fare || ride.estimated_cost || 0);
    }, 0);

    const ecocashEarnings = ecocashRides.reduce((sum, ride) => {
      return sum + parseFloat(ride.fare || ride.estimated_cost || 0);
    }, 0);

    const cardEarnings = cardRides.reduce((sum, ride) => {
      return sum + parseFloat(ride.fare || ride.estimated_cost || 0);
    }, 0);

    return {
      totalRides,
      grossEarnings: grossEarnings.toFixed(2),
      commission: commission.toFixed(2),
      netEarnings: netEarnings.toFixed(2),
      commissionRate: (commissionRate * 100).toFixed(0) + '%',
      byPaymentMethod: {
        cash: {
          rides: cashRides.length,
          earnings: cashEarnings.toFixed(2)
        },
        ecocash: {
          rides: ecocashRides.length,
          earnings: ecocashEarnings.toFixed(2)
        },
        card: {
          rides: cardRides.length,
          earnings: cardEarnings.toFixed(2)
        }
      }
    };
  } catch (error) {
    console.error('Error calculating earnings:', error);
    throw error;
  }
};

/**
 * Get earnings trend data for charts
 * @param {string} driverId - Driver's user ID
 * @param {number} days - Number of days to include
 * @returns {Array} Daily earnings data
 */
export const getEarningsTrend = async (driverId, days = 7) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const { data: rides, error } = await supabase
      .from('rides')
      .select('fare, estimated_cost, actual_dropoff_time')
      .eq('driver_id', driverId)
      .eq('ride_status', 'trip_completed')
      .eq('payment_status', 'paid')
      .gte('actual_dropoff_time', startDate.toISOString())
      .order('actual_dropoff_time', { ascending: true });

    if (error) throw error;

    // Group by date
    const earningsByDate = {};
    rides.forEach(ride => {
      const date = new Date(ride.actual_dropoff_time).toLocaleDateString();
      const fare = parseFloat(ride.fare || ride.estimated_cost || 0);
      
      if (!earningsByDate[date]) {
        earningsByDate[date] = {
          date,
          rides: 0,
          earnings: 0
        };
      }
      
      earningsByDate[date].rides += 1;
      earningsByDate[date].earnings += fare;
    });

    // Convert to array and format
    return Object.values(earningsByDate).map(day => ({
      date: day.date,
      rides: day.rides,
      earnings: day.earnings.toFixed(2)
    }));
  } catch (error) {
    console.error('Error getting earnings trend:', error);
    throw error;
  }
};

/**
 * Get top earning hours for a driver
 * @param {string} driverId - Driver's user ID
 * @returns {Array} Hourly earnings data
 */
export const getTopEarningHours = async (driverId) => {
  try {
    const { data: rides, error } = await supabase
      .from('rides')
      .select('fare, estimated_cost, actual_dropoff_time')
      .eq('driver_id', driverId)
      .eq('ride_status', 'trip_completed')
      .eq('payment_status', 'paid');

    if (error) throw error;

    // Group by hour
    const earningsByHour = {};
    rides.forEach(ride => {
      const hour = new Date(ride.actual_dropoff_time).getHours();
      const fare = parseFloat(ride.fare || ride.estimated_cost || 0);
      
      if (!earningsByHour[hour]) {
        earningsByHour[hour] = {
          hour,
          rides: 0,
          earnings: 0
        };
      }
      
      earningsByHour[hour].rides += 1;
      earningsByHour[hour].earnings += fare;
    });

    // Convert to array and sort by earnings
    return Object.values(earningsByHour)
      .map(hourData => ({
        hour: `${hourData.hour}:00`,
        rides: hourData.rides,
        earnings: hourData.earnings.toFixed(2),
        avgPerRide: (hourData.earnings / hourData.rides).toFixed(2)
      }))
      .sort((a, b) => parseFloat(b.earnings) - parseFloat(a.earnings));
  } catch (error) {
    console.error('Error getting top earning hours:', error);
    throw error;
  }
};

/**
 * Update driver's total earnings in profile
 * @param {string} driverId - Driver's user ID
 */
export const updateDriverTotalEarnings = async (driverId) => {
  try {
    const earnings = await calculateDriverEarnings(driverId, 'all');
    
    const { error } = await supabase
      .from('driver_profiles')
      .update({
        total_earnings: parseFloat(earnings.netEarnings),
        total_trips: earnings.totalRides
      })
      .eq('driver_id', driverId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating driver total earnings:', error);
    throw error;
  }
};

/**
 * Get pending payouts for a driver
 * @param {string} driverId - Driver's user ID
 * @returns {Object} Pending payout information
 */
export const getPendingPayouts = async (driverId) => {
  try {
    // Get completed rides that haven't been paid out yet
    const { data: rides, error } = await supabase
      .from('rides')
      .select('fare, estimated_cost, payment_method, actual_dropoff_time')
      .eq('driver_id', driverId)
      .eq('ride_status', 'trip_completed')
      .eq('payment_status', 'paid')
      .is('payout_status', null); // Assuming we'll add this column

    if (error) throw error;

    const totalPending = rides.reduce((sum, ride) => {
      const fare = parseFloat(ride.fare || ride.estimated_cost || 0);
      const commission = fare * 0.15;
      return sum + (fare - commission);
    }, 0);

    return {
      pendingRides: rides.length,
      pendingAmount: totalPending.toFixed(2),
      oldestPendingDate: rides.length > 0 
        ? new Date(rides[0].actual_dropoff_time).toLocaleDateString()
        : null
    };
  } catch (error) {
    console.error('Error getting pending payouts:', error);
    throw error;
  }
};

