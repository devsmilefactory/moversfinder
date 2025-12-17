import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../ui/Button';
import Icon from '../../ui/AppIcon';
import useAuthStore from '../../../stores/authStore';

// Import modular components
import UserTypeSelection from './UserTypeSelection';
import AuthMethodSelection from './AuthMethodSelection';
import AccountCreationForm from './AccountCreationForm';
import OTPVerification from './OTPVerification';

/**
 * RefactoredRegistrationModal Component
 * 
 * Modular version of RegistrationModalV2 broken down into focused step components.
 * Reduced from 512+ lines to a manageable container component.
 */
const RefactoredRegistrationModal = ({ 
  isOpen = false, 
  onClose = () => {}, 
  onSwitchToLogin = () => {} 
}) => {
  const navigate = useNavigate();
  
  // State management
  const [step, setStep] = useState(1); // 1: User Type, 2: Auth Method, 3: Account Creation, 4: OTP Verification
  const [userType, setUserType] = useState('');
  const [authMethod, setAuthMethod] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    name: '',
    preferredServices: [],
  });
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [errors, setErrors] = useState({});

  // Auth store
  const authLoading = useAuthStore((state) => state.authLoading);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
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
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Step 1: User Type Selection
  const handleUserTypeSelect = (type) => {
    setUserType(type);
    setStep(2);
  };

  // Step 2: Auth Method Selection
  const handleAuthMethodSelect = (method) => {
    setAuthMethod(method);
    setStep(3);
  };

  // Step 3: Account Creation
  const validateAccountCreation = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (authMethod === 'password') {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAccountCreation = async () => {
    if (!validateAccountCreation()) return;

    if (authMethod === 'otp') {
      await handleSendOTP();
    } else {
      await handlePasswordSignup();
    }
  };

  const handleSendOTP = async () => {
    try {
      const userData = {
        name: formData.name,
        phone: formData.phone,
        user_type: userType,
      };

      const result = await useAuthStore.getState().signUpWithOTP(formData.email, userData);

      if (result.success) {
        setOtpSent(true);
        setStep(4);
        setErrors({});
      } else {
        setErrors({ general: result.error || 'Failed to send OTP' });
      }
    } catch (error) {
      setErrors({ general: error.message || 'Failed to send OTP' });
    }
  };

  const handlePasswordSignup = async () => {
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
        handleClose();
        alert('Account created successfully! Please check your email to verify your account.');
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

  // Step 4: OTP Verification
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
        handleClose();
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      } else {
        setErrors({ otp: result.error || 'Invalid or expired OTP code' });
      }
    } catch (error) {
      setErrors({ otp: error.message || 'Failed to verify OTP' });
    }
  };

  const handleResendOTP = async () => {
    setErrors({});
    await handleSendOTP();
  };

  // Navigation helpers
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Choose Account Type';
      case 2: return 'Select Sign-up Method';
      case 3: return 'Create Account';
      case 4: return 'Verify Email';
      default: return 'Registration';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon name="ArrowLeft" size={20} />
                </button>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {getStepTitle()}
                </h2>
                <p className="text-sm text-gray-500">
                  Step {step} of {authMethod === 'otp' ? 4 : 3}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(step / (authMethod === 'otp' ? 4 : 3)) * 100}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <UserTypeSelection
              selectedUserType={userType}
              onUserTypeSelect={handleUserTypeSelect}
            />
          )}

          {step === 2 && (
            <AuthMethodSelection
              selectedMethod={authMethod}
              onMethodSelect={handleAuthMethodSelect}
              userType={userType}
            />
          )}

          {step === 3 && (
            <AccountCreationForm
              formData={formData}
              onFormDataChange={setFormData}
              authMethod={authMethod}
              userType={userType}
              errors={errors}
              onSubmit={handleAccountCreation}
              loading={authLoading}
            />
          )}

          {step === 4 && authMethod === 'otp' && (
            <OTPVerification
              email={formData.email}
              otpCode={otpCode}
              onOtpChange={setOtpCode}
              onVerify={handleVerifyOTP}
              onResend={handleResendOTP}
              errors={errors}
              loading={authLoading}
            />
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefactoredRegistrationModal;