import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Icon from '../components/AppIcon';
import useAuthStore from '../stores/authStore';
import { getDashboardPath } from '../lib/routing';

const SignUpPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, sendOTP, verifyOTP, authLoading, otpError } = useAuthStore();

  const [step, setStep] = useState(1); // 1: User Type, 2: Form
  const [userType, setUserType] = useState(searchParams.get('type') || '');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    otpCode: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [errors, setErrors] = useState({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const dashboardPath = getDashboardPath(user.user_type);
      navigate(dashboardPath);
    }
  }, [isAuthenticated, user, navigate]);

  // If user type is in URL, skip to step 2
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && ['driver', 'taxi_operator'].includes(typeParam)) {
      setUserType(typeParam);
      setStep(2);
    }
  }, [searchParams]);

  const USER_TYPES = [
    {
      id: 'driver',
      title: 'Driver',
      subtitle: 'Drive and earn with BMTOA',
      icon: 'Car',
    },
    {
      id: 'taxi_operator',
      title: 'Taxi Operator',
      subtitle: 'Manage your fleet and drivers',
      icon: 'Building',
    },
  ];

  const handleUserTypeSelect = (type) => {
    setUserType(type);
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.phone?.trim()) newErrors.phone = 'Phone is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    const phoneRegex = /^\+263\s?[0-9]{2}\s?[0-9]{3}\s?[0-9]{4}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Phone must be in format: +263 77 123 4567';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;

    try {
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
      const userData = {
        name: formData.name,
        phone: formData.phone,
        userType: userType,
      };

      const result = await verifyOTP(formData.email, formData.otpCode, userData);

      if (result.success) {
        const dashboardPath = getDashboardPath(userType);
        navigate(dashboardPath);
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
          {/* Step 1: User Type Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900">Join BMTOA</h2>
                <p className="mt-2 text-slate-600">Choose your account type</p>
              </div>

              <div className="space-y-3">
                {USER_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleUserTypeSelect(type.id)}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-yellow-400 hover:bg-yellow-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-yellow-100 transition-colors">
                        <Icon name={type.icon} className="w-6 h-6 text-slate-700 group-hover:text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{type.title}</h3>
                        <p className="text-sm text-slate-600">{type.subtitle}</p>
                      </div>
                    </div>
                  </button>
                ))}
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

              <div className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/sign-in" className="text-yellow-600 hover:text-yellow-700 font-medium">
                  Sign In
                </Link>
              </div>
            </div>
          )}

          {/* Step 2: Registration Form */}
          {step === 2 && !otpSent && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
                <p className="mt-2 text-slate-600">
                  {userType === 'driver' ? 'Driver' : 'Taxi Operator'} Registration
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="John Doe"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

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
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${
                      errors.phone ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="+263 77 123 4567"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>

                {errors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{errors.submit}</p>
                  </div>
                )}

                <button
                  onClick={handleSendOTP}
                  disabled={authLoading}
                  className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3 px-6 rounded-lg hover:from-slate-800 hover:to-slate-900 transition-all shadow-lg disabled:opacity-50"
                >
                  {authLoading ? 'Sending...' : 'Send OTP Code'}
                </button>
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full text-slate-600 hover:text-slate-900 text-sm"
              >
                ← Back to user type selection
              </button>
            </div>
          )}

          {/* Step 3: OTP Verification */}
          {step === 2 && otpSent && (
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
                />
                {errors.otpCode && <p className="mt-1 text-sm text-red-600">{errors.otpCode}</p>}
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3 px-6 rounded-lg hover:from-slate-800 hover:to-slate-900 transition-all shadow-lg disabled:opacity-50"
              >
                {authLoading ? 'Verifying...' : 'Verify & Continue'}
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

export default SignUpPage;

