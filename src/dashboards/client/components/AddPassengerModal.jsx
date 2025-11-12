import React, { useState } from 'react';
import Button from '../../shared/Button';
import FormInput, { FormSelect } from '../../shared/FormInput';
import { usePassengersStore } from '../../../stores';

/**
 * Add Passenger Modal
 * 
 * Allows adding new passengers on the fly during booking
 * Different fields based on passenger type (staff, clients, students, groups)
 */

const AddPassengerModal = ({ isOpen, onClose, passengerType, onPassengerAdded }) => {
  const createPassenger = usePassengersStore((state) => state.createPassenger);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    // Staff-specific
    department: '',
    employeeId: '',
    // Client-specific
    company: '',
    // Student-specific
    school: '',
    grade: '',
    parentName: '',
    parentPhone: '',
    // Group-specific
    description: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    memberCount: 1
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create passenger object based on type
    const newPassenger = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      type: passengerType,
      passengerType: passengerType
    };

    // Add type-specific fields
    if (passengerType === 'staff') {
      newPassenger.department = formData.department;
      newPassenger.employeeId = formData.employeeId;
    } else if (passengerType === 'clients') {
      newPassenger.company = formData.company;
    } else if (passengerType === 'students') {
      newPassenger.school = formData.school;
      newPassenger.grade = formData.grade;
      newPassenger.parentName = formData.parentName;
      newPassenger.parentPhone = formData.parentPhone;
    } else if (passengerType === 'groups') {
      newPassenger.description = formData.description;
      newPassenger.contactPerson = formData.contactPerson;
      newPassenger.contactPhone = formData.contactPhone;
      newPassenger.contactEmail = formData.contactEmail;
      newPassenger.memberCount = parseInt(formData.memberCount) || 1;
    }

    // Create passenger in store
    const createdPassenger = createPassenger(newPassenger);
    
    // Notify parent component
    onPassengerAdded(createdPassenger);
    
    // Reset form and close
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: '',
      employeeId: '',
      company: '',
      school: '',
      grade: '',
      parentName: '',
      parentPhone: '',
      description: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      memberCount: 1
    });
    onClose();
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (passengerType) {
      case 'staff': return 'Add New Staff Member';
      case 'clients': return 'Add New Client';
      case 'students': return 'Add New Student';
      case 'groups': return 'Add New Group';
      default: return 'Add New Passenger';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-800 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{getTitle()}</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-yellow-400 text-2xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Common Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2">
              Basic Information
            </h3>
            
            <FormInput
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter full name"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required={passengerType !== 'students'}
              />

              <FormInput
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+263..."
                required
              />
            </div>
          </div>

          {/* Staff-specific Fields */}
          {passengerType === 'staff' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2">
                Employment Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g., Sales, Marketing"
                  required
                />

                <FormInput
                  label="Employee ID"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  placeholder="e.g., EMP-001"
                  required
                />
              </div>
            </div>
          )}

          {/* Client-specific Fields */}
          {passengerType === 'clients' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2">
                Company Details
              </h3>
              
              <FormInput
                label="Company Name"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Enter company name"
                required
              />
            </div>
          )}

          {/* Student-specific Fields */}
          {passengerType === 'students' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2">
                School Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="School Name"
                  name="school"
                  value={formData.school}
                  onChange={handleChange}
                  placeholder="e.g., Bulawayo High School"
                  required
                />

                <FormInput
                  label="Grade/Form"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  placeholder="e.g., Grade 10"
                  required
                />
              </div>

              <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mt-6">
                Parent/Guardian Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Parent/Guardian Name"
                  name="parentName"
                  value={formData.parentName}
                  onChange={handleChange}
                  placeholder="Full name"
                  required
                />

                <FormInput
                  label="Parent/Guardian Phone"
                  name="parentPhone"
                  type="tel"
                  value={formData.parentPhone}
                  onChange={handleChange}
                  placeholder="+263..."
                  required
                />
              </div>
            </div>
          )}

          {/* Group-specific Fields */}
          {passengerType === 'groups' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2">
                Group Details
              </h3>
              
              <FormInput
                label="Group Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g., Sales Team, Conference Attendees"
                required
              />

              <FormInput
                label="Number of Members"
                name="memberCount"
                type="number"
                value={formData.memberCount}
                onChange={handleChange}
                min="1"
                required
              />

              <h3 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mt-6">
                Contact Person
              </h3>

              <FormInput
                label="Contact Person Name"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                placeholder="Full name"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Contact Phone"
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="+263..."
                  required
                />

                <FormInput
                  label="Contact Email"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-800 font-bold"
            >
              Add {passengerType === 'staff' ? 'Staff Member' : passengerType === 'clients' ? 'Client' : passengerType === 'students' ? 'Student' : 'Group'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPassengerModal;

