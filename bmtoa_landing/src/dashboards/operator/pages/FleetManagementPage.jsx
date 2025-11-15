import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import FormInput, { FormSelect } from '../../shared/FormInput';
import useAuthStore from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';

/**
 * Operator Fleet Management Page
 *
 * Features:
 * - Grid/List view of all vehicles
 * - Add new vehicle
 * - Edit vehicle details
 * - Status toggle (Active, Maintenance, Idle)
 * - Assign driver
 * - Maintenance scheduling
 * - Zimbabwe vehicle registration format (ABC 1234)
 *
 * State Management:
 * - vehicles: Array of vehicle objects
 * - viewMode: 'grid' or 'list'
 * - showAddModal: Boolean for add vehicle modal
 * - showEditModal: Boolean for edit vehicle modal
 * - selectedVehicle: Currently selected vehicle for editing
 * - formData: Form data for add/edit
 *
 * Database Integration Ready:
 * - Fetch: SELECT * FROM vehicles WHERE operator_id = current_operator
 * - Add: INSERT INTO vehicles (operator_id, registration, make, model, year, status, ...)
 * - Update: UPDATE vehicles SET ... WHERE id = vehicle_id
 * - Delete: UPDATE vehicles SET status = 'inactive' WHERE id = vehicle_id
 */

