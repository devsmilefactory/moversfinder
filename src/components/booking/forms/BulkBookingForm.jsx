import React, { useState } from 'react';
import { FormInput, FormSelect, FormTextarea } from '../../shared/forms';
import { Plus, Users, MapPin, Trash2, Upload } from 'lucide-react';

/**
 * BulkBookingForm Component
 * 
 * Service-specific form for bulk/corporate bookings with:
 * - Multiple ride management
 * - Employee list handling
 * - Budget and approval workflows
 * - Bulk import capabilities
 */
const BulkBookingForm = ({
  serviceData = {},
  formData = {},
  onServiceDataUpdate,
  onFormDataUpdate,
  errors = {},
  warnings = {}
}) => {
  const [showRideModal, setShowRideModal] = useState(false);
  const [editingRideIndex, setEditingRideIndex] = useState(null);
  const [rideFormData, setRideFormData] = useState({
    passengerName: '',
    passengerPhone: '',
    pickupLocation: '',
    dropoffLocation: '',
    scheduledTime: '',
    department: '',
    costCenter: ''
  });

  // Handle service-specific field updates
  const handleServiceChange = (field, value) => {
    onServiceDataUpdate({ [field]: value });
  };

  // Ride management
  const handleOpenRideModal = (index = null) => {
    if (index !== null) {
      // Editing existing ride
      setEditingRideIndex(index);
      setRideFormData(serviceData.rides[index] || {});
    } else {
      // Adding new ride
      setEditingRideIndex(null);
      setRideFormData({
        passengerName: '',
        passengerPhone: '',
        pickupLocation: '',
        dropoffLocation: '',
        scheduledTime: '',
        department: '',
        costCenter: ''
      });
    }
    setShowRideModal(true);
  };

  const handleSaveRide = () => {
    const currentRides = [...(serviceData.rides || [])];
    
    if (editingRideIndex !== null) {
      currentRides[editingRideIndex] = rideFormData;
    } else {
      currentRides.push(rideFormData);
    }
    
    handleServiceChange('rides', currentRides);
    setShowRideModal(false);
    setEditingRideIndex(null);
  };

  const handleRemoveRide = (index) => {
    const currentRides = serviceData.rides || [];
    handleServiceChange('rides', currentRides.filter((_, i) => i !== index));
  };

  const handleRideFormChange = (field, value) => {
    setRideFormData(prev => ({ ...prev, [field]: value }));
  };

  // Bulk import handling
  const handleBulkImport = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      // Handle CSV import logic here
      console.log('Importing CSV file:', file.name);
      // This would parse the CSV and populate the rides array
    }
  };

  const rides = serviceData.rides || [];
  const totalRides = rides.length;
  const estimatedTotalCost = totalRides * 25; // Rough estimate

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        👥 Bulk Booking Details
      </h3>

      {/* Booking Type */}
      <div className="space-y-3">
        <FormSelect
          label="Booking Type"
          value={serviceData.bookingType || 'corporate'}
          onChange={(value) => handleServiceChange('bookingType', value)}
          options={[
            { value: 'corporate', label: 'Corporate Event' },
            { value: 'group', label: 'Group Transportation' },
            { value: 'event', label: 'Event Transportation' },
            { value: 'airport', label: 'Airport Transfers' },
            { value: 'conference', label: 'Conference/Meeting' }
          ]}
        />
      </div>

      {/* Corporate Information */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-slate-700 text-sm">Organization Details</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Company/Organization"
            value={serviceData.organizationName || ''}
            onChange={(value) => handleServiceChange('organizationName', value)}
            placeholder="Company name"
            error={errors.organizationName}
            required
          />

          <FormInput
            label="Department"
            value={serviceData.department || ''}
            onChange={(value) => handleServiceChange('department', value)}
            placeholder="Department or division"
            error={errors.department}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Contact Person"
            value={serviceData.contactPerson || ''}
            onChange={(value) => handleServiceChange('contactPerson', value)}
            placeholder="Primary contact name"
            error={errors.contactPerson}
            required
          />

          <FormInput
            label="Contact Phone"
            type="tel"
            value={serviceData.contactPhone || ''}
            onChange={(value) => handleServiceChange('contactPhone', value)}
            placeholder="+263..."
            error={errors.contactPhone}
            required
          />
        </div>

        <FormInput
          label="Email"
          type="email"
          value={serviceData.contactEmail || ''}
          onChange={(value) => handleServiceChange('contactEmail', value)}
          placeholder="contact@company.com"
          error={errors.contactEmail}
        />
      </div>

      {/* Budget & Approval */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-blue-700 text-sm">Budget & Approval</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Budget Limit (ZWL)"
            type="number"
            value={serviceData.budgetLimit || ''}
            onChange={(value) => handleServiceChange('budgetLimit', parseFloat(value) || '')}
            placeholder="0.00"
            error={errors.budgetLimit}
          />

          <FormSelect
            label="Approval Required"
            value={serviceData.approvalRequired ? 'yes' : 'no'}
            onChange={(value) => handleServiceChange('approvalRequired', value === 'yes')}
            options={[
              { value: 'no', label: 'No Approval Needed' },
              { value: 'yes', label: 'Requires Approval' }
            ]}
          />
        </div>

        {serviceData.approvalRequired && (
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Approver Name"
              value={serviceData.approverName || ''}
              onChange={(value) => handleServiceChange('approverName', value)}
              placeholder="Manager/Approver name"
            />

            <FormInput
              label="Approver Email"
              type="email"
              value={serviceData.approverEmail || ''}
              onChange={(value) => handleServiceChange('approverEmail', value)}
              placeholder="approver@company.com"
            />
          </div>
        )}

        <FormInput
          label="Cost Center/Project Code"
          value={serviceData.costCenter || ''}
          onChange={(value) => handleServiceChange('costCenter', value)}
          placeholder="CC-2024-001"
        />
      </div>

      {/* Rides Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-700">Individual Rides</h4>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleBulkImport}
                className="hidden"
              />
            </label>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => handleOpenRideModal()}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Ride
            </button>
          </div>
        </div>

        {rides.length > 0 ? (
          <div className="space-y-3">
            {rides.map((ride, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">
                        {ride.passengerName || `Ride ${index + 1}`}
                      </span>
                      {ride.department && (
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">
                          {ride.department}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        <span>{ride.pickupLocation || 'Pickup not set'} → {ride.dropoffLocation || 'Dropoff not set'}</span>
                      </div>
                      
                      {ride.scheduledTime && (
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 text-center">🕐</span>
                          <span>{ride.scheduledTime}</span>
                        </div>
                      )}
                      
                      {ride.passengerPhone && (
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 text-center">📞</span>
                          <span>{ride.passengerPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      type="button"
                      onClick={() => handleOpenRideModal(index)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveRide(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-green-700">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">
                    {totalRides} ride{totalRides !== 1 ? 's' : ''} planned
                  </span>
                </div>
                <div className="text-green-600 font-medium">
                  Est. Total: ZWL {estimatedTotalCost.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-3xl mb-2">🚌</div>
            <p className="text-sm font-medium">No rides added yet</p>
            <p className="text-xs mt-1">Add individual rides or import from CSV</p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                type="button"
                onClick={() => handleOpenRideModal()}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Add First Ride
              </button>
              <span className="text-slate-300">or</span>
              <label className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                Import CSV File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {errors.rides && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <span>⚠️</span>
            {errors.rides}
          </p>
        )}
      </div>

      {/* Additional Notes */}
      <FormTextarea
        label="Additional Notes"
        value={serviceData.notes || ''}
        onChange={(value) => handleServiceChange('notes', value)}
        placeholder="Any additional information about this bulk booking..."
        rows={3}
      />

      {/* Ride Modal */}
      {showRideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-96 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-700">
                {editingRideIndex !== null ? 'Edit Ride' : 'Add New Ride'}
              </h3>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Passenger Name"
                  value={rideFormData.passengerName || ''}
                  onChange={(value) => handleRideFormChange('passengerName', value)}
                  placeholder="Full name"
                  required
                />
                
                <FormInput
                  label="Phone Number"
                  type="tel"
                  value={rideFormData.passengerPhone || ''}
                  onChange={(value) => handleRideFormChange('passengerPhone', value)}
                  placeholder="+263..."
                />
              </div>
              
              <FormInput
                label="Pickup Location"
                value={rideFormData.pickupLocation || ''}
                onChange={(value) => handleRideFormChange('pickupLocation', value)}
                placeholder="Where to pick up?"
                required
              />
              
              <FormInput
                label="Dropoff Location"
                value={rideFormData.dropoffLocation || ''}
                onChange={(value) => handleRideFormChange('dropoffLocation', value)}
                placeholder="Where to drop off?"
                required
              />
              
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Scheduled Time"
                  type="datetime-local"
                  value={rideFormData.scheduledTime || ''}
                  onChange={(value) => handleRideFormChange('scheduledTime', value)}
                />
                
                <FormInput
                  label="Department"
                  value={rideFormData.department || ''}
                  onChange={(value) => handleRideFormChange('department', value)}
                  placeholder="Department"
                />
              </div>
              
              <FormInput
                label="Cost Center (Optional)"
                value={rideFormData.costCenter || ''}
                onChange={(value) => handleRideFormChange('costCenter', value)}
                placeholder="Cost center code"
              />
            </div>
            
            <div className="p-4 border-t border-slate-200 flex gap-3">
              <button
                type="button"
                onClick={() => setShowRideModal(false)}
                className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRide}
                disabled={!rideFormData.passengerName || !rideFormData.pickupLocation || !rideFormData.dropoffLocation}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingRideIndex !== null ? 'Update Ride' : 'Add Ride'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {Object.keys(warnings).length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-orange-600 text-lg">⚠️</span>
            <div>
              <h4 className="text-sm font-medium text-orange-800 mb-1">Please note:</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                {Object.entries(warnings).map(([field, warning]) => (
                  <li key={field}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkBookingForm;