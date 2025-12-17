import React from 'react';
import { FormInput, FormSelect, FormTextarea } from '../../shared/forms';

/**
 * SchoolRunBookingForm Component
 * 
 * Service-specific form for school/work transportation with:
 * - Student/passenger details
 * - Guardian contact information
 * - Schedule and timing
 * - Safety and emergency contacts
 */
const SchoolRunBookingForm = ({
  serviceData = {},
  formData = {},
  onServiceDataUpdate,
  onFormDataUpdate,
  errors = {},
  warnings = {}
}) => {
  // Handle service-specific field updates
  const handleServiceChange = (field, value) => {
    onServiceDataUpdate({ [field]: value });
  };

  // Handle passenger details
  const handlePassengerChange = (field, value) => {
    const currentPassenger = serviceData.passenger || {};
    handleServiceChange('passenger', { ...currentPassenger, [field]: value });
  };

  // Handle guardian details
  const handleGuardianChange = (field, value) => {
    const currentGuardian = serviceData.guardian || {};
    handleServiceChange('guardian', { ...currentGuardian, [field]: value });
  };

  // Handle emergency contact
  const handleEmergencyChange = (field, value) => {
    const currentEmergency = serviceData.emergencyContact || {};
    handleServiceChange('emergencyContact', { ...currentEmergency, [field]: value });
  };

  const passengerInfo = serviceData.passenger || {};
  const guardianInfo = serviceData.guardian || {};
  const emergencyInfo = serviceData.emergencyContact || {};

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        🎒 School/Work Run Details
      </h3>

      {/* Service Type */}
      <div className="space-y-3">
        <FormSelect
          label="Service Type"
          value={serviceData.serviceType || 'school'}
          onChange={(value) => handleServiceChange('serviceType', value)}
          options={[
            { value: 'school', label: 'School Transportation' },
            { value: 'work', label: 'Work Commute' },
            { value: 'university', label: 'University/College' },
            { value: 'training', label: 'Training Center' }
          ]}
        />
      </div>

      {/* Passenger Information */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-slate-700 text-sm">
          {serviceData.serviceType === 'school' ? 'Student Information' : 'Passenger Information'}
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label={serviceData.serviceType === 'school' ? 'Student Name' : 'Passenger Name'}
            value={passengerInfo.name || ''}
            onChange={(value) => handlePassengerChange('name', value)}
            placeholder="Full name"
            error={errors.passengerName}
            required
          />

          <FormInput
            label="Age"
            type="number"
            value={passengerInfo.age || ''}
            onChange={(value) => handlePassengerChange('age', parseInt(value) || '')}
            min={3}
            max={100}
            placeholder="Age"
            error={errors.passengerAge}
          />
        </div>

        {serviceData.serviceType === 'school' && (
          <>
            <FormInput
              label="School/Institution Name"
              value={passengerInfo.schoolName || ''}
              onChange={(value) => handlePassengerChange('schoolName', value)}
              placeholder="Name of school or institution"
              error={errors.schoolName}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Grade/Class"
                value={passengerInfo.grade || ''}
                onChange={(value) => handlePassengerChange('grade', value)}
                placeholder="e.g., Grade 5, Form 2"
                error={errors.grade}
              />

              <FormInput
                label="Student ID (Optional)"
                value={passengerInfo.studentId || ''}
                onChange={(value) => handlePassengerChange('studentId', value)}
                placeholder="Student ID number"
              />
            </div>
          </>
        )}

        <FormTextarea
          label="Special Needs/Requirements"
          value={passengerInfo.specialNeeds || ''}
          onChange={(value) => handlePassengerChange('specialNeeds', value)}
          placeholder="Any special assistance, medical conditions, or requirements..."
          rows={2}
        />
      </div>

      {/* Guardian/Contact Information */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-slate-700 text-sm">
          {serviceData.serviceType === 'school' ? 'Guardian Information' : 'Primary Contact'}
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Contact Name"
            value={guardianInfo.name || ''}
            onChange={(value) => handleGuardianChange('name', value)}
            placeholder="Full name"
            error={errors.guardianName}
            required
          />

          <FormSelect
            label="Relationship"
            value={guardianInfo.relationship || 'parent'}
            onChange={(value) => handleGuardianChange('relationship', value)}
            options={[
              { value: 'parent', label: 'Parent' },
              { value: 'guardian', label: 'Guardian' },
              { value: 'relative', label: 'Relative' },
              { value: 'self', label: 'Self' },
              { value: 'employer', label: 'Employer' }
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Primary Phone"
            type="tel"
            value={guardianInfo.phone || ''}
            onChange={(value) => handleGuardianChange('phone', value)}
            placeholder="+263..."
            error={errors.guardianPhone}
            required
          />

          <FormInput
            label="Alternative Phone"
            type="tel"
            value={guardianInfo.altPhone || ''}
            onChange={(value) => handleGuardianChange('altPhone', value)}
            placeholder="+263... (optional)"
          />
        </div>

        <FormInput
          label="Email (Optional)"
          type="email"
          value={guardianInfo.email || ''}
          onChange={(value) => handleGuardianChange('email', value)}
          placeholder="guardian@example.com"
        />
      </div>

      {/* Emergency Contact */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-red-700 text-sm">Emergency Contact</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Emergency Contact Name"
            value={emergencyInfo.name || ''}
            onChange={(value) => handleEmergencyChange('name', value)}
            placeholder="Full name"
            error={errors.emergencyName}
          />

          <FormInput
            label="Emergency Phone"
            type="tel"
            value={emergencyInfo.phone || ''}
            onChange={(value) => handleEmergencyChange('phone', value)}
            placeholder="+263..."
            error={errors.emergencyPhone}
          />
        </div>

        <FormInput
          label="Relationship to Passenger"
          value={emergencyInfo.relationship || ''}
          onChange={(value) => handleEmergencyChange('relationship', value)}
          placeholder="e.g., Aunt, Family Friend"
        />
      </div>

      {/* Trip Direction & Schedule */}
      <div className="space-y-3">
        <FormSelect
          label="Trip Direction"
          value={serviceData.tripDirection || 'one-way'}
          onChange={(value) => handleServiceChange('tripDirection', value)}
          options={[
            { value: 'one-way', label: 'One Way (Pickup OR Drop-off)' },
            { value: 'round-trip', label: 'Round Trip (Pickup AND Drop-off)' },
            { value: 'pickup-only', label: 'Pickup Only' },
            { value: 'dropoff-only', label: 'Drop-off Only' }
          ]}
        />

        {(serviceData.tripDirection === 'round-trip' || serviceData.tripDirection === 'pickup-only') && (
          <FormInput
            label="Pickup Time"
            type="time"
            value={serviceData.pickupTime || ''}
            onChange={(value) => handleServiceChange('pickupTime', value)}
            error={errors.pickupTime}
          />
        )}

        {(serviceData.tripDirection === 'round-trip' || serviceData.tripDirection === 'dropoff-only') && (
          <FormInput
            label="Drop-off Time"
            type="time"
            value={serviceData.dropoffTime || ''}
            onChange={(value) => handleServiceChange('dropoffTime', value)}
            error={errors.dropoffTime}
          />
        )}
      </div>

      {/* Safety Features */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-green-700 text-sm">Safety & Security</h4>
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={serviceData.requiresChildSeat || false}
              onChange={(e) => handleServiceChange('requiresChildSeat', e.target.checked)}
              className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-slate-700">Child safety seat required</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={serviceData.requiresIdCheck || false}
              onChange={(e) => handleServiceChange('requiresIdCheck', e.target.checked)}
              className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-slate-700">ID verification required for pickup</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={serviceData.sendUpdates || false}
              onChange={(e) => handleServiceChange('sendUpdates', e.target.checked)}
              className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-slate-700">Send pickup/drop-off notifications</span>
          </label>
        </div>
      </div>

      {/* Additional Instructions */}
      <FormTextarea
        label="Additional Instructions"
        value={serviceData.instructions || ''}
        onChange={(value) => handleServiceChange('instructions', value)}
        placeholder="Any additional instructions for the driver (meeting points, access codes, etc.)"
        rows={3}
      />

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

export default SchoolRunBookingForm;