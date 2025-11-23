import React, { useState, useEffect } from 'react';
import Button from '../shared/Button';
import FormInput, { FormSelect } from '../shared/FormInput';

/**
 * Reusable Saved Place Modal
 * 
 * Used for:
 * - Creating new saved places
 * - Editing existing saved places
 * 
 * Features:
 * - Form validation
 * - Icon selection
 * - Category selection
 * - Address input
 */

const SavedPlaceModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  place = null, // If editing, pass existing place
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    icon: '📍',
    category: 'other',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  // Icon options
  const iconOptions = [
    '📍', '🏠', '💼', '🏫', '🏥', '🏪', '🏋️', '✈️', '🚉', '⛪',
    '🏨', '🍽️', '☕', '🎬', '🎭', '🏛️', '🏞️', '🌳', '⛱️', '🛍️'
  ];

  // Category options
  const categoryOptions = [
    { value: 'home', label: 'Home' },
    { value: 'work', label: 'Work' },
    { value: 'school', label: 'School' },
    { value: 'other', label: 'Other' },
  ];

  // Initialize form with place data if editing
  useEffect(() => {
    if (place) {
      setFormData({
        name: place.name || '',
        address: place.address || '',
        icon: place.icon || '📍',
        category: place.category || 'other',
        notes: place.notes || '',
      });
    } else {
      // Reset form for new place
      setFormData({
        name: '',
        address: '',
        icon: '📍',
        category: 'other',
        notes: '',
      });
    }
    setErrors({});
  }, [place, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-700">
            {place ? 'Edit Saved Place' : 'Add New Place'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Icon <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-10 gap-2">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleChange('icon', icon)}
                  className={`p-2 text-2xl rounded-lg border-2 transition-all ${
                    formData.icon === icon
                      ? 'border-yellow-400 bg-yellow-50 scale-110'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <FormInput
            label="Place Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Home, Office, Gym"
            required
            error={errors.name}
          />

          {/* Category */}
          <FormSelect
            label="Category"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            options={categoryOptions}
            required
          />

          {/* Address */}
          <FormInput
            label="Address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Enter full address"
            required
            error={errors.address}
          />

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            className="flex-1"
            loading={loading}
          >
            {place ? 'Update Place' : 'Add Place'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SavedPlaceModal;

