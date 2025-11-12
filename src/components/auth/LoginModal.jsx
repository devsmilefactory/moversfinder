/**
 * LoginModal - Login Modal for TaxiCab Platform
 * Allows existing users to sign in with email/password or OTP
 */

import React, { useState, useEffect } from 'react';
import Icon from '../ui/AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';
import useAuthStore from '../../stores/authStore';

const LoginModal = ({ isOpen = false, onClose = () => {}, onSwitchToRegister = () => {} }) => {
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [errors, setErrors] = useState({});

  const authLoading = useAuthStore((state) => state.authLoading);
  const authError = useAuthStore((state) => state.authError);
  const login = useAuthStore((state) => state.login);
  const loginWithOTP = useAuthStore((state) => state.loginWithOTP);
  const verifyLoginOTP = useAuthStore((state) => state.verifyLoginOTP);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoginMethod('password');
      setFormData({ email: '', password: '' });
      setOtpCode('');
      setOtpSent(false);
      setErrors({});
    }
  }, [isOpen]);

  const handleClose = () => {
    setLoginMethod('password');
    setFormData({ email: '', password: '' });
    setOtpCode('');
    setOtpSent(false);
    setErrors({});
    onClose();
  };

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
      handleClose();
      // Redirect is handled by the auth store
    } else {
      setErrors({ general: result.error || 'Login failed. Please check your credentials.' });
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
      handleClose();
      // Redirect is handled by the auth store
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <Icon name="X" className="w-5 h-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Icon name="LogIn" className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="mt-2 text-gray-600">Sign in to your TaxiCab account</p>
          </div>

          {/* Login Method Toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => {
                setLoginMethod('password');
                setOtpSent(false);
                setOtpCode('');
                setErrors({});
              }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                loginMethod === 'password'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Icon name="Lock" className="w-4 h-4" />
                Password
              </div>
            </button>
            <button
              onClick={() => {
                setLoginMethod('otp');
                setFormData(prev => ({ ...prev, password: '' }));
                setErrors({});
              }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                loginMethod === 'otp'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Icon name="Mail" className="w-4 h-4" />
                OTP
              </div>
            </button>
          </div>

          {/* Error Message */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Icon name="AlertCircle" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <div className="space-y-4">
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
                onKeyPress={handleKeyPress}
                placeholder="john@example.com"
                error={errors.email}
                autoComplete="email"
                disabled={otpSent}
              />
            </div>

            {/* Password (only for password method) */}
            {loginMethod === 'password' && (
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
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your password"
                    error={errors.password}
                    autoComplete="current-password"
                  />
                </div>

                {/* Forgot Password Link */}
                <div className="text-right">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    onClick={() => {
                      setLoginMethod('otp');
                      setFormData(prev => ({ ...prev, password: '' }));
                    }}
                  >
                    Forgot password? Use OTP instead
                  </button>
                </div>
              </>
            )}

            {/* OTP Code (only for OTP method after OTP sent) */}
            {loginMethod === 'otp' && otpSent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter OTP Code *
                </label>
                <Input
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(value);
                    if (errors.otp) setErrors(prev => ({ ...prev, otp: '' }));
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter 6-digit code"
                  error={errors.otp}
                  maxLength={6}
                  autoComplete="one-time-code"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Check your email for the verification code
                </p>
              </div>
            )}

            {/* OTP Info (only for OTP method before OTP sent) */}
            {loginMethod === 'otp' && !otpSent && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Icon name="Info" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Seamless Login with OTP</p>
                    <p>We'll send a verification code to your email. No password needed!</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          {loginMethod === 'password' ? (
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
          ) : otpSent ? (
            <div className="space-y-3 mt-6">
              <Button
                onClick={handleVerifyOTP}
                disabled={authLoading || otpCode.length !== 6}
                className="w-full"
              >
                {authLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="Loader" className="w-5 h-5 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>
              <button
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode('');
                  setErrors({});
                }}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to email
              </button>
            </div>
          ) : (
            <Button
              onClick={handleSendOTP}
              disabled={authLoading}
              className="w-full mt-6"
            >
              {authLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="Loader" className="w-5 h-5 animate-spin" />
                  Sending OTP...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="Mail" className="w-5 h-5" />
                  Send OTP Code
                </span>
              )}
            </Button>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
            </div>
          </div>

          {/* Register Link */}
          <button
            onClick={() => {
              handleClose();
              onSwitchToRegister();
            }}
            className="w-full py-3 px-4 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Create New Account
          </button>

          {/* Terms */}
          <p className="text-xs text-center text-gray-500 mt-6">
            By signing in, you agree to TaxiCab's{' '}
            <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;

