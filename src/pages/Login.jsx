/**
 * Login Page - Full page login for TaxiCab PWA
 * Allows existing users to sign in with email/password or OTP
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/ui/AppIcon';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import useAuthStore from '../stores/authStore';

const Login = () => {
  const navigate = useNavigate();
  const [loginMethod] = useState('password'); // OTP disabled for now
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});

  const authLoading = useAuthStore((state) => state.authLoading);
  const login = useAuthStore((state) => state.login);

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

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (loginMethod === 'password' && !formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    const result = await login(formData.email, formData.password);

    if (result.success) {
      // Redirect to root - RootRedirect component will handle routing based on user type
      navigate('/', { replace: true });
    } else {
      // Handle network errors with a user-friendly message
      const errorMessage = result.error === 'NETWORK_ERROR'
        ? 'No internet connection. Please check your network and try again.'
        : result.error || 'Login failed. Please check your credentials.';
      setErrors({ general: errorMessage });
    }
  };

  const handleSendOTP = async () => {
    // Validate email
    if (!formData.email?.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors({ email: 'Please enter a valid email' });
      return;
    }

    const result = await loginWithOTP(formData.email);

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

    const result = await verifyLoginOTP(formData.email, otpCode);

    if (result.success) {
      // Redirect to root - RootRedirect component will handle routing based on user type
      navigate('/', { replace: true });
    } else {
      setErrors({ otp: result.error || 'Invalid or expired OTP code' });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (loginMethod === 'password') {
        handleLogin();
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to continue to TaxiCab</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Login Method Toggle - OTP Disabled */}
          {/* OTP temporarily disabled - using password-only login */}

          {/* Error Message */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <Icon name="AlertCircle" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          {/* Email Input */}
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

          {/* Password Input */}
          <div className="mb-6">
            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              error={errors.password}
              placeholder="Enter your password"
              required
              showPasswordToggle={true}
            />
          </div>

          {/* Action Button */}
          <Button
            onClick={handleLogin}
            disabled={authLoading}
            className="w-full mt-6"
          >
            {authLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="Loader" className="w-5 h-5 animate-spin" />
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-primary font-semibold hover:underline"
              >
                Sign Up
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

export default Login;

