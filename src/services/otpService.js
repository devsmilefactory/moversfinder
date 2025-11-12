/**
 * OTP Service - PWA App
 * Handles OTP generation, sending, and verification using Supabase Edge Functions
 * Uses Resend API for email delivery
 */

import { supabase } from '../lib/supabase';

/**
 * Send OTP to user's email
 * @param {string} email - User's email address
 * @param {string} userType - Type of user (individual, corporate, driver, operator)
 * @returns {Promise<{success: boolean, error?: string, otp?: string}>}
 */
export const sendOTP = async (email, userType) => {
  try {
    // Call Supabase Edge Function to send OTP via Resend
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: {
        email,
        userType,
        platform: 'pwa' // PWA platform identifier
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to send OTP');
    }

    // In development mode, the edge function returns the OTP for testing
    if (data?.otp) {
      console.log('🔐 DEVELOPMENT OTP CODE:', data.otp);
      console.log('📧 Email:', email);
      console.log('⏰ Expires in 10 minutes');

      // Show alert with OTP for easy testing in development
      if (import.meta.env.VITE_DEV_MODE === 'true') {
        alert(`DEVELOPMENT MODE\n\nYour OTP code is: ${data.otp}\n\nIn production, this will be sent via email.`);
      }
    }

    return {
      success: true,
      otp: data?.otp // Only present in development
    };
  } catch (error) {
    console.error('Send OTP error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send OTP'
    };
  }
};

/**
 * Verify OTP code
 * @param {string} email - User's email address
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise<{success: boolean, error?: string, otpRecord?: object}>}
 */
export const verifyOTP = async (email, otpCode) => {
  try {
    // Verify OTP from database
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otpCode)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      throw new Error('Invalid or expired OTP code');
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    if (updateError) {
      throw new Error('Failed to verify OTP');
    }

    return {
      success: true,
      otpRecord
    };
  } catch (error) {
    console.error('Verify OTP error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify OTP'
    };
  }
};

/**
 * Check if email has too many failed OTP attempts
 * @param {string} email - User's email address
 * @returns {Promise<{isLocked: boolean, lockedUntil?: string}>}
 */
export const checkOTPLockStatus = async (email) => {
  try {
    const { data, error } = await supabase
      .from('otp_verifications')
      .select('locked_until, attempts')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { isLocked: false };
    }

    if (data.locked_until && new Date(data.locked_until) > new Date()) {
      return {
        isLocked: true,
        lockedUntil: data.locked_until
      };
    }

    return { isLocked: false };
  } catch (error) {
    console.error('Check OTP lock status error:', error);
    return { isLocked: false };
  }
};

/**
 * Increment failed OTP attempts and lock if necessary
 * @param {string} email - User's email address
 * @returns {Promise<{locked: boolean, attempts: number}>}
 */
export const incrementOTPAttempts = async (email) => {
  try {
    const { data: latestOTP, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('id, attempts')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !latestOTP) {
      return { locked: false, attempts: 0 };
    }

    const newAttempts = (latestOTP.attempts || 0) + 1;
    const shouldLock = newAttempts >= 10;

    const updateData = {
      attempts: newAttempts
    };

    if (shouldLock) {
      // Lock for 2 hours
      updateData.locked_until = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    }

    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update(updateData)
      .eq('id', latestOTP.id);

    if (updateError) {
      console.error('Failed to update OTP attempts:', updateError);
    }

    return {
      locked: shouldLock,
      attempts: newAttempts
    };
  } catch (error) {
    console.error('Increment OTP attempts error:', error);
    return { locked: false, attempts: 0 };
  }
};

export default {
  sendOTP,
  verifyOTP,
  checkOTPLockStatus,
  incrementOTPAttempts
};

