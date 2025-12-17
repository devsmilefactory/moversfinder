import React, { useState, useEffect } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Icon from '../../ui/AppIcon';

/**
 * OTPVerification Component
 * 
 * OTP verification step for email-based registration
 */
const OTPVerification = ({ 
  email, 
  otpCode, 
  onOtpChange, 
  onVerify, 
  onResend, 
  errors, 
  loading,
  resendCooldown = 60 
}) => {
  const [countdown, setCountdown] = useState(resendCooldown);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = () => {
    onResend();
    setCountdown(resendCooldown);
    setCanResend(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onVerify();
  };

  const handleOtpInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only digits, max 6
    onOtpChange(value);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Mail" size={32} className="text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Check Your Email
        </h2>
        <p className="text-gray-600">
          We've sent a 6-digit verification code to
        </p>
        <p className="font-medium text-gray-900 mt-1">{email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* OTP Input */}
        <div>
          <Input
            label="Verification Code"
            type="text"
            value={otpCode}
            onChange={handleOtpInputChange}
            placeholder="Enter 6-digit code"
            error={errors.otp}
            maxLength={6}
            className="text-center text-2xl tracking-widest"
            required
          />
          <p className="text-sm text-gray-500 mt-1 text-center">
            Enter the 6-digit code from your email
          </p>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Icon name="AlertCircle" size={16} className="text-red-600" />
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          </div>
        )}

        {/* Verify Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading || otpCode.length !== 6}
          className="w-full"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verifying...</span>
            </div>
          ) : (
            'Verify & Create Account'
          )}
        </Button>

        {/* Resend Section */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            Didn't receive the code?
          </p>
          
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Resend Code
            </button>
          ) : (
            <p className="text-sm text-gray-500">
              Resend available in {countdown}s
            </p>
          )}
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Icon name="Info" size={16} className="text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Having trouble?</p>
              <ul className="mt-1 space-y-1">
                <li>• Check your spam/junk folder</li>
                <li>• Make sure you entered the correct email</li>
                <li>• The code expires in 10 minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OTPVerification;