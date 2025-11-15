import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { redirectToDashboard } from '../lib/routing';

/**
 * Authentication Store - BMTOA Platform
 * Manages user authentication state and profile
 *
 * Authentication Methods:
 * - Drivers & Operators: OTP via email (no password)
 * - Admin: Password-based
 *
 * Features:
 * - OTP verification with rate limiting (1 per 30 seconds)
 * - Max 10 OTP attempts, then 2-hour lockout
 * - Profile completion tracking (forced after 3 logins)
 * - Verification/approval status tracking
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

        // OTP State
        otpSent: false,
        otpVerified: false,
        otpLoading: false,
        otpError: null,
        otpEmail: null,
        otpCooldown: 0, // Seconds remaining before can resend
        otpAttempts: 0,
        otpLockedUntil: null,

        // Profile Completion State
        profileCompletionStatus: 'incomplete',
        profileCompletionPercentage: 0,
        loginCount: 0,

        // Verification State
        verificationStatus: 'pending',
        verificationMessage: null,

        // Actions
        setUser: (user) => set({ user, isAuthenticated: !!user }),

        /**
         * Send OTP to email
         * Rate limited to 1 per 30 seconds
         */
        sendOTP: async (email, userType) => {
          const state = get();

          // Check cooldown
          if (state.otpCooldown > 0) {
            set({ otpError: `Please wait ${state.otpCooldown} seconds before requesting another code` });
            return { success: false, error: 'Rate limited' };
          }

          // Check if locked
          if (state.otpLockedUntil && new Date(state.otpLockedUntil) > new Date()) {
            const minutesLeft = Math.ceil((new Date(state.otpLockedUntil) - new Date()) / 60000);
            set({ otpError: `Too many attempts. Try again in ${minutesLeft} minutes` });
            return { success: false, error: 'Account locked' };
          }

          set({ otpLoading: true, otpError: null });

          try {
            // Call Supabase Edge Function to send OTP via Resend
            // The edge function handles OTP generation, database storage, and email sending
            const { data, error } = await supabase.functions.invoke('send-otp', {
              body: {
                email,
                userType,
                platform: 'bmtoa'
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
              alert(`DEVELOPMENT MODE\n\nYour OTP code is: ${data.otp}\n\nIn production, this will be sent via email.`);
            }

            // Start 30-second cooldown
            set({
              otpSent: true,
              otpEmail: email,
              otpLoading: false,
              otpCooldown: 30,
            });

            // Countdown timer
            const interval = setInterval(() => {
              const currentCooldown = get().otpCooldown;
              if (currentCooldown <= 1) {
                clearInterval(interval);
                set({ otpCooldown: 0 });
              } else {
                set({ otpCooldown: currentCooldown - 1 });
              }
            }, 1000);

            return { success: true };
          } catch (error) {
            set({ otpError: error.message, otpLoading: false });
            return { success: false, error: error.message };
          }
        },

        /**
         * Verify OTP and create/login user
         */
        verifyOTP: async (email, otpCode, userData = {}) => {
          set({ otpLoading: true, otpError: null });

          try {
            // Verify OTP in database
            const { data: otpData, error: otpError } = await supabase
              .from('otp_verifications')
              .select('*')
              .eq('email', email)
              .eq('otp_code', otpCode)
              .is('verified_at', null)
              .gt('expires_at', new Date().toISOString())
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (otpError || !otpData) {
              // Increment attempts
              const newAttempts = get().otpAttempts + 1;
              set({ otpAttempts: newAttempts });

              // Lock after 10 attempts
              if (newAttempts >= 10) {
                const lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
                set({
                  otpLockedUntil: lockUntil.toISOString(),
                  otpError: 'Too many failed attempts. Account locked for 2 hours.',
                });
                return { success: false, error: 'Account locked' };
              }

              throw new Error('Invalid or expired OTP code');
            }

            // Mark OTP as verified
            await supabase
              .from('otp_verifications')
              .update({ verified_at: new Date().toISOString() })
              .eq('id', otpData.id);

            // Check if user exists
            const { data: existingUser } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', email)
              .single();

            if (existingUser) {
              // Login existing user
              // Increment login count
              const newLoginCount = existingUser.login_count + 1;
              await supabase
                .from('profiles')
                .update({ login_count: newLoginCount })
                .eq('id', existingUser.id);

              set({
                user: { ...existingUser, login_count: newLoginCount },
                isAuthenticated: true,
                otpVerified: true,
                otpLoading: false,
                otpAttempts: 0,
                loginCount: newLoginCount,
                profileCompletionStatus: existingUser.profile_completion_status,
                verificationStatus: existingUser.verification_status,
              });

              return { success: true, user: existingUser, isNewUser: false };
            } else {
              // Create new user
              const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password: Math.random().toString(36), // Random password (not used)
                options: {
                  data: {
                    name: userData.name,
                    phone: userData.phone,
                    user_type: userData.userType || 'taxi_operator',
                    platform: 'bmtoa',
                  }
                }
              });

              if (authError) throw authError;

              // Create profile
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .insert({
                  id: authData.user.id,
                  email,
                  name: userData.name,
                  phone: userData.phone,
                  user_type: userData.userType || 'taxi_operator',
                  platform: 'bmtoa',
                  auth_method: 'otp',
                  otp_verified: true,
                  login_count: 1,
                  profile_completion_status: 'incomplete',
                  verification_status: 'pending',
                })
                .select()
                .single();

              if (profileError) throw profileError;

              // Create user-type specific profile
              if (userData.userType === 'driver') {
                await supabase.from('driver_profiles').insert({
                  user_id: profile.id,
                  license_number: '', // To be completed later
                });
              } else if (userData.userType === 'taxi_operator' || userData.userType === 'operator') {
                await supabase.from('operator_profiles').insert({
                  user_id: profile.id,
                  company_name: userData.companyName || '',
                });
              }

              set({
                user: profile,
                isAuthenticated: true,
                otpVerified: true,
                otpLoading: false,
                otpAttempts: 0,
                loginCount: 1,
                profileCompletionStatus: 'incomplete',
                verificationStatus: 'pending',
              });

              return { success: true, user: profile, isNewUser: true };
            }
          } catch (error) {
            set({ otpError: error.message, otpLoading: false });
            return { success: false, error: error.message };
          }
        },

        /**
         * Resend OTP
         */
        resendOTP: async () => {
          const { otpEmail } = get();
          if (!otpEmail) {
            return { success: false, error: 'No email set' };
          }
          return get().sendOTP(otpEmail);
        },

        /**
         * Login with email and password (for Admin users)
         */
        loginWithPassword: async (email, password) => {
          set({ authLoading: true, authError: null });

          try {
            // Sign in with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (authError) throw authError;

            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single();

            if (profileError) throw profileError;

            // Verify platform access
            if (profile.platform !== 'bmtoa' && profile.platform !== 'both') {
              await supabase.auth.signOut();
              throw new Error('Access denied. This platform is for BMTOA members only.');
            }

            // Increment login count
            const newLoginCount = profile.login_count + 1;
            await supabase
              .from('profiles')
              .update({
                login_count: newLoginCount,
                last_login_at: new Date().toISOString()
              })
              .eq('id', profile.id);

            set({
              user: { ...profile, login_count: newLoginCount },
              isAuthenticated: true,
              authLoading: false,
              loginCount: newLoginCount,
              profileCompletionStatus: profile.profile_completion_status || 'incomplete',
              verificationStatus: profile.verification_status || 'pending',
            });

            // Check profile completion
            get().checkProfileCompletion();

            // Redirect to dashboard
            setTimeout(() => {
              redirectToDashboard(profile);
            }, 500);

            return { success: true, user: profile };
          } catch (error) {
            set({ authError: error.message, authLoading: false });
            return { success: false, error: error.message };
          }
        },

        /**
         * Logout user
         */
        logout: async () => {
          try {
            await supabase.auth.signOut();
            set({
              user: null,
              isAuthenticated: false,
              otpSent: false,
              otpVerified: false,
              otpEmail: null,
              otpAttempts: 0,
              profileCompletionStatus: 'incomplete',
              verificationStatus: 'pending',
            });
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },

        /**
         * Update user profile
         */
        updateProfile: async (updates) => {
          set({ authLoading: true, authError: null });
          try {
            const userId = get().user?.id;
            if (!userId) throw new Error('No user logged in');

            const { data, error } = await supabase
              .from('profiles')
              .update(updates)
              .eq('id', userId)
              .select()
              .single();

            if (error) throw error;

            set({ user: data, authLoading: false });
            return { success: true, user: data };
          } catch (error) {
            set({ authError: error.message, authLoading: false });
            return { success: false, error: error.message };
          }
        },

        /**
         * Check and update profile completion status
         */
        checkProfileCompletion: async () => {
          const userId = get().user?.id;
          const userType = get().user?.user_type;
          if (!userId || !userType) return;

          try {
            let completionStatus = 'incomplete';
            let completionPercentage = 0;

            if (userType === 'driver') {
              const { data } = await supabase
                .from('driver_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

              if (data) {
                const requiredFields = [
                  'full_name', 'profile_photo', 'date_of_birth', 'national_id',
                  'license_number', 'license_expiry', 'license_class', 'license_document',
                  'vehicle_make', 'vehicle_model', 'vehicle_year', 'vehicle_color', 'license_plate',
                  'vehicle_photo', 'vehicle_registration', 'insurance_certificate',
                  'roadworthy_certificate', 'bank_name', 'account_number'
                ];

                const completedFields = requiredFields.filter(field => data[field]);
                completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100);

                if (completionPercentage === 100) completionStatus = 'complete';
                else if (completionPercentage >= 50) completionStatus = 'partial';
              }
            } else if (userType === 'taxi_operator' || userType === 'operator') {
              const { data } = await supabase
                .from('operator_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

              if (data) {
                const requiredFields = [
                  'company_name', 'business_registration', 'company_address',
                  'operating_areas', 'business_registration_document',
                  'tax_clearance', 'bank_name', 'account_number', 'membership_tier'
                ];

                const completedFields = requiredFields.filter(field => data[field]);
                completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100);

                if (completionPercentage === 100) completionStatus = 'complete';
                else if (completionPercentage >= 60) completionStatus = 'partial';
              }
            }

            // Update profile completion status
            await supabase
              .from('profiles')
              .update({
                profile_completion_status: completionStatus,
                profile_completed_at: completionStatus === 'complete' ? new Date().toISOString() : null,
              })
              .eq('id', userId);

            set({
              profileCompletionStatus: completionStatus,
              profileCompletionPercentage: completionPercentage,
            });

            return { completionStatus, completionPercentage };
          } catch (error) {
            console.error('Error checking profile completion:', error);
            return null;
          }
        },

        /**
         * Check if profile completion should be forced
         */
        shouldForceProfileCompletion: () => {
          const { loginCount, profileCompletionStatus } = get();
          return loginCount >= 3 && profileCompletionStatus !== 'complete';
        },

        /**
         * Initialize auth from Supabase session
         */
        initAuth: async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (profile) {
                set({
                  user: profile,
                  isAuthenticated: true,
                  loginCount: profile.login_count || 0,
                  profileCompletionStatus: profile.profile_completion_status || 'incomplete',
                  verificationStatus: profile.verification_status || 'pending',
                });

                // Check profile completion
                get().checkProfileCompletion();
              }
            }
          } catch (error) {
            console.error('Error initializing auth:', error);
          }
        },

        /**
         * Clear OTP state
         */
        clearOTPState: () => {
          set({
            otpSent: false,
            otpVerified: false,
            otpError: null,
            otpEmail: null,
            otpCooldown: 0,
            otpAttempts: 0,
          });
        },

        /**
         * Clear auth error
         */
        clearError: () => set({ authError: null, otpError: null }),
      }),
      {
        name: 'bmtoa-auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          loginCount: state.loginCount,
          profileCompletionStatus: state.profileCompletionStatus,
          verificationStatus: state.verificationStatus,
        }),
      }
    ),
    { name: 'BMTOA Auth Store' }
  )
);

export default useAuthStore;

