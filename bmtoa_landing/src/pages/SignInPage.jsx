import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Icon from '../components/AppIcon';
import useAuthStore from '../stores/authStore';
import { getDashboardPath } from '../lib/routing';

const SignInPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, sendOTP, verifyOTP, loginWithPassword, authLoading, otpError } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otpCode: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [errors, setErrors] = useState({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const dashboardPath = getDashboardPath(user.user_type);
      navigate(dashboardPath);
    }
  }, [isAuthenticated, user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Check if email is admin email
    if (name === 'email') {
      const isAdmin = value.includes('admin@') || value.endsWith('@bmtoa.co.zw');
      setIsAdminLogin(isAdmin);
    }
  };

  const handleAdminLogin = async () => {
    if (!formData.email?.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!formData.password?.trim()) {
      setErrors({ password: 'Password is required' });
      return;
    }

    try {
      const result = await loginWithPassword(formData.email, formData.password);

      if (!result.success) {
        setErrors({ submit: result.error || 'Invalid email or password' });
      }
      // Navigation is handled by authStore
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to sign in' });
    }
  };

  const handleSendOTP = async () => {
    if (!formData.email?.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrors({ email: 'Invalid email format' });
      return;
    }

    try {
      // Determine user type from email (driver or operator)
      const userType = formData.email.includes('driver') ? 'driver' : 'taxi_operator';

      const result = await sendOTP(formData.email, userType);

      if (result.success) {
        setOtpSent(true);
        setErrors({});
      } else {
        setErrors({ submit: result.error || 'Failed to send OTP' });
      }
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to send OTP' });
    }
  };

  const handleVerifyOTP = async () => {
    if (!formData.otpCode?.trim()) {
      setErrors({ otpCode: 'OTP code is required' });
      return;
    }

    try {
      const result = await verifyOTP(formData.email, formData.otpCode, {});

      if (result.success) {
        // Navigation is handled by authStore
      } else {
        setErrors({ otpCode: result.error || 'Invalid OTP code' });
      }
    } catch (error) {
      setErrors({ otpCode: error.message || 'Invalid OTP code' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Icon name="TaxiCab2Icon" className="w-12 h-12 text-yellow-400" />
            <h1 className="text-3xl font-bold text-white">BMTOA</h1>
          </div>
          <p className="text-slate-300">Bulawayo Metered Taxi Operators Association</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!otpSent ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
                <p className="mt-2 text-slate-600">Sign in to your account</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="john@example.com"
                    onKeyPress={(e) => e.key === 'Enter' && (isAdminLogin ? handleAdminLogin() : handleSendOTP())}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                {/* Password field for admin users */}
                {isAdminLogin && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${
                        errors.password ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Enter your password"
                      onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                    />
                    {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                  </div>
                )}

                {errors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{errors.submit}</p>
                  </div>
                )}

                <button
                  onClick={isAdminLogin ? handleAdminLogin : handleSendOTP}
                  disabled={authLoading}
                  className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3 px-6 rounded-lg hover:from-slate-800 hover:to-slate-900 transition-all shadow-lg disabled:opacity-50"
                >
                  {authLoading ? (isAdminLogin ? 'Signing in...' : 'Sending...') : (isAdminLogin ? 'Sign In' : 'Send OTP Code')}
                </button>
              </div>

              <div className="text-center text-sm text-slate-600">
                Don't have an account?{' '}
                <Link to="/sign-up" className="text-yellow-600 hover:text-yellow-700 font-medium">
                  Sign Up
                </Link>
              </div>

              {/* Link to TaxiCab for passengers */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <Icon name="User" className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1">Looking to book a ride?</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Passengers use the TaxiCab app
                    </p>
                    <a
                      href={import.meta.env.VITE_PWA_URL || 'https://app.taxicab.co.zw'}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Go to TaxiCab App
                      <Icon name="ExternalLink" className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Mail" className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Verify OTP</h2>
                <p className="mt-2 text-slate-600">
                  We sent a code to {formData.email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Enter OTP Code
                </label>
                <input
                  type="text"
                  name="otpCode"
                  value={formData.otpCode}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${
                    errors.otpCode ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="000000"
                  maxLength={6}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerifyOTP()}
                />
                {errors.otpCode && <p className="mt-1 text-sm text-red-600">{errors.otpCode}</p>}
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3 px-6 rounded-lg hover:from-slate-800 hover:to-slate-900 transition-all shadow-lg disabled:opacity-50"
              >
                {authLoading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <button
                onClick={() => {
                  setOtpSent(false);
                  setFormData({ ...formData, otpCode: '' });
                  setErrors({});
                }}
                className="w-full text-slate-600 hover:text-slate-900 text-sm"
              >
                ← Back to email
              </button>

              <button
                onClick={handleSendOTP}
                className="w-full text-slate-600 hover:text-slate-900 text-sm"
              >
                Didn't receive code? Resend
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-slate-300">
          <p>© 2025 BMTOA. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;

