import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { validatePlatformAccess } from '../lib/routing';
import { isNetworkError } from '../utils/networkDetection';

/**
 * Helper function to provide user-friendly error messages
 */
const getUserFriendlyError = (error) => {
  const errorMessage = error?.message || error || '';

  // Network errors - check first
  if (isNetworkError(error)) {
    return 'NETWORK_ERROR'; // Special flag for network errors
  }

  // Supabase auth errors
  if (errorMessage.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (errorMessage.includes('Email not confirmed')) {
    return 'Please verify your email address before logging in. Check your inbox for the verification link.';
  }
  if (errorMessage.includes('User already registered')) {
    return 'An account with this email already exists. Please login instead.';
  }
  if (errorMessage.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (errorMessage.includes('Unable to validate email address')) {
    return 'Please enter a valid email address.';
  }
  if (errorMessage.includes('Email rate limit exceeded')) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }
  if (errorMessage.includes('Invalid OTP')) {
    return 'Invalid or expired verification code. Please request a new code.';
  }
  if (errorMessage.includes('No account found')) {
    return errorMessage; // Already user-friendly
  }

  // Default fallback
  return errorMessage || 'An unexpected error occurred. Please try again.';
};

/**
 * Authentication Store - TaxiCab Platform
 * Manages user authentication state and profile with Supabase integration
 */
const useAuthStore = create(
  devtools(
    persist(
      (set, get) => ({
        // State
        user: null,
        isAuthenticated: false,
        authLoading: false,
        authError: null,

        // Initialize auth state from Supabase session
        initialize: async () => {
          console.log('🔄 AuthStore: Starting initialization...');

          // Reset to a safe unauthenticated baseline while checking session to avoid stale persisted state
          set({ authLoading: true, isAuthenticated: false, user: null, authError: null });

          try {
            // Add timeout to session check to prevent hanging
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Session check timeout')), 5000)
            );

            const { data: { session }, error: sessionError } = await Promise.race([
              sessionPromise,
              timeoutPromise
            ]);

            // If there's a session error, check if it's a network error
            if (sessionError) {
              console.error('❌ Session error:', sessionError);

              // Check for timeout error
              if (sessionError.message === 'Session check timeout') {
                console.warn('⏱️ Session check timed out - proceeding without auth');
                set({ user: null, isAuthenticated: false, authLoading: false, authError: null });
                return;
              }

              // If it's a network error, don't clear session - just stop loading
              if (isNetworkError(sessionError)) {
                console.warn('🌐 Network error during auth initialization - will retry when online');
                set({
                  authLoading: false,
                  authError: 'NETWORK_ERROR',
                  // Keep existing user/auth state from persisted storage
                });
                return;
              }

              // For non-network errors, clear auth
              console.log('🔓 Clearing auth due to session error');
              await supabase.auth.signOut();
              set({ user: null, isAuthenticated: false, authLoading: false, authError: null });
              return;
            }

            if (session?.user) {
              console.log('✅ Session found, fetching profile...');

              // Fetch full profile with timeout
              const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              const profileTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
              );

              const { data: profile, error } = await Promise.race([
                profilePromise,
                profileTimeoutPromise
              ]);

              if (error) {
                console.error('❌ Profile fetch error:', error);

                // Check for timeout error
                if (error.message === 'Profile fetch timeout') {
                  console.warn('⏱️ Profile fetch timed out - signing out');
                  await supabase.auth.signOut();
                  set({ user: null, isAuthenticated: false, authLoading: false, authError: null });
                  return;
                }

                // If it's a network error, don't clear session
                if (isNetworkError(error)) {
                  console.warn('🌐 Network error fetching profile - will retry when online');
                  set({
                    authLoading: false,
                    authError: 'NETWORK_ERROR',
                  });
                  return;
                }

                // For non-network errors, sign out to prevent infinite loop
                console.log('🔓 Signing out due to profile fetch error');
                await supabase.auth.signOut();
                set({ user: null, isAuthenticated: false, authLoading: false, authError: null });
                return;
              }

              console.log('✅ Profile fetched successfully');

              // Increment login count (non-critical, don't fail if this errors)
              try {
                await supabase.rpc('increment_login_count', { user_id: session.user.id });
              } catch (rpcError) {
                console.warn('⚠️ Failed to increment login count:', rpcError);
              }

              set({ user: profile, isAuthenticated: true, authLoading: false, authError: null });

              // Load available profiles for multi-profile system
              // Import dynamically to avoid circular dependency
              try {
                const { default: useProfileStore } = await import('./profileStore');
                await useProfileStore.getState().loadAvailableProfiles(session.user.id);
              } catch (profileError) {
                console.warn('⚠️ Failed to load profiles:', profileError);
              }
            } else {
              console.log('ℹ️ No session found - user not authenticated');
              set({ user: null, isAuthenticated: false, authLoading: false, authError: null });
            }
          } catch (error) {
            console.error('❌ Auth initialization error:', error);

            // Check for timeout error
            if (error.message === 'Session check timeout' || error.message === 'Profile fetch timeout') {
              console.warn('⏱️ Auth initialization timed out - proceeding without auth');
              set({ user: null, isAuthenticated: false, authLoading: false, authError: null });
              return;
            }

            // If it's a network error, don't clear session
            if (isNetworkError(error)) {
              console.warn('🌐 Network error during auth initialization - will retry when online');
              set({
                authLoading: false,
                authError: 'NETWORK_ERROR',
              });
              return;
            }

            // For non-network errors, clear any stale session data to prevent infinite retry loops
            console.log('🔓 Clearing session due to initialization error');
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.error('❌ Failed to sign out during error recovery:', signOutError);
            }
            set({ user: null, isAuthenticated: false, authLoading: false, authError: null });
          }

          console.log('✅ AuthStore: Initialization complete');
        },

        // Actions
        setUser: (user) => set({ user, isAuthenticated: !!user }),

        // Sign up with password
        signUpWithPassword: async (email, password, userData) => {
          set({ authLoading: true, authError: null });
          try {
            const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: userData
              }
            });

            if (error) throw error;

            // Create profile
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                email: data.user.email,
                name: userData.name,
                phone: userData.phone,
                user_type: userData.user_type,
                platform: 'taxicab',
                auth_method: 'password',

                login_count: 0,
                last_selected_profile_type: userData.user_type, // Set initial profile type
                last_used_profile: userData.user_type, // Set last used profile
                account_status: 'active', // Set account status to active
              });

            if (profileError) throw profileError;

            // Create user-type specific profile to populate available_profiles
            if (userData.user_type === 'individual') {
              // Individual profiles are auto-approved
              await supabase.from('individual_profiles').insert({
                user_id: data.user.id,
                saved_places: [],
                payment_methods: [],
                preferences: {},
                profile_status: 'approved',
                profile_completion_status: 'complete', // FIXED: Use profile_completion_status
                approval_status: 'approved',
                account_status: 'active', // FIXED: Set account_status
                completion_percentage: 100
              });
            } else if (userData.user_type === 'corporate') {
              // Corporate profiles are auto-approved (credit payment option requires separate approval)
              await supabase.from('corporate_profiles').insert({
                user_id: data.user.id,
                company_name: '',
                company_size: '',
                business_registration: '',
                address: '',
                profile_status: 'in_progress', // In progress until they fill out company details
                profile_completion_status: 'complete', // FIXED: Auto-approved corporates are complete
                approval_status: 'approved', // Auto-approved for access
                account_status: 'active', // FIXED: Set account_status
                corporate_credit_status: 'not_requested', // FIXED: Set credit status
                completion_percentage: 0
              });
            } else if (userData.user_type === 'driver') {
              // Driver profiles require admin approval after completion
              await supabase.from('driver_profiles').insert({
                user_id: data.user.id,
                profile_status: 'in_progress',
                profile_completion_status: 'incomplete', // FIXED: Use profile_completion_status
                approval_status: 'pending',
                account_status: 'active', // FIXED: Set account_status
                completion_percentage: 0,
                platform: 'taxicab'
              });
            }

            set({ authLoading: false });
            return { success: true, data };
          } catch (error) {
            const friendlyError = getUserFriendlyError(error);
            set({ authError: friendlyError, authLoading: false });
            return { success: false, error: friendlyError };
          }
        },

        // Sign up with OTP
        signUpWithOTP: async (email, userData) => {
          set({ authLoading: true, authError: null });
          try {
            const { data, error } = await supabase.auth.signInWithOtp({
              email,
              options: {
                data: userData
              }
            });

            if (error) throw error;

            set({ authLoading: false });
            return { success: true, data };
          } catch (error) {
            const friendlyError = getUserFriendlyError(error);
            set({ authError: friendlyError, authLoading: false });
            return { success: false, error: friendlyError };
          }
        },

        // Verify OTP
        verifyOTP: async (email, token, userData) => {
          set({ authLoading: true, authError: null });
          try {
            const { data, error } = await supabase.auth.verifyOtp({
              email,
              token,
              type: 'email'
            });

            if (error) throw error;

            // Create profile if it doesn't exist
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.user.id)
              .single();

            if (!existingProfile) {
              const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  email: data.user.email,
                  name: userData.name,
                  phone: userData.phone,
                  user_type: userData.user_type,
                  platform: 'taxicab',
                  auth_method: 'otp',
                  otp_verified: true,

                  login_count: 1,
                  last_login_at: new Date().toISOString(),
                  last_selected_profile_type: userData.user_type, // Set initial profile type
                  last_used_profile: userData.user_type, // Set last used profile
                  account_status: 'active', // Set account status to active
                });

              if (profileError) throw profileError;

              // Create user-type specific profile to populate available_profiles
              if (userData.user_type === 'individual') {
                // Individual profiles are auto-approved
                await supabase.from('individual_profiles').insert({
                  user_id: data.user.id,
                  saved_places: [],
                  payment_methods: [],
                  preferences: {},
                  profile_status: 'approved',
                  approval_status: 'approved',
                  profile_completion_status: 'complete',
                  completion_percentage: 100,
                  account_status: 'active',
                  completed_at: new Date().toISOString()
                });
              } else if (userData.user_type === 'corporate') {
                // Corporate profiles are auto-approved (credit payment option requires separate approval)
                await supabase.from('corporate_profiles').insert({
                  user_id: data.user.id,
                  company_name: '',
                  company_size: '',
                  business_registration: '',
                  address: '',
                  profile_status: 'in_progress', // In progress until they fill out company details
                  approval_status: 'approved', // Auto-approved for access
                  completion_percentage: 0
                });
              } else if (userData.user_type === 'driver') {
                // Driver profiles require admin approval after completion
                await supabase.from('driver_profiles').insert({
                  user_id: data.user.id,
                  profile_status: 'in_progress',
                  approval_status: 'pending',
                  completion_percentage: 0,
                  platform: 'taxicab'
                });
              }
            }

            // Fetch profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            set({ user: profile, isAuthenticated: true, authLoading: false });

            // Load available profiles for multi-profile system
            const { default: useProfileStore } = await import('./profileStore');
            await useProfileStore.getState().loadAvailableProfiles(data.user.id);

            return { success: true, data, profile };
          } catch (error) {
            const friendlyError = getUserFriendlyError(error);
            set({ authError: friendlyError, authLoading: false });
            return { success: false, error: friendlyError };
          }
        },

        // Login with password
        login: async (email, password) => {
          set({ authLoading: true, authError: null });
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password
            });

            if (error) throw error;

            // Fetch profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profileError) throw profileError;

            // Validate platform access
            const validation = validatePlatformAccess(profile);
            if (!validation.isValid) {
              await supabase.auth.signOut();
              throw new Error(validation.message);
            }

            // Update login count and last login
            const newLoginCount = (profile.login_count || 0) + 1;
            await supabase
              .from('profiles')
              .update({
                login_count: newLoginCount,
                last_login_at: new Date().toISOString()
              })
              .eq('id', data.user.id);

            const updatedProfile = { ...profile, login_count: newLoginCount };
            set({ user: updatedProfile, isAuthenticated: true, authLoading: false });

            // Load available profiles for multi-profile system
            const { default: useProfileStore } = await import('./profileStore');
            await useProfileStore.getState().loadAvailableProfiles(data.user.id);

            // NOTE: Redirect is now handled by RootRedirect component in Routes.jsx
            // This allows us to use React Router's navigate() instead of window.location.href

            return { success: true, user: updatedProfile };
          } catch (error) {
            const friendlyError = getUserFriendlyError(error);
            set({ authError: friendlyError, authLoading: false });
            return { success: false, error: friendlyError };
          }
        },

        // Login with OTP - Send OTP
        loginWithOTP: async (email) => {
          set({ authLoading: true, authError: null });
          try {
            // First check if user exists
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id, email, user_type, platform')
              .eq('email', email)
              .single();

            if (profileError || !profile) {
              throw new Error('No account found with this email address. Please sign up first.');
            }

            // Validate platform access
            const validation = validatePlatformAccess(profile);
            if (!validation.isValid) {
              throw new Error(validation.message);
            }

            // Call the send-otp edge function
            const { data, error } = await supabase.functions.invoke('send-otp', {
              body: {
                email,
                userType: profile.user_type,
                platform: 'taxicab'
              }
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error || 'Failed to send OTP');

            set({ authLoading: false });
            return { success: true, data, otp: data.otp }; // otp will be present in development mode
          } catch (error) {
            const friendlyError = getUserFriendlyError(error);
            set({ authError: friendlyError, authLoading: false });
            return { success: false, error: friendlyError };
          }
        },

        // Verify OTP for login
        verifyLoginOTP: async (email, otpCode) => {
          set({ authLoading: true, authError: null });
          try {
            // Verify OTP from database
            const { data: otpRecord, error: otpError } = await supabase
              .from('otp_verifications')
              .select('*')
              .eq('email', email)
              .eq('otp_code', otpCode)
              .eq('platform', 'taxicab')
              .eq('verified', false)
              .gt('expires_at', new Date().toISOString())
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (otpError || !otpRecord) {
              throw new Error('Invalid or expired OTP code. Please request a new one.');
            }

            // Mark OTP as verified
            await supabase
              .from('otp_verifications')
              .update({ verified: true })
              .eq('id', otpRecord.id);

            // Get user profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', email)
              .single();

            if (profileError || !profile) {
              throw new Error('User profile not found');
            }

            // Validate platform access
            const validation = validatePlatformAccess(profile);
            if (!validation.isValid) {
              throw new Error(validation.message);
            }

            // Create a session by signing in with OTP (this creates the auth session)
            await supabase.auth.verifyOtp({
              email: email,
              token: otpCode,
              type: 'email'
            });

            // If auth session creation fails, we still proceed with manual session
            // Update login count and last login
            const newLoginCount = (profile.login_count || 0) + 1;
            await supabase
              .from('profiles')
              .update({
                login_count: newLoginCount,
                last_login_at: new Date().toISOString()
              })
              .eq('id', profile.id);

            const updatedProfile = { ...profile, login_count: newLoginCount };
            set({ user: updatedProfile, isAuthenticated: true, authLoading: false });

            // Load available profiles for multi-profile system
            const { default: useProfileStore } = await import('./profileStore');
            await useProfileStore.getState().loadAvailableProfiles(profile.id);

            // NOTE: Redirect is now handled by RootRedirect component in Routes.jsx
            // This allows us to use React Router's navigate() instead of window.location.href

            return { success: true, user: updatedProfile };
          } catch (error) {
            const friendlyError = getUserFriendlyError(error);
            set({ authError: friendlyError, authLoading: false });
            return { success: false, error: friendlyError };
          }
        },

        logout: async () => {
          set({ authLoading: true });
          try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            // Clear profile store on logout
            // Import dynamically to avoid circular dependency
            const { default: useProfileStore } = await import('./profileStore');
            useProfileStore.getState().reset();

            set({ user: null, isAuthenticated: false, authLoading: false });
            return { success: true };
          } catch (error) {
            const friendlyError = getUserFriendlyError(error);
            set({ authError: friendlyError, authLoading: false });
            return { success: false, error: friendlyError };
          }
        },

        updateProfile: async (updates) => {
          const currentUser = get().user;
          if (!currentUser) return { success: false, error: 'No user logged in' };

          try {
            const { data, error } = await supabase
              .from('profiles')
              .update(updates)
              .eq('id', currentUser.id)
              .select()
              .single();

            if (error) throw error;

            set({ user: data });
            return { success: true, user: data };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },

        clearError: () => set({ authError: null }),
      }),
      {
        name: 'auth-storage',
        version: 1, // Increment this when auth state structure changes
        partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        // Migrate function to handle version changes
        migrate: (persistedState, version) => {
          console.log('🔄 Migrating auth storage from version', version, 'to version 1');

          // If version mismatch, clear stale state
          if (version !== 1) {
            console.warn('⚠️ Auth storage version mismatch - clearing stale state');
            return { user: null, isAuthenticated: false };
          }

          return persistedState;
        },
        // Add storage event listener to detect cross-tab changes
        onRehydrateStorage: () => {
          console.log('🔄 Rehydrating auth storage...');

          return (state, error) => {
            if (error) {
              console.error('❌ Error rehydrating auth storage:', error);
            } else {
              console.log('✅ Auth storage rehydrated successfully');
            }
          };
        },
      }
    ),
    { name: 'AuthStore' }
  )
);

export default useAuthStore;

