import React, { useState } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import FormInput, { FormSelect, FormTextarea } from '../../shared/FormInput';

/**
 * Operator Maintenance Page (BMTOA)
 *
 * Features:
 * - Vehicle maintenance tracking
 * - Service history
 * - Maintenance reminders
 * - Cost tracking
 *
 * Database Integration Ready:
 * - Fetch: SELECT * FROM maintenance_records WHERE operator_id = current_operator
 * - Insert: INSERT INTO maintenance_records (vehicle_id, type, cost, date, ...)
 */

const MaintenancePage = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [maintenanceData, setMaintenanceData] = useState({
    vehicleId: '',
    type: '',
    description: '',
    cost: '',
    date: '',
    nextServiceDate: ''
  });

  const vehicles = [
    { id: 1, registration: 'ABC 1234', make: 'Toyota Corolla' },
    { id: 2, registration: 'DEF 5678', make: 'Honda Fit' },
    { id: 3, registration: 'GHI 9012', make: 'Nissan Note' }
  ];

  const maintenanceRecords = [
    {
      id: 1,
      vehicle: 'ABC 1234',
      type: 'Oil Change',
      description: 'Regular oil and filter change',
      cost: 45.00,
      date: '2025-01-02',
      nextService: '2025-04-02',
      status: 'completed',
      mileage: '45,000 km'
    },
    {
      id: 2,
      vehicle: 'DEF 5678',
      type: 'Tire Replacement',
      description: 'Replaced all 4 tires',
      cost: 280.00,
      date: '2024-12-28',
      nextService: '2025-12-28',
      status: 'completed',
      mileage: '52,000 km'
    },
    {
      id: 3,
      vehicle: 'ABC 1234',
      type: 'Brake Service',
      description: 'Brake pads and rotors replacement',
      cost: 150.00,
      date: '2024-12-15',
      nextService: '2025-06-15',
      status: 'completed',
      mileage: '44,500 km'
    },
    {
      id: 4,
      vehicle: 'GHI 9012',
      type: 'Annual Service',
      description: 'Comprehensive annual service',
      cost: 200.00,
      date: '2024-11-20',
      nextService: '2025-11-20',
      status: 'completed',
      mileage: '38,000 km'
    }
  ];

  const upcomingMaintenance = [
    { vehicle: 'ABC 1234', type: 'Oil Change', dueDate: '2025-04-02', daysUntil: 90 },
    { vehicle: 'DEF 5678', type: 'Annual Service', dueDate: '2025-03-15', daysUntil: 72 },
    { vehicle: 'GHI 9012', type: 'Tire Rotation', dueDate: '2025-02-10', daysUntil: 39 }
  ];

  const stats = {
    totalCost: maintenanceRecords.reduce((sum, r) => sum + r.cost, 0),
    thisMonth: maintenanceRecords.filter(r => r.date.startsWith('2025-01')).length,
    upcoming: upcomingMaintenance.length,
    avgCost: (maintenanceRecords.reduce((sum, r) => sum + r.cost, 0) / maintenanceRecords.length).toFixed(2)
  };

  const handleAddMaintenance = (e) => {
    e.preventDefault();

    // Database integration:
    // await supabase
    //   .from('maintenance_records')
    //   .insert({
    //     operator_id: currentOperatorId,
    //     vehicle_id: maintenanceData.vehicleId,
    //     type: maintenanceData.type,
    //     description: maintenanceData.description,
    //     cost: parseFloat(maintenanceData.cost),
    //     date: maintenanceData.date,
    //     next_service_date: maintenanceData.nextServiceDate,
    //     status: 'completed'
    //   });

    setShowAddModal(false);
    setMaintenanceData({ vehicleId: '', type: '', description: '', cost: '', date: '', nextServiceDate: '' });
    alert('Maintenance record added successfully!');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">Vehicle Maintenance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track maintenance history and upcoming services
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          Add Maintenance Record
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <p className="text-sm text-slate-600">Total Spent</p>
          <p className="text-3xl font-bold text-slate-700">${stats.totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-lg p-4">
          <p className="text-sm text-blue-700">This Month</p>
          <p className="text-3xl font-bold text-blue-700">{stats.thisMonth}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-lg p-4">
          <p className="text-sm text-yellow-700">Upcoming</p>
          <p className="text-3xl font-bold text-yellow-700">{stats.upcoming}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-lg p-4">
          <p className="text-sm text-green-700">Avg Cost</p>
          <p className="text-3xl font-bold text-green-700">${stats.avgCost}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Upcoming Maintenance */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Upcoming Maintenance</h2>
          <div className="space-y-3">
            {upcomingMaintenance.map((item, index) => (
              <div key={index} className={`p-3 rounded-lg border-l-4 ${
                item.daysUntil <= 30 ? 'bg-red-50 border-red-400' :
                item.daysUntil <= 60 ? 'bg-yellow-50 border-yellow-400' :
                'bg-blue-50 border-blue-400'
              }`}>
                <p className="font-medium text-slate-700">{item.vehicle}</p>
                <p className="text-sm text-slate-600 mt-1">{item.type}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-slate-500">{item.dueDate}</span>
                  <span className={`text-xs font-medium ${
                    item.daysUntil <= 30 ? 'text-red-600' :
                    item.daysUntil <= 60 ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    {item.daysUntil} days
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance History */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Maintenance History</h2>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4 border-b border-slate-200">
            {['all', 'oil change', 'tire', 'brake', 'annual'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  filter === tab
                    ? 'text-yellow-600 border-b-2 border-yellow-600'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {maintenanceRecords.map((record) => (
              <div key={record.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-slate-700">{record.vehicle} - {record.type}</p>
                    <p className="text-sm text-slate-600 mt-1">{record.description}</p>
                  </div>
                  <span className="font-bold text-green-600">${record.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>📅 {record.date}</span>
                  <span>🔧 {record.mileage}</span>
                  <span>Next: {record.nextService}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Maintenance Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setMaintenanceData({ vehicleId: '', type: '', description: '', cost: '', date: '', nextServiceDate: '' });
        }}
        title="Add Maintenance Record"
        size="md"
      >
        <form onSubmit={handleAddMaintenance}>
          <FormSelect
            label="Vehicle"
            value={maintenanceData.vehicleId}
            onChange={(e) => setMaintenanceData({ ...maintenanceData, vehicleId: e.target.value })}
            required
            options={vehicles.map(v => ({ value: v.id, label: `${v.registration} - ${v.make}` }))}
          />

          <FormSelect
            label="Maintenance Type"
            value={maintenanceData.type}
            onChange={(e) => setMaintenanceData({ ...maintenanceData, type: e.target.value })}
            required
            options={[
              { value: 'Oil Change', label: 'Oil Change' },
              { value: 'Tire Replacement', label: 'Tire Replacement' },
              { value: 'Brake Service', label: 'Brake Service' },
              { value: 'Annual Service', label: 'Annual Service' },
              { value: 'Engine Repair', label: 'Engine Repair' },
              { value: 'Other', label: 'Other' }
            ]}
          />

          <FormTextarea
            label="Description"
            value={maintenanceData.description}
            onChange={(e) => setMaintenanceData({ ...maintenanceData, description: e.target.value })}
            placeholder="Describe the maintenance work performed..."
            rows={3}
            required
          />

          <FormInput
            label="Cost (USD)"
            type="number"
            step="0.01"
            value={maintenanceData.cost}
            onChange={(e) => setMaintenanceData({ ...maintenanceData, cost: e.target.value })}
            required
          />

          <FormInput
            label="Service Date"
            type="date"
            value={maintenanceData.date}
            onChange={(e) => setMaintenanceData({ ...maintenanceData, date: e.target.value })}
            required
          />

          <FormInput
            label="Next Service Date"
            type="date"
            value={maintenanceData.nextServiceDate}
            onChange={(e) => setMaintenanceData({ ...maintenanceData, nextServiceDate: e.target.value })}
            required
          />

          <div className="flex gap-3 justify-end mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setMaintenanceData({ vehicleId: '', type: '', description: '', cost: '', date: '', nextServiceDate: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MaintenancePage;
