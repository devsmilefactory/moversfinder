/**
 * Register Page - Full page registration for TaxiCab PWA
 * Allows new users to create an account
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import useAuthStore from '../stores/authStore';
import { supabase } from '../lib/supabase';

const Register = () => {
  const navigate = useNavigate();
  const [registrationMethod] = useState('password'); // OTP disabled for now
  const [otpSent, setOtpSent] = useState(false); // OTP disabled but state needed for conditional rendering
  const [userType, setUserType] = useState('individual'); // 'individual', 'corporate', 'driver'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const authLoading = useAuthStore((state) => state.authLoading);
  const signUpWithPassword = useAuthStore((state) => state.signUpWithPassword);
  const signUpWithOTP = useAuthStore((state) => state.signUpWithOTP);
  const verifySignUpOTP = useAuthStore((state) => state.verifySignUpOTP);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (registrationMethod === 'password') {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    const userData = {
      name: formData.name,
      phone: formData.phone,
      user_type: userType,
    };

    const result = await signUpWithPassword(formData.email, formData.password, userData);

    if (result.success) {
      // Redirect to root - RootRedirect component will handle routing based on user type
      navigate('/', { replace: true });
    } else {
      // Handle network errors with a user-friendly message
      const errorMessage = result.error === 'NETWORK_ERROR'
        ? 'No internet connection. Please check your network and try again.'
        : result.error || 'Registration failed. Please try again.';
      setErrors({ general: errorMessage });
    }
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;

    const userData = {
      name: formData.name,
      phone: formData.phone,
      user_type: userType,
    };

    const result = await signUpWithOTP(formData.email, userData);

    if (result.success) {
      setOtpSent(true);
      setErrors({});
    } else {
      setErrors({ general: result.error || 'Failed to send OTP. Please try again.' });
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP code' });
      return;
    }

    const result = await verifySignUpOTP(formData.email, otpCode);

    if (result.success) {
      // Redirect to root - RootRedirect component will handle routing based on user type
      navigate('/', { replace: true });
    } else {
      setErrors({ otp: result.error || 'Invalid or expired OTP code' });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (registrationMethod === 'password') {
        handleRegister();
      } else if (otpSent) {
        handleVerifyOTP();
      } else {
        handleSendOTP();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-accent/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mx-auto mb-4">
            <img
              src="/icons/icon-192x192.png"
              alt="TaxiCab Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h1>
          <p className="text-gray-600">Join TaxiCab today</p>
        </div>

        {/* Registration Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* User Type Selection */}
          {!otpSent && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I want to register as:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setUserType('individual')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    userType === 'individual'
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Individual
                </button>
                <button
                  onClick={() => setUserType('corporate')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    userType === 'corporate'
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Corporate
                </button>
                <button
                  onClick={() => setUserType('driver')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    userType === 'driver'
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Driver
                </button>
              </div>
            </div>
          )}

          {/* Registration Method Toggle - OTP Disabled */}
          {/* OTP temporarily disabled - using password-only registration */}

          {/* Error Message */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <Icon name="AlertCircle" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          {/* Form Fields */}
          <>
            <div className="mb-4">
              <Input
                label="Full Name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                error={errors.name}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="mb-4">
              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                error={errors.email}
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div className="mb-4">
              <Input
                label="Phone Number"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                error={errors.phone}
                placeholder="+263 XXX XXX XXX"
                required
              />
            </div>

            <div className="mb-4">
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                error={errors.password}
                placeholder="At least 6 characters"
                required
                showPasswordToggle={true}
              />
            </div>

            <div className="mb-6">
              <Input
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                error={errors.confirmPassword}
                placeholder="Re-enter your password"
                required
                showPasswordToggle={true}
              />
            </div>
          </>

          {/* Action Button */}
          <Button
            onClick={handleRegister}
            disabled={authLoading}
            className="w-full mt-6"
          >
            {authLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="Loader" className="w-5 h-5 animate-spin" />
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </Button>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-primary font-semibold hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Powered by BMTOA
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;