const FleetManagementPage = () => {
  const user = useAuthStore((state) => state.user);

  // State management
  const [vehicles, setVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignDriverModal, setShowAssignDriverModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [formData, setFormData] = useState({
    registration: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    status: 'idle',
    assignedDriver: '',
    fuelType: 'Petrol',
    seatingCapacity: 4,
    mileage: 0,
    // Registration Documents
    registrationBookExpiry: '',
    insuranceExpiry: '',
    roadTaxExpiry: '',
    fitnessExpiry: '',
    // Service tracking
    lastServiceDate: '',
    lastServiceMileage: 0,
    nextServiceDate: '',
    nextServiceMileage: 0,
  });

  // Load vehicles and drivers from Supabase
  useEffect(() => {
    if (user) {
      loadFleetData();
    }
  }, [user]);

  const loadFleetData = async () => {
    try {
      setLoading(true);

      // Fetch vehicles for this operator
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('operator_vehicles')
        .select(`
          id,
          license_plate,
          make,
          model,
          year,
          color,
          vehicle_photo,
          vehicle_registration,
          insurance_certificate,
          roadworthy_certificate,
          assigned_to_driver,
          assignment_status,
          verified,
          created_at
        `)
        .eq('operator_id', user.id)
        .order('created_at', { ascending: false });

      if (vehiclesError) throw vehiclesError;

      // Fetch assigned drivers info
      const driverIds = vehiclesData
        ?.filter(v => v.assigned_to_driver)
        .map(v => v.assigned_to_driver) || [];

      let driversMap = {};
      if (driverIds.length > 0) {
        const { data: driversData, error: driversError } = await supabase
          .from('driver_profiles')
          .select('user_id, full_name, profiles!driver_profiles_user_id_fkey(name)')
          .in('user_id', driverIds);

        if (!driversError && driversData) {
          driversMap = driversData.reduce((acc, driver) => {
            acc[driver.user_id] = driver.full_name || driver.profiles?.name || 'Unknown Driver';
            return acc;
          }, {});
        }
      }

      // Fetch available drivers (approved drivers for this operator)
      const { data: availDrivers, error: availDriversError } = await supabase
        .from('driver_profiles')
        .select(`
          user_id,
          full_name,
          profiles!driver_profiles_user_id_fkey(name)
        `)
        .eq('operator_id', user.id)
        .eq('operator_approval_status', 'approved');

      if (!availDriversError && availDrivers) {
        setAvailableDrivers(availDrivers.map(d => ({
          id: d.user_id,
          name: d.full_name || d.profiles?.name || 'Unknown Driver'
        })));
      }

      // Transform vehicles data
      const transformedVehicles = (vehiclesData || []).map(vehicle => ({
        id: vehicle.id,
        registration: vehicle.license_plate || 'N/A',
        make: vehicle.make || 'N/A',
        model: vehicle.model || 'N/A',
        year: vehicle.year || 0,
        color: vehicle.color || 'N/A',
        status: vehicle.assignment_status || 'available',
        assignedDriver: driversMap[vehicle.assigned_to_driver] || null,
        driverId: vehicle.assigned_to_driver || null,
        verified: vehicle.verified || false,
        vehiclePhoto: vehicle.vehicle_photo,
        vehicleRegistration: vehicle.vehicle_registration,
        insuranceCertificate: vehicle.insurance_certificate,
        roadworthyCertificate: vehicle.roadworthy_certificate,
        // TODO: Add maintenance tracking fields when maintenance table is created
        lastService: null,
        nextService: null,
        mileage: 0,
        fuelType: 'Petrol',
        seatingCapacity: 4,
      }));

      setVehicles(transformedVehicles);
    } catch (error) {
      console.error('Error loading fleet data:', error);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active', icon: '🟢' },
      maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Maintenance', icon: '🔧' },
      idle: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Idle', icon: '⚪' },
    };
    const badge = badges[status] || badges.idle;
    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  // Check if document is expiring soon (within 30 days)
  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  // Check if document is expired
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  };

  // Get expiring documents for a vehicle
  const getExpiringDocuments = (vehicle) => {
    const docs = [];
    if (isExpired(vehicle.registrationBookExpiry)) docs.push({ name: 'Registration Book', status: 'expired', date: vehicle.registrationBookExpiry });
    else if (isExpiringSoon(vehicle.registrationBookExpiry)) docs.push({ name: 'Registration Book', status: 'expiring', date: vehicle.registrationBookExpiry });

    if (isExpired(vehicle.insuranceExpiry)) docs.push({ name: 'Insurance', status: 'expired', date: vehicle.insuranceExpiry });
    else if (isExpiringSoon(vehicle.insuranceExpiry)) docs.push({ name: 'Insurance', status: 'expiring', date: vehicle.insuranceExpiry });

    if (isExpired(vehicle.roadTaxExpiry)) docs.push({ name: 'Road Tax', status: 'expired', date: vehicle.roadTaxExpiry });
    else if (isExpiringSoon(vehicle.roadTaxExpiry)) docs.push({ name: 'Road Tax', status: 'expiring', date: vehicle.roadTaxExpiry });

    if (isExpired(vehicle.fitnessExpiry)) docs.push({ name: 'Fitness Certificate', status: 'expired', date: vehicle.fitnessExpiry });
    else if (isExpiringSoon(vehicle.fitnessExpiry)) docs.push({ name: 'Fitness Certificate', status: 'expiring', date: vehicle.fitnessExpiry });

    return docs;
  };

  // Handle add vehicle
  const handleAddVehicle = async (e) => {
    e.preventDefault();

    // Validate Zimbabwe registration format (ABC 1234)
    const regPattern = /^[A-Z]{3}\s\d{4}$/;
    if (!regPattern.test(formData.registration)) {
      alert('Invalid registration format. Use format: ABC 1234 (3 letters, space, 4 numbers)');
      return;
    }

    try {
      // Insert vehicle into database
      const { data, error } = await supabase
        .from('operator_vehicles')
        .insert({
          operator_id: user.id,
          license_plate: formData.registration,
          make: formData.make,
          model: formData.model,
          year: formData.year,
          color: formData.color,
          assigned_to_driver: formData.assignedDriver || null,
          assignment_status: formData.assignedDriver ? 'assigned' : 'available',
        })
        .select()
        .single();

      if (error) throw error;

      // Reload fleet data to get updated list
      await loadFleetData();

      setShowAddModal(false);
      resetForm();
      alert('Vehicle added successfully!');
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Failed to add vehicle. Please try again.');
    }
  };

  // Handle edit vehicle
  const handleEditVehicle = async (e) => {
    e.preventDefault();

    try {
      // Update vehicle in database
      const { error } = await supabase
        .from('operator_vehicles')
        .update({
          license_plate: formData.registration,
          make: formData.make,
          model: formData.model,
          year: formData.year,
          color: formData.color,
          assigned_to_driver: formData.assignedDriver || null,
          assignment_status: formData.assignedDriver ? 'assigned' : 'available',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedVehicle.id);

      if (error) throw error;

      // Reload fleet data to get updated list
      await loadFleetData();

      setShowEditModal(false);
      setSelectedVehicle(null);
      resetForm();
      alert('Vehicle updated successfully!');
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert('Failed to update vehicle. Please try again.');
    }
  };

  // Open edit modal
  const openEditModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      registration: vehicle.registration,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      status: vehicle.status,
      assignedDriver: vehicle.driverId?.toString() || '',
      fuelType: vehicle.fuelType,
      seatingCapacity: vehicle.seatingCapacity,
      mileage: vehicle.mileage,
    });
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      registration: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      status: 'idle',
      assignedDriver: '',
      fuelType: 'Petrol',
      seatingCapacity: 4,
      mileage: 0,
    });
  };

  // Open assign driver modal
  const openAssignDriverModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setSelectedDriverId(vehicle.driverId?.toString() || '');
    setShowAssignDriverModal(true);
  };

  // Handle assign driver
  const handleAssignDriver = async () => {
    if (!selectedVehicle) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('operator_vehicles')
        .update({
          assigned_to_driver: selectedDriverId || null,
          assignment_status: selectedDriverId ? 'assigned' : 'available',
          assigned_at: selectedDriverId ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedVehicle.id);

      if (error) throw error;

      // Reload fleet data
      await loadFleetData();

      setShowAssignDriverModal(false);
      setSelectedVehicle(null);
      setSelectedDriverId('');
      alert('Driver assignment updated successfully!');
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('Failed to assign driver. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle vehicle status
  const toggleStatus = async (vehicleId, currentStatus) => {
    const statusCycle = {
      available: 'maintenance',
      assigned: 'maintenance',
      maintenance: 'available',
      active: 'maintenance'
    };
    const newStatus = statusCycle[currentStatus] || 'available';

    try {
      // Update vehicle status in database
      const { error } = await supabase
        .from('operator_vehicles')
        .update({ assignment_status: newStatus })
        .eq('id', vehicleId);

      if (error) throw error;

      // Update local state
      const updatedVehicles = vehicles.map(v =>
        v.id === vehicleId ? { ...v, status: newStatus } : v
      );
      setVehicles(updatedVehicles);
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      alert('Failed to update vehicle status. Please try again.');
    }
  };

  // Calculate stats
  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    idle: vehicles.filter(v => v.status === 'idle').length,
  };

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-700">Fleet Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex gap-2 bg-white rounded-lg shadow p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-yellow-400 text-slate-700' : 'text-slate-600'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-yellow-400 text-slate-700' : 'text-slate-600'}`}
              >
                List
              </button>
            </div>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              + Add Vehicle
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <p className="text-sm text-slate-600">Total Vehicles</p>
            <p className="text-3xl font-bold text-slate-700">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-green-700">Active</p>
            <p className="text-3xl font-bold text-green-700">{stats.active}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-yellow-700">Maintenance</p>
            <p className="text-3xl font-bold text-yellow-700">{stats.maintenance}</p>
          </div>
          <div className="bg-gray-50 rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-700">Idle</p>
            <p className="text-3xl font-bold text-gray-700">{stats.idle}</p>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading fleet...</p>
            </div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-lg">
            <div className="text-center">
              <p className="text-slate-600 mb-4">No vehicles in your fleet yet</p>
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                + Add Your First Vehicle
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Vehicles Grid View */}
            {viewMode === 'grid' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-700">{vehicle.registration}</h3>
                    <p className="text-sm text-slate-500">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                  </div>
                  {getStatusBadge(vehicle.status)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Color:</span>
                    <span className="font-medium text-slate-700">{vehicle.color}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Driver:</span>
                    <span className="font-medium text-slate-700">
                      {vehicle.assignedDriver || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Mileage:</span>
                    <span className="font-medium text-slate-700">{vehicle.mileage?.toLocaleString()} km</span>
                  </div>
                  {vehicle.nextServiceDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Next Service:</span>
                      <span className="font-medium text-slate-700">{vehicle.nextServiceDate}</span>
                    </div>
                  )}
                </div>

                {/* Expiring Documents Alert */}
                {getExpiringDocuments(vehicle).length > 0 && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs font-semibold text-orange-700 mb-2">⚠️ Document Alerts:</p>
                    <div className="space-y-1">
                      {getExpiringDocuments(vehicle).map((doc, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className={doc.status === 'expired' ? 'text-red-600 font-medium' : 'text-orange-600'}>
                            {doc.name}
                          </span>
                          <span className={doc.status === 'expired' ? 'text-red-600 font-bold' : 'text-orange-600'}>
                            {doc.status === 'expired' ? 'EXPIRED' : `Expires ${doc.date}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(vehicle)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openAssignDriverModal(vehicle)}
                  >
                    🚗 Assign
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vehicles List View */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Registration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Mileage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{vehicle.registration}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {vehicle.assignedDriver || <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(vehicle.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{vehicle.mileage?.toLocaleString()} km</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(vehicle)}>
                          Edit
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => openAssignDriverModal(vehicle)}>
                          Assign
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </>
        )}
      </div>

      {/* Add Vehicle Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add New Vehicle"
        size="lg"
      >
        <form onSubmit={handleAddVehicle}>
          <div className="grid md:grid-cols-2 gap-4">
            <FormInput
              label="Registration Number"
              name="registration"
              value={formData.registration}
              onChange={(e) => setFormData({ ...formData, registration: e.target.value.toUpperCase() })}
              placeholder="ABC 1234"
              required
              helperText="Format: ABC 1234 (3 letters, space, 4 numbers)"
            />
            <FormInput
              label="Make"
              name="make"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              placeholder="Toyota"
              required
            />
            <FormInput
              label="Model"
              name="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="Corolla"
              required
            />
            <FormInput
              label="Year"
              name="year"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              min="2000"
              max={new Date().getFullYear() + 1}
              required
            />
            <FormInput
              label="Color"
              name="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="White"
              required
            />
            <FormSelect
              label="Fuel Type"
              name="fuelType"
              value={formData.fuelType}
              onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
              required
              options={[
                { value: 'Petrol', label: 'Petrol' },
                { value: 'Diesel', label: 'Diesel' },
                { value: 'Hybrid', label: 'Hybrid' },
                { value: 'Electric', label: 'Electric' },
              ]}
            />
            <FormInput
              label="Seating Capacity"
              name="seatingCapacity"
              type="number"
              value={formData.seatingCapacity}
              onChange={(e) => setFormData({ ...formData, seatingCapacity: parseInt(e.target.value) })}
              min="2"
              max="8"
              required
            />
            <FormInput
              label="Current Mileage (km)"
              name="mileage"
              type="number"
              value={formData.mileage}
              onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
              min="0"
              required
            />
            <FormSelect
              label="Status"
              name="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
              options={[
                { value: 'idle', label: 'Idle' },
                { value: 'active', label: 'Active' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
            />
            <FormSelect
              label="Assign Driver (Optional)"
              name="assignedDriver"
              value={formData.assignedDriver}
              onChange={(e) => setFormData({ ...formData, assignedDriver: e.target.value })}
              options={[
                { value: '', label: 'Unassigned' },
                ...availableDrivers.map(d => ({ value: d.id.toString(), label: d.name })),
              ]}
            />
          </div>

          {/* Registration Documents Section */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">📄 Registration Documents</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <FormInput
                label="Registration Book Expiry"
                name="registrationBookExpiry"
                type="date"
                value={formData.registrationBookExpiry}
                onChange={(e) => setFormData({ ...formData, registrationBookExpiry: e.target.value })}
                required
                helperText="Vehicle registration book expiry date"
              />
              <FormInput
                label="Insurance Expiry"
                name="insuranceExpiry"
                type="date"
                value={formData.insuranceExpiry}
                onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                required
                helperText="Vehicle insurance expiry date"
              />
              <FormInput
                label="Road Tax Expiry"
                name="roadTaxExpiry"
                type="date"
                value={formData.roadTaxExpiry}
                onChange={(e) => setFormData({ ...formData, roadTaxExpiry: e.target.value })}
                required
                helperText="Road tax/license disc expiry"
              />
              <FormInput
                label="Fitness Certificate Expiry"
                name="fitnessExpiry"
                type="date"
                value={formData.fitnessExpiry}
                onChange={(e) => setFormData({ ...formData, fitnessExpiry: e.target.value })}
                required
                helperText="Vehicle fitness certificate expiry"
              />
            </div>
          </div>

          {/* Service Tracking Section */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">🔧 Service Tracking</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <FormInput
                label="Last Service Date"
                name="lastServiceDate"
                type="date"
                value={formData.lastServiceDate}
                onChange={(e) => setFormData({ ...formData, lastServiceDate: e.target.value })}
                helperText="Date of last service"
              />
              <FormInput
                label="Last Service Mileage (km)"
                name="lastServiceMileage"
                type="number"
                value={formData.lastServiceMileage}
                onChange={(e) => setFormData({ ...formData, lastServiceMileage: parseInt(e.target.value) || 0 })}
                min="0"
                helperText="Mileage at last service"
              />
              <FormInput
                label="Next Service Date"
                name="nextServiceDate"
                type="date"
                value={formData.nextServiceDate}
                onChange={(e) => setFormData({ ...formData, nextServiceDate: e.target.value })}
                helperText="Scheduled next service date"
              />
              <FormInput
                label="Next Service Mileage (km)"
                name="nextServiceMileage"
                type="number"
                value={formData.nextServiceMileage}
                onChange={(e) => setFormData({ ...formData, nextServiceMileage: parseInt(e.target.value) || 0 })}
                min="0"
                helperText="Mileage for next service"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Vehicle
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Vehicle Modal */}
      {selectedVehicle && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedVehicle(null);
            resetForm();
          }}
          title={`Edit Vehicle - ${selectedVehicle.registration}`}
          size="lg"
        >
          <form onSubmit={handleEditVehicle}>
            <div className="grid md:grid-cols-2 gap-4">
              <FormInput
                label="Registration Number"
                name="registration"
                value={formData.registration}
                onChange={(e) => setFormData({ ...formData, registration: e.target.value.toUpperCase() })}
                placeholder="ABC 1234"
                required
                helperText="Format: ABC 1234"
              />
              <FormInput
                label="Make"
                name="make"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                required
              />
              <FormInput
                label="Model"
                name="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
              />
              <FormInput
                label="Year"
                name="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                min="2000"
                max={new Date().getFullYear() + 1}
                required
              />
              <FormInput
                label="Color"
                name="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                required
              />
              <FormSelect
                label="Fuel Type"
                name="fuelType"
                value={formData.fuelType}
                onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                required
                options={[
                  { value: 'Petrol', label: 'Petrol' },
                  { value: 'Diesel', label: 'Diesel' },
                  { value: 'Hybrid', label: 'Hybrid' },
                  { value: 'Electric', label: 'Electric' },
                ]}
              />
              <FormInput
                label="Seating Capacity"
                name="seatingCapacity"
                type="number"
                value={formData.seatingCapacity}
                onChange={(e) => setFormData({ ...formData, seatingCapacity: parseInt(e.target.value) })}
                min="2"
                max="8"
                required
              />
              <FormInput
                label="Current Mileage (km)"
                name="mileage"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                min="0"
                required
              />
              <FormSelect
                label="Status"
                name="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
                options={[
                  { value: 'idle', label: 'Idle' },
                  { value: 'active', label: 'Active' },
                  { value: 'maintenance', label: 'Maintenance' },
                ]}
              />
              <FormSelect
                label="Assign Driver"
                name="assignedDriver"
                value={formData.assignedDriver}
                onChange={(e) => setFormData({ ...formData, assignedDriver: e.target.value })}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...availableDrivers.map(d => ({ value: d.id.toString(), label: d.name })),
                ]}
              />
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedVehicle(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Update Vehicle
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Driver Modal */}
      {selectedVehicle && (
        <Modal
          isOpen={showAssignDriverModal}
          onClose={() => {
            setShowAssignDriverModal(false);
            setSelectedVehicle(null);
            setSelectedDriverId('');
          }}
          title={`Assign Driver - ${selectedVehicle.registration}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-semibold text-slate-700 mb-2">Vehicle Details</h3>
              <p className="text-sm text-slate-600">
                {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year}) - {selectedVehicle.color}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Current Driver: {selectedVehicle.assignedDriver || 'Unassigned'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Driver
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">Unassign (No Driver)</option>
                {availableDrivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {availableDrivers.length === 0
                  ? 'No approved drivers available. Add drivers from the Drivers page.'
                  : `${availableDrivers.length} approved driver(s) available`}
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignDriverModal(false);
                  setSelectedVehicle(null);
                  setSelectedDriverId('');
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAssignDriver}
                disabled={submitting}
              >
                {submitting ? 'Assigning...' : 'Assign Driver'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default FleetManagementPage;
