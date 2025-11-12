/**
 * IndividualProfileForm - Optional Profile Completion
 * TaxiCab Platform
 * 
 * Individuals get full access immediately
 * This is just for preferred services (optional)
 */

import React, { useState } from 'react';
import Icon from '../ui/AppIcon';
import Button from '../ui/Button';
import useAuthStore from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

const IndividualProfileForm = ({ onComplete, onSkip }) => {
  const user = useAuthStore((state) => state.user);
  const [selectedServices, setSelectedServices] = useState(user?.preferred_services || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const SERVICE_TYPES = [
    { 
      id: 'taxi', 
      label: 'Taxi Rides', 
      icon: 'Car',
      description: 'Book rides for personal transportation'
    },
    { 
      id: 'courier', 
      label: 'Courier Services', 
      icon: 'Package',
      description: 'Send packages and documents'
    },
    { 
      id: 'school_run', 
      label: 'School Run', 
      icon: 'GraduationCap',
      description: 'Safe transportation for children'
    },
    { 
      id: 'errands', 
      label: 'Errands', 
      icon: 'ShoppingBag',
      description: 'Shopping and other errands'
    },
  ];

  const toggleService = (serviceId) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(s => s !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Check if individual profile exists
      const { data: existingProfile } = await supabase
        .from('individual_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('individual_profiles')
          .update({
            preferred_services: selectedServices,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('individual_profiles')
          .insert({
            user_id: user.id,
            preferred_services: selectedServices,
          });

        if (insertError) throw insertError;
      }

      // Update individual profile completion status in type-specific table
      const { error: completionError } = await supabase
        .from('individual_profiles')
        .update({
          profile_completion_status: 'complete',
          completion_percentage: 100,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (completionError) throw completionError;

      // Update user in store (preferred services only)
      const result = await useAuthStore.getState().updateProfile({
        preferred_services: selectedServices,
      });

      if (result.success) {
        setSaving(false);
        onComplete();
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save preferences');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Icon name="CheckCircle" className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">You're All Set!</h3>
        <p className="mt-2 text-gray-600">
          Your account is ready to use. You have full access to all TaxiCab features.
        </p>
      </div>

      {/* Optional: Preferred Services */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <Icon name="Info" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900">Personalize Your Experience (Optional)</h4>
            <p className="text-sm text-blue-700 mt-1">
              Select your preferred services to get personalized recommendations and faster booking.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SERVICE_TYPES.map((service) => (
            <button
              key={service.id}
              onClick={() => toggleService(service.id)}
              className={`p-4 border-2 rounded-lg transition-all text-left ${
                selectedServices.includes(service.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedServices.includes(service.id)
                    ? 'bg-blue-100'
                    : 'bg-gray-100'
                }`}>
                  <Icon name={service.icon} className={`w-5 h-5 ${
                    selectedServices.includes(service.id)
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">{service.label}</h5>
                  <p className="text-xs text-gray-600 mt-1">{service.description}</p>
                </div>
                {selectedServices.includes(service.id) && (
                  <Icon name="Check" className="w-5 h-5 text-blue-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Icon name="AlertCircle" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">Error Saving Preferences</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={onSkip}
          variant="outline"
          className="flex-1"
        >
          Skip for Now
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || selectedServices.length === 0}
          className="flex-1"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>

      {/* Info */}
      <p className="text-xs text-center text-gray-500">
        You can change these preferences anytime in your account settings
      </p>
    </div>
  );
};

export default IndividualProfileForm;

