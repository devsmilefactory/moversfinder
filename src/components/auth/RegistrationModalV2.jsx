/**
 * RegistrationModalV2 - Two-Step Registration with Dual Auth Method
 * TaxiCab Platform
 * 
 * Step 1: Account Creation (email, phone, choose password OR OTP)
 * Step 2+: Profile Completion (deferred, user-type specific)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';
import useAuthStore from '../../stores/authStore';

const RegistrationModalV2 = ({ isOpen = false, onClose = () => {}, onSwitchToLogin = () => {} }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: User Type, 2: Auth Method, 3: Account Creation
  const [userType, setUserType] = useState('');
  const [authMethod, setAuthMethod] = useState(''); // 'password' or 'otp'
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    name: '',
    preferredServices: [], // For individuals
  });
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [errors, setErrors] = useState({});

  const authLoading = useAuthStore((state) => state.authLoading);

  // User types for TaxiCab PWA
  const USER_TYPES = [
    {
      id: 'individual',
      title: 'Individual',
      subtitle: 'Book rides for personal use',
      icon: 'User',
    },
    {
      id: 'driver',
      title: 'Driver',
      subtitle: 'Drive and earn with TaxiCab',
      icon: 'Car',
    },
  ];

  // Service types for individuals
  const SERVICE_TYPES = [
    { id: 'taxi', label: 'Taxi Rides', icon: 'Car' },
    { id: 'courier', label: 'Courier Services', icon: 'Package' },
    { id: 'school_run', label: 'School Run', icon: 'GraduationCap' },
    { id: 'errands', label: 'Errands', icon: 'ShoppingBag' },
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUserType('');
      setStep(1);
      setFormData({
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        name: '',
        preferredServices: [],
      });
      setAuthMethod('');
      setOtpCode('');
      setOtpSent(false);
      setErrors({});
    }
  }, [isOpen]);

  const handleClose = () => {
    setStep(1);
    setUserType('');
    setAuthMethod('');
    setFormData({
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      name: '',
      preferredServices: [],
    });
    setOtpCode('');
    setOtpSent(false);
    setErrors({});
    onClose();
  };

  const handleUserTypeSelect = (type) => {
    setUserType(type);
    // Skip auth method selection - OTP disabled for now
    setAuthMethod('password');
    setStep(3); // Go directly to account creation
  };

  const handleAuthMethodSelect = (method) => {
    setAuthMethod(method);
    setStep(3);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleServiceSelection = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      preferredServices: prev.preferredServices.includes(serviceId)
        ? prev.preferredServices.filter(s => s !== serviceId)
        : [...prev.preferredServices, serviceId],
    }));
  };

  const validateAccountCreation = () => {
    const newErrors = {};

    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.phone?.trim()) newErrors.phone = 'Phone is required';

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Phone format validation (Zimbabwe format)
    const phoneRegex = /^\+263\s?[0-9]{2}\s?[0-9]{3}\s?[0-9]{4}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Phone must be in format: +263 77 123 4567';
    }

    if (authMethod === 'password') {
      if (!formData.password) newErrors.password = 'Password is required';
      if (formData.password && formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // For individuals, preferred services are optional but recommended
    if (userType === 'individual' && formData.preferredServices.length === 0) {
      newErrors.preferredServices = 'Select at least one service (optional but recommended)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async () => {
    // Validate email and phone first
    const newErrors = {};
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.phone?.trim()) newErrors.phone = 'Phone is required';
    if (!formData.name?.trim()) newErrors.name = 'Name is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const userData = {
        name: formData.name,
        phone: formData.phone,
        user_type: userType,
      };

      const result = await useAuthStore.getState().signUpWithOTP(formData.email, userData);

      if (result.success) {
        setOtpSent(true);
        setErrors({});
      } else {
        setErrors({ general: result.error || 'Failed to send OTP' });
      }
    } catch (error) {
      setErrors({ general: error.message || 'Failed to send OTP' });
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP code' });
      return;
    }

    try {
      const userData = {
        name: formData.name,
        phone: formData.phone,
        user_type: userType,
      };

      const result = await useAuthStore.getState().verifyOTP(formData.email, otpCode, userData);

      if (result.success) {
        // Close modal
        handleClose();

        // Navigate based on user type and profile status
        setTimeout(() => {
          const profile = result.profile;

          // After successful OTP verification, let RootRedirect handle routing
          navigate('/', { replace: true });
        }, 500);
      } else {
        setErrors({ otp: result.error || 'Invalid or expired OTP code' });
      }
    } catch (error) {
      setErrors({ otp: error.message || 'Failed to verify OTP' });
    }
  };

  const handlePasswordSignup = async () => {
    if (!validateAccountCreation()) return;

    try {
      const userData = {
        name: formData.name,
        phone: formData.phone,
        user_type: userType,
      };

      const result = await useAuthStore.getState().signUpWithPassword(
        formData.email,
        formData.password,
        userData
      );

      if (result.success) {
        // Close modal
        handleClose();

        // Show success message
        alert('Account created successfully! Please check your email to verify your account.');

        // Navigate to login page - user needs to verify email first
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 500);
      } else {
        setErrors({ general: result.error || 'Failed to create account' });
      }
    } catch (error) {
      setErrors({ general: error.message || 'Failed to create account' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <Icon name="X" className="w-5 h-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Step 1: User Type Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">Join TaxiCab</h2>
                <p className="mt-2 text-gray-600">Choose your account type</p>
              </div>

              <div className="space-y-3">
                {USER_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleUserTypeSelect(type.id)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <Icon name={type.icon} className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{type.title}</h3>
                        <p className="text-sm text-gray-600">{type.subtitle}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>


            </div>
          )}

          {/* Step 2: Auth Method Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">Choose Sign-Up Method</h2>
                <p className="mt-2 text-gray-600">How would you like to create your account?</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleAuthMethodSelect('password')}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Icon name="Lock" className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Password</h3>
                      <p className="text-sm text-gray-600">Create an account with email and password</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleAuthMethodSelect('otp')}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <Icon name="Smartphone" className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">One-Time Password (OTP)</h3>
                      <p className="text-sm text-gray-600">Sign up with OTP verification (no password needed)</p>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full text-center text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to user type selection
              </button>
            </div>
          )}

          {/* Step 3: Account Creation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">Create Your Account</h2>
                <p className="mt-2 text-gray-600">
                  {authMethod === 'password' ? 'Enter your details and password' : 'Enter your details to receive OTP'}
                </p>
              </div>

              {/* Account Creation Form */}
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    error={errors.name}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    error={errors.email}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+263 77 123 4567"
                    error={errors.phone}
                  />
                </div>

                {/* Password Fields (if password method) */}
                {authMethod === 'password' && !otpSent && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <Input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Min. 8 characters"
                        error={errors.password}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password *
                      </label>
                      <Input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Re-enter password"
                        error={errors.confirmPassword}
                      />
                    </div>
                  </>
                )}

                {/* OTP Code Field (if OTP method and OTP sent) */}
                {authMethod === 'otp' && otpSent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enter OTP Code *
                    </label>
                    <Input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="6-digit code"
                      maxLength={6}
                      error={errors.otp}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Check your email for the verification code
                    </p>
                  </div>
                )}

                {/* Preferred Services (for individuals only) */}
                {userType === 'individual' && !otpSent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Services (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SERVICE_TYPES.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleServiceSelection(service.id)}
                          className={`p-3 border-2 rounded-lg transition-all ${
                            formData.preferredServices.includes(service.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon name={service.icon} className="w-5 h-5 mx-auto mb-1" />
                          <p className="text-xs font-medium">{service.label}</p>
                        </button>
                      ))}
                    </div>
                    {errors.preferredServices && (
                      <p className="mt-1 text-xs text-yellow-600">{errors.preferredServices}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {authMethod === 'password' && (
                  <Button
                    onClick={handlePasswordSignup}
                    disabled={authLoading}
                    className="w-full"
                  >
                    {authLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                )}

                {authMethod === 'otp' && !otpSent && (
                  <Button
                    onClick={handleSendOTP}
                    disabled={authLoading}
                    className="w-full"
                  >
                    {authLoading ? 'Sending OTP...' : 'Send OTP Code'}
                  </Button>
                )}

                {authMethod === 'otp' && otpSent && (
                  <>
                    <Button
                      onClick={handleVerifyOTP}
                      disabled={authLoading}
                      className="w-full"
                    >
                      {authLoading ? 'Verifying...' : 'Verify & Create Account'}
                    </Button>
                    <button
                      onClick={handleSendOTP}
                      disabled={authLoading}
                      className="w-full text-sm text-blue-600 hover:text-blue-700"
                    >
                      Resend OTP Code
                    </button>
                  </>
                )}

                <button
                  onClick={() => setStep(2)}
                  className="w-full text-center text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Back to auth method selection
                </button>
              </div>

              {/* Terms */}
              <p className="text-xs text-center text-gray-500">
                By creating an account, you agree to our{' '}
                <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationModalV2;

