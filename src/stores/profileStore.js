import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import {
  convertDriverProfileData,
  convertCorporateProfileData,
  convertOperatorProfileData,
  convertIndividualProfileData
} from '../lib/typeConversion';

/**
 * Profile Store - Manages user profiles and profile switching
 * 
 * This store handles the multi-profile system where users can have multiple roles
 * (individual, corporate, driver, operator) and switch between them seamlessly.
 */
const useProfileStore = create(
  devtools((set, get) => ({
    // State
    availableProfiles: [],
    activeProfile: null,
    activeProfileType: null,
    profileLoading: false,
    profileError: null,

    /**
     * Load available profiles for current user
     * Fetches the available_profiles JSONB from profiles table and loads active profile data
     *
     * CRITICAL FIX: Validates that active_profile_type exists in available_profiles
     * If not, automatically corrects it to the first approved profile or user's primary user_type
     */
    loadAvailableProfiles: async (userId) => {
      set({ profileLoading: true, profileError: null });
      try {
        // Fetch from profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('available_profiles, active_profile_type, user_type')
          .eq('id', userId)
          .single();

        if (error) throw error;

        const availableProfiles = profile.available_profiles || [];
        let activeProfileType = profile.active_profile_type;

        // CRITICAL FIX: Validate active_profile_type exists in available_profiles
        if (activeProfileType) {
          const profileExists = availableProfiles.find(p => p.type === activeProfileType);

          if (!profileExists) {
            console.warn(`Active profile type "${activeProfileType}" not found in available_profiles. Auto-correcting...`);

            // Find the first approved profile, or fall back to user's primary user_type
            const firstApprovedProfile = availableProfiles.find(
              p => p.status === 'approved' && p.approval === 'approved'
            );

            if (firstApprovedProfile) {
              activeProfileType = firstApprovedProfile.type;
              console.log(`Setting active_profile_type to first approved profile: ${activeProfileType}`);
            } else if (profile.user_type) {
              // Fall back to user's primary user_type
              activeProfileType = profile.user_type;
              console.log(`Setting active_profile_type to user_type: ${activeProfileType}`);
            } else {
              // Last resort: set to null
              activeProfileType = null;
              console.log('No valid profile found, setting active_profile_type to null');
            }

            // Update database with corrected active_profile_type
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ active_profile_type: activeProfileType })
              .eq('id', userId);

            if (updateError) {
              console.error('Error updating active_profile_type:', updateError);
            }
          }
        }

        set({
          availableProfiles,
          activeProfileType,
          profileLoading: false
        });

        // Load active profile data if exists
        if (activeProfileType) {
          await get().loadProfileData(userId, activeProfileType);
        }

        return { success: true };
      } catch (error) {
        console.error('Error loading profiles:', error);
        set({ profileError: error.message, profileLoading: false });
        return { success: false, error: error.message };
      }
    },

    /**
     * Load specific profile data from the appropriate profile table
     */
    loadProfileData: async (userId, profileType) => {
      const tableMap = {
        individual: 'individual_profiles',
        corporate: 'corporate_profiles',
        driver: 'driver_profiles',
        operator: 'operator_profiles',
        // Handle legacy user_types
        taxi_operator: 'operator_profiles'
      };

      const tableName = tableMap[profileType];
      if (!tableName) {
        console.warn(`Unknown profile type: ${profileType}`);
        return;
      }

      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(); // Use maybeSingle to avoid 406 error when profile doesn't exist

        if (error) throw error;

        set({ activeProfile: data });
        return { success: true, data };
      } catch (error) {
        console.error(`Error loading ${profileType} profile:`, error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Switch to a different profile
     * Validates profile exists and is approved before switching
     */
    switchProfile: async (userId, profileType) => {
      set({ profileLoading: true, profileError: null });

      try {
        // Check if profile exists and is approved
        const profile = get().availableProfiles.find(p => p.type === profileType);

        if (!profile) {
          throw new Error(`${profileType} profile does not exist. Please create it first.`);
        }

        if (profile.status !== 'approved') {
          throw new Error(`${profileType} profile is ${profile.status}. Only approved profiles can be accessed.`);
        }

        if (profile.approval !== 'approved') {
          throw new Error(`${profileType} profile is awaiting approval.`);
        }

        // Update active_profile_type in database
        const { error } = await supabase
          .from('profiles')
          .update({
            active_profile_type: profileType,
            last_active_profile_type: get().activeProfileType
          })
          .eq('id', userId);

        if (error) throw error;

        // Load new profile data
        const result = await get().loadProfileData(userId, profileType);

        if (!result.success) {
          throw new Error(result.error);
        }

        set({
          activeProfileType: profileType,
          profileLoading: false
        });

        return { success: true };
      } catch (error) {
        console.error('Error switching profile:', error);
        set({ profileError: error.message, profileLoading: false });
        return { success: false, error: error.message };
      }
    },

    /**
     * Switch to any profile regardless of status
     * Used by ProfileSwitcher to allow navigation to incomplete/pending/declined profiles
     * The destination page will handle displaying the appropriate state
     */
    switchToProfile: async (userId, profileType) => {
      set({ profileLoading: true, profileError: null });

      try {
        // Update active_profile_type, last_selected_profile_type AND last_used_profile in database
        const { error } = await supabase
          .from('profiles')
          .update({
            active_profile_type: profileType,
            last_active_profile_type: get().activeProfileType,
            last_selected_profile_type: profileType, // Remember this selection for future logins
            last_used_profile: profileType // Track the last used profile for accurate post-login routing
          })
          .eq('id', userId);

        if (error) throw error;

        // Load new profile data
        const result = await get().loadProfileData(userId, profileType);

        if (!result.success) {
          console.warn(`Could not load ${profileType} profile data:`, result.error);
        }

        // Update state
        set({
          activeProfileType: profileType,
          profileLoading: false
        });

        // Refresh available profiles to get latest status
        await get().refreshProfiles(userId);

        return { success: true };
      } catch (error) {
        console.error('Error switching to profile:', error);
        set({ profileError: error.message, profileLoading: false });
        return { success: false, error: error.message };
      }
    },

    /**
     * Get profile status for a specific profile type
     * Returns profile info or default not_created status
     */
    getProfileStatus: (profileType) => {
      const profile = get().availableProfiles.find(p => p.type === profileType);
      return profile || { 
        type: profileType, 
        status: 'not_created', 
        approval: 'pending', 
        completion: 0 
      };
    },

    /**
     * Check if user can access a specific profile
     * Profile must be approved and have approved status
     */
    canAccessProfile: (profileType) => {
      const profile = get().getProfileStatus(profileType);
      return profile.status === 'approved' && profile.approval === 'approved';
    },

    /**
     * Check if a profile exists in the database
     * Returns the profile data if it exists, null otherwise
     * This is the source of truth - checks actual database, not cached availableProfiles
     */
    checkProfileExists: async (userId, profileType) => {
      const tableMap = {
        individual: 'individual_profiles',
        corporate: 'corporate_profiles',
        driver: 'driver_profiles',
        operator: 'operator_profiles'
      };

      const tableName = tableMap[profileType];
      if (!tableName) {
        console.warn(`Unknown profile type: ${profileType}`);
        return null;
      }

      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(); // Use maybeSingle to avoid error when no rows found

        if (error) {
          console.error(`Error checking ${profileType} profile:`, error);
          return null;
        }

        return data; // Returns profile data if exists, null if not
      } catch (error) {
        console.error(`Error checking ${profileType} profile:`, error);
        return null;
      }
    },

    /**
     * Refresh available profiles from database
     * Useful after creating a new profile or when status changes
     */
    refreshProfiles: async (userId) => {
      return await get().loadAvailableProfiles(userId);
    },

    /**
     * Create a new profile
     * Inserts into the appropriate profile table with initial status
     */
    createProfile: async (userId, profileType, profileData) => {
      set({ profileLoading: true, profileError: null });

      const tableMap = {
        individual: 'individual_profiles',
        corporate: 'corporate_profiles',
        driver: 'driver_profiles',
        operator: 'operator_profiles'
      };

      const tableName = tableMap[profileType];
      if (!tableName) {
        set({ profileError: 'Invalid profile type', profileLoading: false });
        return { success: false, error: 'Invalid profile type' };
      }

      try {
        // Determine initial status based on profile type
        const autoApproved = profileType === 'individual' || profileType === 'corporate';

        const insertData = {
          user_id: userId,
          ...profileData,
          profile_status: autoApproved ? 'approved' : 'pending_approval',
          profile_completion_status: autoApproved ? 'complete' : 'incomplete', // FIXED: Add profile_completion_status
          approval_status: autoApproved ? 'approved' : 'pending',
          account_status: 'active', // FIXED: Add account_status
          completion_percentage: autoApproved ? 100 : 0 // FIXED: Set to 0 for non-auto-approved
        };

        // Add corporate-specific fields and ensure required defaults
        if (profileType === 'corporate') {
          insertData.corporate_credit_status = 'not_requested'; // FIXED: Add corporate_credit_status
          // Ensure required NOT NULL fields in DB
          if (!insertData.company_name || String(insertData.company_name).trim() === '') {
            insertData.company_name = 'Corporate Account';
          }
        }

        const { data, error } = await supabase
          .from(tableName)
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        // Refresh available profiles (trigger will update it automatically)
        await get().refreshProfiles(userId);

        set({ profileLoading: false });
        return { success: true, data };
      } catch (error) {
        console.error(`Error creating ${profileType} profile:`, error);
        set({ profileError: error.message, profileLoading: false });
        return { success: false, error: error.message };
      }
    },

    /**
     * Update profile data
     */
    updateProfile: async (userId, profileType, updates) => {
      const tableMap = {
        individual: 'individual_profiles',
        corporate: 'corporate_profiles',
        driver: 'driver_profiles',
        operator: 'operator_profiles'
      };

      const tableName = tableMap[profileType];
      if (!tableName) {
        return { success: false, error: 'Invalid profile type' };
      }

      try {
        // Convert form data to database-safe types based on profile type
        let convertedUpdates;
        switch (profileType) {
          case 'driver':
            convertedUpdates = convertDriverProfileData(updates);
            break;
          case 'corporate':
            convertedUpdates = convertCorporateProfileData(updates);
            break;
          case 'operator':
            convertedUpdates = convertOperatorProfileData(updates);
            break;
          case 'individual':
            convertedUpdates = convertIndividualProfileData(updates);
            break;
          default:
            convertedUpdates = updates;
        }

        const { data, error } = await supabase
          .from(tableName)
          .update(convertedUpdates)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        // Refresh if this is the active profile
        if (get().activeProfileType === profileType) {
          set({ activeProfile: data });
        }

        // Refresh available profiles
        await get().refreshProfiles(userId);

        return { success: true, data };
      } catch (error) {
        console.error(`Error updating ${profileType} profile:`, error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Reset store (on logout)
     */
    reset: () => set({
      availableProfiles: [],
      activeProfile: null,
      activeProfileType: null,
      profileLoading: false,
      profileError: null
    })
  }), { name: 'ProfileStore' })
);

export default useProfileStore;

