import React, { useState, useEffect } from 'react';
import { Car, Filter, Calendar, MapPin } from 'lucide-react';
import CorporatePWALayout from '../../../components/layouts/CorporatePWALayout';
import useAuthStore from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';

/**
 * Corporate Rides Page - PWA Version
 * View and manage all company rides
 */
const CorporateRidesPage = () => {
  const { user } = useAuthStore();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    serviceType: 'all',
    dateRange: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load rides on mount
  useEffect(() => {
    loadRides();
  }, [user?.id]);

  const loadRides = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      // Fetch real rides from Supabase
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          passenger:corporate_passengers(name)
        `)
        .eq('corporate_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match component structure
      const transformedRides = (data || []).map(ride => ({
        id: ride.id,
        bookingDate: ride.created_at,
        passengerName: ride.passenger?.name || 'Unknown',
        serviceType: ride.service_type || 'taxi',
        pickup: ride.pickup_location,
        dropoff: ride.dropoff_location,
        status: ride.status,
        estimatedCost: ride.estimated_cost || 0
      }));

      setRides(transformedRides);
    } catch (error) {
      console.error('Error loading rides:', error);
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter rides
  const filteredRides = rides.filter(ride => {
    if (filters.status !== 'all' && ride.status !== filters.status) return false;
    if (filters.serviceType !== 'all' && ride.serviceType !== filters.serviceType) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      scheduled: 'bg-indigo-100 text-indigo-800',
      active: 'bg-blue-100 text-blue-800',
      canceled: 'bg-red-100 text-red-800',
      saved: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-orange-100 text-orange-800',
      confirmed: 'bg-cyan-100 text-cyan-800',
      in_progress: 'bg-purple-100 text-purple-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getServiceIcon = (serviceType) => {
    const icons = {
      taxi: '🚕',
      courier: '📦',
      school_run: '🚌',
      errands: '🛒',
    };
    return icons[serviceType] || '🚗';
  };

  return (
    <CorporatePWALayout title="Rides">
      <div className="p-4">
        {/* Header with Stats */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Car className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-slate-800">Company Rides</h2>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Filter className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-white rounded-lg shadow-md p-2 text-center">
              <div className="text-xl font-bold text-slate-700">{filteredRides.length}</div>
              <div className="text-xs text-slate-600">Total</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2 text-center">
              <div className="text-xl font-bold text-green-600">
                {filteredRides.filter(r => r.status === 'completed').length}
              </div>
              <div className="text-xs text-slate-600">Done</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2 text-center">
              <div className="text-xl font-bold text-blue-600">
                {filteredRides.filter(r => r.status === 'active').length}
              </div>
              <div className="text-xs text-slate-600">Active</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2 text-center">
              <div className="text-xl font-bold text-indigo-600">
                {filteredRides.filter(r => r.status === 'scheduled').length}
              </div>
              <div className="text-xs text-slate-600">Later</div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-white rounded-lg shadow-md p-4 mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="canceled">Canceled</option>
                  <option value="saved">Saved</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Service Type
                </label>
                <select
                  value={filters.serviceType}
                  onChange={(e) => setFilters({ ...filters, serviceType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Services</option>
                  <option value="taxi">Taxi</option>
                  <option value="courier">Courier</option>
                  <option value="school_run">School Run</option>
                  <option value="errands">Errands</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Rides List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : filteredRides.length > 0 ? (
            filteredRides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getServiceIcon(ride.serviceType)}</span>
                    <div>
                      <h3 className="font-semibold text-slate-800">{ride.passengerName}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(ride.bookingDate).toLocaleDateString()}</span>
                        <span>{new Date(ride.bookingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(ride.status)}`}>
                    {ride.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Route */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{ride.pickup}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{ride.dropoff}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <div className="text-lg font-bold text-purple-600">
                    ${ride.estimatedCost.toFixed(2)}
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                      View
                    </button>
                    <button className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                      Rebook
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              No rides found
            </div>
          )}
        </div>
      </div>
    </CorporatePWALayout>
  );
};

export default CorporateRidesPage;

