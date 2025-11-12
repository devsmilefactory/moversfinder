import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, X } from 'lucide-react';
import CorporatePWALayout from '../../../components/layouts/CorporatePWALayout';
import useAuthStore from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';

/**
 * Corporate Passengers Page - PWA Version
 * Manage passengers (employees and clients) for corporate account
 */
const CorporateEmployeesPage = () => {
  const { user } = useAuthStore();
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'employee' | 'client'
  const [showAddModal, setShowAddModal] = useState(false);

  // Load passengers on mount
  useEffect(() => {
    loadPassengers();
  }, [user?.id]);

  const loadPassengers = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      // Fetch real passengers from Supabase
      const { data, error } = await supabase
        .from('corporate_passengers')
        .select('*')
        .eq('corporate_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPassengers(data || []);
    } catch (error) {
      console.error('Error loading passengers:', error);
      setPassengers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter passengers
  const filteredPassengers = passengers.filter((passenger) => {
    const matchesSearch =
      passenger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === 'all' || passenger.passenger_type === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <CorporatePWALayout title="Passengers">
      <div className="p-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-slate-800">Passengers</h2>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search passengers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterType === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300'
              }`}
            >
              All ({passengers.length})
            </button>
            <button
              onClick={() => setFilterType('employee')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterType === 'employee'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300'
              }`}
            >
              Employees ({passengers.filter((p) => p.passenger_type === 'employee').length})
            </button>
            <button
              onClick={() => setFilterType('client')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterType === 'client'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300'
              }`}
            >
              Clients ({passengers.filter((p) => p.passenger_type === 'client').length})
            </button>
          </div>
        </div>

        {/* Passenger List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : filteredPassengers.length > 0 ? (
            filteredPassengers.map((passenger) => (
              <div
                key={passenger.id}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{passenger.name}</h3>
                    <p className="text-sm text-slate-600">{passenger.email}</p>
                    <p className="text-sm text-slate-500">{passenger.phone}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                      passenger.passenger_type === 'employee'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {passenger.passenger_type}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">{passenger.department || passenger.company || 'N/A'}</span>
                    <span className="mx-2">•</span>
                    <span>{passenger.total_rides || 0} rides</span>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                      passenger.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {passenger.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              No passengers found
            </div>
          )}
        </div>
      </div>

      {/* Add Passenger Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
              <h2 className="text-xl font-bold">Add Passenger</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-purple-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);

                try {
                  const { data, error } = await supabase
                    .from('corporate_passengers')
                    .insert([
                      {
                        corporate_user_id: user.id,
                        name: formData.get('name'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        passenger_type: formData.get('passenger_type'),
                        department: formData.get('department') || null,
                        employee_id: formData.get('employee_id') || null,
                      }
                    ])
                    .select();

                  if (error) throw error;

                  setShowAddModal(false);
                  loadPassengers();
                } catch (error) {
                  console.error('Error adding passenger:', error);
                  alert('Failed to add passenger. Please try again.');
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="+263..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Passenger Type *
                </label>
                <select
                  name="passenger_type"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="employee">Employee</option>
                  <option value="client">Client</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Department (Optional)
                </label>
                <input
                  type="text"
                  name="department"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Sales, IT, HR"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Employee ID (Optional)
                </label>
                <input
                  type="text"
                  name="employee_id"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., EMP001"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Add Passenger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CorporatePWALayout>
  );
};

export default CorporateEmployeesPage;

