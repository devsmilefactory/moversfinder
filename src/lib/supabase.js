/**
 * Supabase Client Configuration
 * TaxiCab Landing Page
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const platformId = import.meta.env.VITE_PLATFORM_ID || 'taxicab';

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  throw new Error('Missing Supabase environment variables');
}

/**
 * Custom fetch wrapper that handles network errors gracefully
 * Prevents infinite retry loops when offline
 */
const customFetch = async (url, options = {}) => {
  try {
    return await fetch(url, options);
  } catch (error) {
    // If it's a network error, enhance the error message
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      const enhancedError = new Error('Network error: Unable to reach server');
      enhancedError.name = 'NetworkError';
      enhancedError.originalError = error;
      throw enhancedError;
    }
    throw error;
  }
};

// Create Supabase client with custom fetch
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    // Disable auto-refresh when offline to prevent infinite retries
    storageKey: 'taxicab-auth',
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-platform-id': platformId,
    },
    fetch: customFetch,
  },
});

// Helper function to get platform ID
export const getPlatformId = () => platformId;

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Export for testing
export const getSupabaseUrl = () => supabaseUrl;

