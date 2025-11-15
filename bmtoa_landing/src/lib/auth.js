/**
 * Authentication Helper Functions
 * BMTOA Landing Page
 */

import { supabase, getPlatformId } from './supabase';

/**
 * Sign up a new user (Driver or Taxi Operator)
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} userData - Additional user data
 * @returns {Promise<{data, error}>}
 */
export const signUp = async (email, password, userData = {}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          phone: userData.phone,
          user_type: userData.userType || 'taxi_operator',
          platform: getPlatformId(),
          ...userData,
        },
      },
    });

    if (error) throw error;

    // Create profile in profiles table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            name: userData.name,
            phone: userData.phone,
            user_type: userData.userType || 'taxi_operator',
            platform: getPlatformId(),
          },
        ]);

      if (profileError) throw profileError;

      // Create user-type specific profile
      if (userData.userType === 'driver') {
        await supabase.from('driver_profiles').insert([
          {
            user_id: data.user.id,
            operator_id: userData.operatorId,
            license_number: userData.licenseNumber,
            status: 'offline',
          },
        ]);
      } else if (userData.userType === 'taxi_operator') {
        await supabase.from('operator_profiles').insert([
          {
            user_id: data.user.id,
            company_name: userData.companyName,
            bmtoa_member_number: userData.memberNumber,
            membership_tier: userData.membershipTier || 'basic',
            fleet_size: userData.fleetSize || 0,
          },
        ]);
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { data: null, error };
  }
};

/**
 * Sign in an existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{data, error}>}
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: null, error };
  }
};

/**
 * Sign out the current user
 * @returns {Promise<{error}>}
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
};

/**
 * Get the current authenticated user
 * @returns {Promise<{user, error}>}
 */
export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;

    return { user, error: null };
  } catch (error) {
    console.error('Get current user error:', error);
    return { user: null, error };
  }
};

/**
 * Get user profile with additional data
 * @param {string} userId - User ID
 * @returns {Promise<{profile, error}>}
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Get user-type specific profile
    let additionalData = {};
    if (data.user_type === 'driver') {
      const { data: driverData } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      additionalData = driverData || {};
    } else if (data.user_type === 'taxi_operator') {
      const { data: operatorData } = await supabase
        .from('operator_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      additionalData = operatorData || {};
    }

    return { profile: { ...data, ...additionalData }, error: null };
  } catch (error) {
    console.error('Get user profile error:', error);
    return { profile: null, error };
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {object} updates - Profile updates
 * @returns {Promise<{data, error}>}
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Update user profile error:', error);
    return { data: null, error };
  }
};

/**
 * Reset password
 * @param {string} email - User email
 * @returns {Promise<{data, error}>}
 */
export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Reset password error:', error);
    return { data: null, error };
  }
};

/**
 * Update password
 * @param {string} newPassword - New password
 * @returns {Promise<{data, error}>}
 */
export const updatePassword = async (newPassword) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Update password error:', error);
    return { data: null, error };
  }
};

/**
 * Listen to authentication state changes
 * @param {function} callback - Callback function
 * @returns {object} Subscription object
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export const isAuthenticated = async () => {
  const { user } = await getCurrentUser();
  return Boolean(user);
};

/**
 * Get user session
 * @returns {Promise<{session, error}>}
 */
export const getSession = async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    return { session, error: null };
  } catch (error) {
    console.error('Get session error:', error);
    return { session: null, error };
  }
};

