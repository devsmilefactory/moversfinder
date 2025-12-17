import React, { useState } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Icon from '../../ui/AppIcon';

/**
 * AccountCreationForm Component
 * 
 * Third step of registration - user enters account details
 */
const AccountCreationForm = ({ 
  formData, 
  onFormDataChange, 
  authMethod, 
  userType, 
  errors, 
  onSubmit, 
  loading 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field, value) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  const getSubmitButtonText = () => {
    if (authMethod === 'otp') {
      return 'Send Verification Code';
    }
    return 'Create Account';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create Your Account
        </h2>
        <p className="text-gray-600">
          {authMethod === 'otp' 
            ? 'We\'ll send a verification code to your email'
            : 'Enter your details to create your account'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <Input
            label="Full Name"
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your full name"
            error={errors.name}
            required
          />
        </div>

        {/* Email Field */}
        <div>
          <Input
            label="Email Address"
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email address"
            error={errors.email}
            required
          />
        </div>

        {/* Phone Field */}
        <div>
          <Input
            label="Phone Number"
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="Enter your phone number"
            error={errors.phone}
            required
          />
        </div>

        {/* Password Fields (only for password method) */}
        {authMethod === 'password' && (
          <>
            <div>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password || ''}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Create a strong password"
                  error={errors.password}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={20} />
                </button>
              </div>
            </div>

            <div>
              <div className="relative">
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword || ''}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  error={errors.confirmPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  <Icon name={showConfirmPassword ? 'EyeOff' : 'Eye'} size={20} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Service Preferences (for individuals) */}
        {userType === 'individual' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Interested Services (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'taxi', label: 'Taxi Rides', icon: 'Car' },
                { id: 'courier', label: 'Courier', icon: 'Package' },
                { id: 'school_run', label: 'School Run', icon: 'GraduationCap' },
                { id: 'errands', label: 'Errands', icon: 'ShoppingBag' },
              ].map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    const current = formData.preferredServices || [];
                    const updated = current.includes(service.id)
                      ? current.filter(s => s !== service.id)
                      : [...current, service.id];
                    handleInputChange('preferredServices', updated);
                  }}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    (formData.preferredServices || []).includes(service.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon name={service.icon} size={16} />
                    <span className="text-sm font-medium">{service.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Icon name="AlertCircle" size={16} className="text-red-600" />
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating Account...</span>
            </div>
          ) : (
            getSubmitButtonText()
          )}
        </Button>

        {/* Terms and Privacy */}
        <p className="text-xs text-gray-600 text-center">
          By creating an account, you agree to our{' '}
          <a href="/terms" className="text-blue-600 hover:text-blue-700">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-700">
            Privacy Policy
          </a>
        </p>
      </form>
    </div>
  );
};

export default AccountCreationForm;