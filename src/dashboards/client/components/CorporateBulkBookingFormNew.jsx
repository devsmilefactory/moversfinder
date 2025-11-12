import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import FormInput, { FormSelect, FormTextarea } from '../../shared/FormInput';
import LocationInput from '../../shared/LocationInput';
import { usePassengersStore, useAuthStore } from '../../../stores';
import AddPassengerModal from './AddPassengerModal';
import { supabase } from '../../../lib/supabase';
import { createBulkBooking, createBulkRidesWithProgress } from '../../../services/corporateBookingService';

import { useToast } from '../../../components/ui/ToastProvider';
/**
 * Corporate Bulk Booking Form - New Design
 *
 * Features:
 * - Passenger type selection (Staff/Clients/Students/Groups)
 * - Two selection methods:
 *   1. Select specific individuals from list
 *   2. Enter number of passengers (without selecting specific people)
 * - Vehicle type with capacities (2, 3, 5, 7, 14, 28, 60 passengers)
 * - Pickup/dropoff strategies
 * - Scheduling options (Instant/Scheduled/Recurring)
 */

const CorporateBulkBookingFormNew = ({ serviceType, onBack, onComplete }) => {
  const passengers = usePassengersStore((state) => state.passengers);
  const user = useAuthStore((state) => state.user);

  const [passengerType, setPassengerType] = useState('staff'); // 'staff', 'clients', 'students', 'groups'
  const [selectionMethod, setSelectionMethod] = useState('specific'); // 'specific' or 'number'

  // For specific selection
  const [selectedPassengers, setSelectedPassengers] = useState([]);

  // For number selection
  const [passengerCount, setPassengerCount] = useState(1);

  // Account balance state
  const [accountBalance, setAccountBalance] = useState({
    balance: 0,
    loading: true
  });

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Courier-specific: Package mode
  const [packageMode, setPackageMode] = useState('quantity'); // 'quantity' or 'individual'
  const [individualPackages, setIndividualPackages] = useState([
    { recipientName: '', recipientPhone: '', pickupLocation: '', dropoffLocation: '', packageDetails: '', packageSize: 'medium' }
  ]);

  const [vehicleType, setVehicleType] = useState(serviceType === 'courier' ? 'motorcycle' : 'sedan-3');
  const [pickupStrategy, setPickupStrategy] = useState('single'); // 'single', 'multiple', 'individual'
  const [pickupLocations, setPickupLocations] = useState([{ location: '', passengers: [] }]);
  const [dropoffStrategy, setDropoffStrategy] = useState('single'); // 'single', 'multiple', 'individual'
  const [dropoffLocations, setDropoffLocations] = useState([{ location: '', passengers: [] }]);

  // Add Passenger Modal state
  const [isAddPassengerModalOpen, setIsAddPassengerModalOpen] = useState(false);
  const [addPassengerType, setAddPassengerType] = useState('staff');

  const [scheduleType, setScheduleType] = useState('instant'); // 'instant', 'scheduled', 'recurring'
  const [recurringPattern, setRecurringPattern] = useState('daily');

  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    recurringEndDate: '',
    specialInstructions: '',
    // Courier-specific
    packageDetails: '',
    packageSize: 'medium',
    packageCount: 1
  });
  // Toast + bulk progress state
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressState, setProgressState] = useState({ total: 0, current: 0, percent: 0, rows: [] });

  // Mock user for development
  const mockUser = user || {
    id: 'user-1',
    companyId: 'company-1',
  };

  // Load account balance
  useEffect(() => {
    const loadBalance = async () => {
      try {
        if (!mockUser?.companyId) return;

        const { data, error } = await supabase
          .from('corporate_profiles')
          .select('credit_balance')
          .eq('user_id', mockUser.companyId)
          .single();

        if (error) throw error;

        setAccountBalance({
          balance: parseFloat(data?.credit_balance || 0),
          loading: false
        });
      } catch (error) {
        console.error('Error loading balance:', error);
        setAccountBalance({ balance: 0, loading: false });
      }
    };

    loadBalance();
  }, [mockUser?.companyId]);

  // Vehicle types - different for rides vs courier
  const vehicleTypes = serviceType === 'rides'
    ? [
        { value: 'sedan-2', label: 'Small Sedan (2 passengers)', capacity: 2 },
        { value: 'sedan-3', label: 'Sedan (3 passengers)', capacity: 3 },
        { value: 'mpv-5', label: 'MPV/SUV (5 passengers)', capacity: 5 },
        { value: 'mpv-7', label: 'Large MPV (7 passengers)', capacity: 7 },
        { value: 'combi-14', label: 'Combi/Hiace (14 passengers)', capacity: 14 },
        { value: 'bus-28', label: 'Medium Bus (28 passengers)', capacity: 28 },
        { value: 'bus-60', label: 'Large Bus (60 passengers)', capacity: 60 }
      ]
    : [
        { value: 'motorcycle', label: 'Motorcycle', capacity: 1 },
        { value: 'sedan', label: 'Sedan', capacity: 3 },
        { value: 'mpv', label: 'MPV/SUV', capacity: 5 },
        { value: 'van', label: 'Van', capacity: 10 },
        { value: 'small-truck', label: 'Small Truck', capacity: 15 },
        { value: 'large-truck', label: 'Large Truck', capacity: 30 }
      ];

  const passengerTypes = [
    { value: 'staff', label: 'Staff/Employees', icon: '👔' },
    { value: 'clients', label: 'Clients', icon: '🤝' },
    { value: 'students', label: 'Students', icon: '🎓' },
    { value: 'groups', label: 'Groups', icon: '👥' }
  ];

  const handlePassengerToggle = (passengerId) => {
    setSelectedPassengers(prev =>
      prev.includes(passengerId)
        ? prev.filter(id => id !== passengerId)
        : [...prev, passengerId]
    );
  };

  const handleAddPickupLocation = () => {
    setPickupLocations([...pickupLocations, { location: '', passengers: [] }]);
  };

  const handleRemovePickupLocation = (index) => {
    setPickupLocations(pickupLocations.filter((_, i) => i !== index));
  };

  const handlePickupLocationChange = (index, value) => {
    const updated = [...pickupLocations];
    updated[index].location = value;
    setPickupLocations(updated);
  };

  const handleAddDropoffLocation = () => {
    setDropoffLocations([...dropoffLocations, { location: '', passengers: [] }]);
  };

  const handleRemoveDropoffLocation = (index) => {
    setDropoffLocations(dropoffLocations.filter((_, i) => i !== index));
  };

  const handleDropoffLocationChange = (index, value) => {
    const updated = [...dropoffLocations];
    updated[index].location = value;
    setDropoffLocations(updated);
  };

  const handlePassengerAdded = (newPassenger) => {
    // Auto-select the newly added passenger
    setSelectedPassengers([...selectedPassengers, newPassenger.id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const bookingData = {
      bookingType: 'bulk',
      serviceType,
      passengerType,
      selectionMethod,
      selectedPassengers: selectionMethod === 'specific' ? selectedPassengers : null,
      passengerCount: selectionMethod === 'number' ? passengerCount : selectedPassengers.length,
      vehicleType,
      pickupStrategy,
      pickupLocations,
      dropoffStrategy,
      dropoffLocations,
      scheduleType,
      recurringPattern: scheduleType === 'recurring' ? recurringPattern : null,
      paymentMethod,
      ...formData
    };

    const total = bookingData.selectionMethod === 'specific' ? (bookingData.selectedPassengers?.length || 0) : Number(bookingData.passengerCount || 0);
    setIsSubmitting(true);
    setProgressState({ total, current: 0, percent: 0, rows: Array.from({ length: total }, () => ({})) });

    try {
      const result = await createBulkRidesWithProgress(bookingData, user, (update) => {
        setProgressState((prev) => {
          const rows = prev.rows.slice();
          rows[update.index] = update;
          const completed = rows.filter(r => r.success || r.error).length;
          const percent = prev.total ? Math.round((completed / prev.total) * 100) : 0;
          return { ...prev, current: completed, percent, rows };
        });
      });

      const { counts, batchId, results } = result;
      if (counts.failed === 0) {
        addToast({ type: 'success', title: 'Bulk booking complete', message: `Created ${counts.success} of ${counts.total} rides (Batch ${batchId})` });
      } else {
        addToast({ type: 'warn', title: 'Bulk booking partial success', message: `Created ${counts.success} of ${counts.total}. ${counts.failed} failed.` });
      }

      // Provide a concise summary in console for debugging
      console.table(results.map((r, i) => ({ Row: i + 1, Status: r.success ? '✅' : '❌', RideId: r.rideId || '-', Error: r.error || '-' })));

      onComplete?.();
    } catch (error) {
      console.error('Error submitting bulk booking:', error);
      addToast({ type: 'error', title: 'Bulk booking failed', message: error.message || String(error) });
    } finally {
      setIsSubmitting(false);
    }


  };

  const filteredPassengers = passengers.filter(p => p.type === passengerType);
  const totalPassengers = selectionMethod === 'specific' ? selectedPassengers.length : passengerCount;
  const selectedVehicle = vehicleTypes.find(v => v.value === vehicleType);
  const estimatedVehicles = selectedVehicle ? Math.ceil(totalPassengers / selectedVehicle.capacity) : 0;
  const estimatedCost = estimatedVehicles * 15; // $15 per vehicle base rate

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">
            Bulk {serviceType === 'rides' ? 'Ride' : 'Courier'} Booking
          </h1>
          <p className="text-slate-600">
            {serviceType === 'rides' ? 'Book for multiple passengers' : 'Deliver multiple packages'}
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Live Progress */}
        {(isSubmitting || progressState.total > 0) && (
          <div className="mb-4 p-4 border rounded-lg bg-white shadow-sm">
            <div className="text-sm mb-2">Creating ride {progressState.current} of {progressState.total} ({progressState.percent}%)</div>
            <div className="w-full h-2 bg-slate-200 rounded">
              <div className="h-2 bg-blue-600 rounded" style={{ width: `${progressState.percent}%` }} />
            </div>
            <div className="mt-3 max-h-40 overflow-auto space-y-1">
              {progressState.rows.map((row, i) => (
                <div key={i} className={`text-xs ${row?.success ? 'text-green-700' : row?.error ? 'text-red-700' : 'text-slate-600'}`}>
                  {row?.success ? `✅ Row ${i + 1}: Ride ${row.rideId} created` : row?.error ? `❌ Row ${i + 1}: Failed - ${row.error}` : `… Row ${i + 1}: Pending`}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Passenger/Package Selection Section */}
        {serviceType === 'rides' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Select Passengers</h2>

          {/* Passenger Type Tabs */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {passengerTypes.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  setPassengerType(type.value);
      {/* Live Progress */}

                  setSelectedPassengers([]);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  passengerType === type.value
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="text-sm font-semibold text-slate-700">{type.label}</div>
              </button>
            ))}
          </div>

          {/* Selection Method */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setSelectionMethod('specific')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectionMethod === 'specific'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-2">✓</div>
              <div className="font-semibold text-slate-700">Select Specific People</div>
              <div className="text-sm text-slate-600">Choose from list</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectionMethod('number')}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectionMethod === 'number'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-2">#</div>
              <div className="font-semibold text-slate-700">Enter Number</div>
              <div className="text-sm text-slate-600">Just specify count</div>
            </button>
          </div>

          {/* Specific Selection */}
          {selectionMethod === 'specific' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-700">
                  Select {passengerType} ({selectedPassengers.length} selected)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAddPassengerType(passengerType);
                    setIsAddPassengerModalOpen(true);
                  }}
                  className="text-sm text-yellow-600 hover:text-yellow-700 font-medium transition-colors"
                >
                  + Add New {passengerType.slice(0, -1)}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-4 space-y-2">
                {filteredPassengers.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">
                    No {passengerType} found. Click "Add New" to create one.
                  </p>
                ) : (
                  filteredPassengers.map(passenger => (
                    <label
                      key={passenger.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPassengers.includes(passenger.id)}
                        onChange={() => handlePassengerToggle(passenger.id)}
                        className="w-4 h-4 text-yellow-400 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-700">{passenger.name}</div>
                        <div className="text-sm text-slate-500">{passenger.email || passenger.phone}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Number Selection */}
          {selectionMethod === 'number' && (
            <FormInput
              label="Number of Passengers"
              type="number"
              name="passengerCount"
              value={passengerCount}
              onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
              min="1"
              max="100"
              required
            />
          )}
          </div>
        )}

        {/* Courier Package Details Section */}
        {serviceType === 'courier' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Package Details</h2>

            {/* Package Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">How would you like to add packages?</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPackageMode('quantity')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    packageMode === 'quantity'
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-2">📦</div>
                  <div className="font-semibold text-slate-700">Quantity Mode</div>
                  <div className="text-sm text-slate-600">Same details for all packages</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPackageMode('individual')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    packageMode === 'individual'
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-2">📦📦📦</div>
                  <div className="font-semibold text-slate-700">Individual Mode</div>
                  <div className="text-sm text-slate-600">Unique details for each package</div>
                </button>
              </div>
            </div>

            {/* Quantity Mode */}
            {packageMode === 'quantity' && (
              <div className="space-y-4">
                <FormInput
                  label="Number of Packages"
                  type="number"
                  name="packageCount"
                  value={formData.packageCount}
                  onChange={(e) => setFormData({ ...formData, packageCount: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="100"
                  required
                />

                <FormTextarea
                  label="Package Description (applies to all)"
                  name="packageDetails"
                  value={formData.packageDetails}
                  onChange={(e) => setFormData({ ...formData, packageDetails: e.target.value })}
                  placeholder="Describe the packages being delivered..."
                  rows={3}
                  required
                />

                <FormSelect
                  label="Package Size (per package)"
                  name="packageSize"
                  value={formData.packageSize}
                  onChange={(e) => setFormData({ ...formData, packageSize: e.target.value })}
                  options={[
                    { value: 'small', label: 'Small (fits in bag)' },
                    { value: 'medium', label: 'Medium (box size)' },
                    { value: 'large', label: 'Large (requires trunk)' },
                    { value: 'extra-large', label: 'Extra Large (requires van)' }
                  ]}
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> All {formData.packageCount} packages will have the same description and size.
                    You can specify different pickup/dropoff locations in the next section.
                  </p>
                </div>
              </div>
            )}

            {/* Individual Mode */}
            {packageMode === 'individual' && (
              <div className="space-y-4">
                {individualPackages.map((pkg, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-700">Package {index + 1}</h3>
                      {individualPackages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setIndividualPackages(individualPackages.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-600 text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormInput
                        label="Recipient Name"
                        value={pkg.recipientName}
                        onChange={(e) => {
                          const updated = [...individualPackages];
                          updated[index].recipientName = e.target.value;
                          setIndividualPackages(updated);
                        }}
                        placeholder="Full name"
                        required
                      />

                      <FormInput
                        label="Recipient Phone"
                        type="tel"
                        value={pkg.recipientPhone}
                        onChange={(e) => {
                          const updated = [...individualPackages];
                          updated[index].recipientPhone = e.target.value;
                          setIndividualPackages(updated);
                        }}
                        placeholder="+263..."
                        required
                      />
                    </div>

                    <FormTextarea
                      label="Package Details"
                      value={pkg.packageDetails}
                      onChange={(e) => {
                        const updated = [...individualPackages];
                        updated[index].packageDetails = e.target.value;
                        setIndividualPackages(updated);
                      }}
                      placeholder="What's being delivered?"
                      rows={2}
                      required
                    />

                    <FormSelect
                      label="Package Size"
                      value={pkg.packageSize}
                      onChange={(e) => {
                        const updated = [...individualPackages];
                        updated[index].packageSize = e.target.value;
                        setIndividualPackages(updated);
                      }}
                      options={[
                        { value: 'small', label: 'Small (fits in bag)' },
                        { value: 'medium', label: 'Medium (box size)' },
                        { value: 'large', label: 'Large (requires trunk)' },
                        { value: 'extra-large', label: 'Extra Large (requires van)' }
                      ]}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setIndividualPackages([...individualPackages, {
                    recipientName: '',
                    recipientPhone: '',
                    pickupLocation: '',
                    dropoffLocation: '',
                    packageDetails: '',
                    packageSize: 'medium'
                  }])}
                  className="w-full py-3 px-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-yellow-400 hover:text-slate-700 transition-all font-medium"
                >
                  + Add Another Package
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Total Packages:</strong> {individualPackages.length}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vehicle Selection Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Vehicle Type</h2>

          <FormSelect
            label="Select Vehicle Type"
            name="vehicleType"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            options={vehicleTypes.map(v => ({ value: v.value, label: v.label }))}
          />

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-600">Total Passengers</div>
                <div className="text-xl font-bold text-slate-700">{totalPassengers}</div>
              </div>
              <div>
                <div className="text-slate-600">Vehicle Capacity</div>
                <div className="text-xl font-bold text-slate-700">{selectedVehicle?.capacity || 0}</div>
              </div>
              <div>
                <div className="text-slate-600">Vehicles Needed</div>
                <div className="text-xl font-bold text-slate-700">{estimatedVehicles}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pickup Strategy Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Pickup Locations</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              type="button"
              onClick={() => {
                setPickupStrategy('single');
                setPickupLocations([{ location: '', passengers: [] }]);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                pickupStrategy === 'single'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">📍</div>
              <div className="text-sm font-semibold text-slate-700">Single Point</div>
              <div className="text-xs text-slate-600">One pickup location</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setPickupStrategy('multiple');
                setPickupLocations([{ location: '', passengers: [] }]);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                pickupStrategy === 'multiple'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">📍📍</div>
              <div className="text-sm font-semibold text-slate-700">Multiple Points</div>
              <div className="text-xs text-slate-600">Several locations</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setPickupStrategy('individual');
                setPickupLocations([{ location: '', passengers: [] }]);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                pickupStrategy === 'individual'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">🏠</div>
              <div className="text-sm font-semibold text-slate-700">Individual</div>
              <div className="text-xs text-slate-600">Each passenger's address</div>
            </button>
          </div>

          {pickupStrategy === 'single' && (
            <LocationInput
              label="Pickup Location"
              value={pickupLocations[0]?.location || ''}
              onChange={(e) => handlePickupLocationChange(0, e.target.value)}
              placeholder="Enter pickup address..."
              required
            />
          )}

          {pickupStrategy === 'multiple' && (
            <div className="space-y-4">
              {pickupLocations.map((loc, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <LocationInput
                        label={`Pickup Point ${index + 1}`}
                        value={loc.location}
                        onChange={(e) => handlePickupLocationChange(index, e.target.value)}
                        placeholder="Enter pickup address..."
                        required
                      />
                    </div>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePickupLocation(index)}
                        className="mt-8 px-4 py-2 text-red-500 hover:text-red-600 font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Passenger Assignment for this location */}
                  {selectionMethod === 'specific' && selectedPassengers.length > 0 && serviceType === 'rides' && (
                    <div className="ml-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Assign {passengerType} to this pickup point (optional)
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {passengers
                          .filter(p => selectedPassengers.includes(p.id))
                          .map(passenger => (
                            <label key={passenger.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={loc.passengers?.includes(passenger.id) || false}
                                onChange={(e) => {
                                  const updated = [...pickupLocations];
                                  if (e.target.checked) {
                                    updated[index].passengers = [...(updated[index].passengers || []), passenger.id];
                                  } else {
                                    updated[index].passengers = (updated[index].passengers || []).filter(id => id !== passenger.id);
                                  }
                                  setPickupLocations(updated);
                                }}
                                className="w-4 h-4 text-yellow-400 rounded"
                              />
                              <span className="text-slate-700">{passenger.name}</span>
                            </label>
                          ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {loc.passengers?.length || 0} {passengerType.slice(0, -1)}(s) assigned
                      </p>
                    </div>
                  )}

                  {/* Package Assignment for courier */}
                  {packageMode === 'individual' && serviceType === 'courier' && (
                    <div className="ml-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Assign packages to this pickup point (optional)
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {individualPackages.map((pkg, pkgIndex) => (
                          <label key={pkgIndex} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={loc.passengers?.includes(`pkg-${pkgIndex}`) || false}
                              onChange={(e) => {
                                const updated = [...pickupLocations];
                                if (e.target.checked) {
                                  updated[index].passengers = [...(updated[index].passengers || []), `pkg-${pkgIndex}`];
                                } else {
                                  updated[index].passengers = (updated[index].passengers || []).filter(id => id !== `pkg-${pkgIndex}`);
                                }
                                setPickupLocations(updated);
                              }}
                              className="w-4 h-4 text-yellow-400 rounded"
                            />
                            <span className="text-slate-700">
                              Package {pkgIndex + 1} {pkg.recipientName ? `(${pkg.recipientName})` : ''}
                            </span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {loc.passengers?.filter(id => id.startsWith('pkg-')).length || 0} package(s) assigned
                      </p>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddPickupLocation}
                className="w-full py-2 px-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-yellow-400 hover:text-slate-700 transition-all text-sm font-medium"
              >
                + Add Pickup Point
              </button>
            </div>
          )}

          {pickupStrategy === 'individual' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Individual pickup:</strong> Each passenger will be picked up from their registered address.
                {selectionMethod === 'number' && ' You will need to provide addresses for each passenger after booking.'}
              </p>
            </div>
          )}
        </div>

        {/* Dropoff Strategy Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Dropoff Locations</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              type="button"
              onClick={() => {
                setDropoffStrategy('single');
                setDropoffLocations([{ location: '', passengers: [] }]);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                dropoffStrategy === 'single'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">📍</div>
              <div className="text-sm font-semibold text-slate-700">Single Point</div>
              <div className="text-xs text-slate-600">One dropoff location</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setDropoffStrategy('multiple');
                setDropoffLocations([{ location: '', passengers: [] }]);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                dropoffStrategy === 'multiple'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">📍📍</div>
              <div className="text-sm font-semibold text-slate-700">Multiple Points</div>
              <div className="text-xs text-slate-600">Several locations</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setDropoffStrategy('individual');
                setDropoffLocations([{ location: '', passengers: [] }]);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                dropoffStrategy === 'individual'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">🏠</div>
              <div className="text-sm font-semibold text-slate-700">Individual</div>
              <div className="text-xs text-slate-600">Each passenger's destination</div>
            </button>
          </div>

          {dropoffStrategy === 'single' && (
            <LocationInput
              label="Dropoff Location"
              value={dropoffLocations[0]?.location || ''}
              onChange={(e) => handleDropoffLocationChange(0, e.target.value)}
              placeholder="Enter dropoff address..."
              required
            />
          )}

          {dropoffStrategy === 'multiple' && (
            <div className="space-y-4">
              {dropoffLocations.map((loc, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <LocationInput
                        label={`Dropoff Point ${index + 1}`}
                        value={loc.location}
                        onChange={(e) => handleDropoffLocationChange(index, e.target.value)}
                        placeholder="Enter dropoff address..."
                        required
                      />
                    </div>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDropoffLocation(index)}
                        className="mt-8 px-4 py-2 text-red-500 hover:text-red-600 font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Passenger Assignment for this location */}
                  {selectionMethod === 'specific' && selectedPassengers.length > 0 && serviceType === 'rides' && (
                    <div className="ml-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Assign {passengerType} to this dropoff point (optional)
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {passengers
                          .filter(p => selectedPassengers.includes(p.id))
                          .map(passenger => (
                            <label key={passenger.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={loc.passengers?.includes(passenger.id) || false}
                                onChange={(e) => {
                                  const updated = [...dropoffLocations];
                                  if (e.target.checked) {
                                    updated[index].passengers = [...(updated[index].passengers || []), passenger.id];
                                  } else {
                                    updated[index].passengers = (updated[index].passengers || []).filter(id => id !== passenger.id);
                                  }
                                  setDropoffLocations(updated);
                                }}
                                className="w-4 h-4 text-yellow-400 rounded"
                              />
                              <span className="text-slate-700">{passenger.name}</span>
                            </label>
                          ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {loc.passengers?.length || 0} {passengerType.slice(0, -1)}(s) assigned
                      </p>
                    </div>
                  )}

                  {/* Package Assignment for courier */}
                  {packageMode === 'individual' && serviceType === 'courier' && (
                    <div className="ml-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Assign packages to this dropoff point (optional)
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {individualPackages.map((pkg, pkgIndex) => (
                          <label key={pkgIndex} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={loc.passengers?.includes(`pkg-${pkgIndex}`) || false}
                              onChange={(e) => {
                                const updated = [...dropoffLocations];
                                if (e.target.checked) {
                                  updated[index].passengers = [...(updated[index].passengers || []), `pkg-${pkgIndex}`];
                                } else {
                                  updated[index].passengers = (updated[index].passengers || []).filter(id => id !== `pkg-${pkgIndex}`);
                                }
                                setDropoffLocations(updated);
                              }}
                              className="w-4 h-4 text-yellow-400 rounded"
                            />
                            <span className="text-slate-700">
                              Package {pkgIndex + 1} {pkg.recipientName ? `(${pkg.recipientName})` : ''}
                            </span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {loc.passengers?.filter(id => id.startsWith('pkg-')).length || 0} package(s) assigned
                      </p>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddDropoffLocation}
                className="w-full py-2 px-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-yellow-400 hover:text-slate-700 transition-all text-sm font-medium"
              >
                + Add Dropoff Point
              </button>
            </div>
          )}

          {dropoffStrategy === 'individual' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Individual dropoff:</strong> Each passenger will be dropped off at their registered destination.
                {selectionMethod === 'number' && ' You will need to provide destinations for each passenger after booking.'}
              </p>
            </div>
          )}
        </div>

        {/* Schedule Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Schedule</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setScheduleType('instant')}
              className={`p-4 rounded-lg border-2 transition-all ${
                scheduleType === 'instant'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">⚡</div>
              <div className="font-semibold text-slate-700">Instant</div>
              <div className="text-xs text-slate-600">Book now</div>
            </button>

            <button
              type="button"
              onClick={() => setScheduleType('scheduled')}
              className={`p-4 rounded-lg border-2 transition-all ${
                scheduleType === 'scheduled'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">📅</div>
              <div className="font-semibold text-slate-700">Scheduled</div>
              <div className="text-xs text-slate-600">Pick date & time</div>
            </button>

            <button
              type="button"
              onClick={() => setScheduleType('recurring')}
              className={`p-4 rounded-lg border-2 transition-all ${
                scheduleType === 'recurring'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-2xl mb-1">🔄</div>
              <div className="font-semibold text-slate-700">Recurring</div>
              <div className="text-xs text-slate-600">Repeat booking</div>
            </button>
          </div>

          {(scheduleType === 'scheduled' || scheduleType === 'recurring') && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <FormInput
                type="date"
                label={scheduleType === 'recurring' ? 'Start Date' : 'Date'}
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                required
              />
              <FormInput
                type="time"
                label="Time"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                required
              />
            </div>
          )}

          {scheduleType === 'recurring' && (
            <div className="space-y-4">
              <FormSelect
                label="Repeat Pattern"
                name="recurringPattern"
                value={recurringPattern}
                onChange={(e) => setRecurringPattern(e.target.value)}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' }
                ]}
              />
              <FormInput
                type="date"
                label="End Date"
                name="recurringEndDate"
                value={formData.recurringEndDate}
                onChange={(e) => setFormData({ ...formData, recurringEndDate: e.target.value })}
                required
              />
            </div>
          )}

          <div className="mt-6">
            <FormTextarea
              label="Special Instructions (Optional)"
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
              placeholder="Any special requirements or notes..."
              rows={3}
            />
          </div>

          {serviceType === 'courier' && (
            <div className="mt-4 space-y-4">
              <FormTextarea
                label="Package Details"
                name="packageDetails"
                value={formData.packageDetails}
                onChange={(e) => setFormData({ ...formData, packageDetails: e.target.value })}
                placeholder="Describe the packages being delivered..."
                rows={3}
                required
              />
              <FormSelect
                label="Package Size"
                name="packageSize"
                value={formData.packageSize}
                onChange={(e) => setFormData({ ...formData, packageSize: e.target.value })}
                options={[
                  { value: 'small', label: 'Small (fits in bag)' },
                  { value: 'medium', label: 'Medium (box size)' },
                  { value: 'large', label: 'Large (requires trunk)' },
                  { value: 'extra-large', label: 'Extra Large (requires van)' }
                ]}
              />
            </div>
          )}
        </div>

        {/* Payment Method Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Payment Method</h2>

          {/* Account Balance Display */}
          {!accountBalance.loading && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Account Balance</p>
                  <p className="text-2xl font-bold text-green-700">${accountBalance.balance.toFixed(2)}</p>
                </div>
                <div className="text-3xl">💰</div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setPaymentMethod('account_balance')}
              disabled={accountBalance.balance <= 0}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                paymentMethod === 'account_balance'
                  ? 'border-green-500 bg-green-50'
                  : accountBalance.balance <= 0
                  ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">💰</div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-700">Account Balance</div>
                  <div className="text-sm text-slate-600">Use prepaid credits</div>
                  {accountBalance.balance <= 0 && (
                    <div className="text-xs text-red-600 mt-1">Insufficient balance</div>
                  )}
                </div>
                {paymentMethod === 'account_balance' && (
                  <div className="text-green-500 text-xl">✓</div>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                paymentMethod === 'cash'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">💵</div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-700">Cash</div>
                  <div className="text-sm text-slate-600">Pay driver directly</div>
                </div>
                {paymentMethod === 'cash' && (
                  <div className="text-yellow-500 text-xl">✓</div>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('ecocash')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                paymentMethod === 'ecocash'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">📱</div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-700">EcoCash</div>
                  <div className="text-sm text-slate-600">Mobile money</div>
                </div>
                {paymentMethod === 'ecocash' && (
                  <div className="text-blue-500 text-xl">✓</div>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('onemoney')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                paymentMethod === 'onemoney'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">📲</div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-700">OneMoney</div>
                  <div className="text-sm text-slate-600">Mobile money</div>
                </div>
                {paymentMethod === 'onemoney' && (
                  <div className="text-purple-500 text-xl">✓</div>
                )}
              </div>
            </button>
          </div>

          {paymentMethod === 'account_balance' && accountBalance.balance > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                💡 The trip cost will be deducted from your account balance upon completion.
              </p>
            </div>
          )}
        </div>

        {/* Cost Estimate & Submit */}
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-sm text-slate-600 mb-1">Estimated Cost</div>
              <div className="text-4xl font-bold text-slate-700">${estimatedCost}</div>
              <div className="text-sm text-slate-600 mt-2">
                {estimatedVehicles} vehicle(s) × {totalPassengers} passenger(s)
              </div>
              {scheduleType === 'recurring' && (
                <div className="text-sm text-slate-600 mt-1">
                  Per trip • Recurring {recurringPattern}
                </div>
              )}
            </div>
            <div className="text-6xl">💰</div>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" onClick={onBack} className="flex-1">
              ← Back
            </Button>
            <Button type="submit" className="flex-1">
              Book {serviceType === 'rides' ? 'Rides' : 'Courier'} 🚀
            </Button>
          </div>
        </div>
      </form>

      {/* Add Passenger Modal */}
      <AddPassengerModal
        isOpen={isAddPassengerModalOpen}
        onClose={() => setIsAddPassengerModalOpen(false)}
        passengerType={addPassengerType}
        onPassengerAdded={handlePassengerAdded}
      />
    </div>
  );
};

export default CorporateBulkBookingFormNew;

