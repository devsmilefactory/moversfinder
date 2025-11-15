import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores';
import { supabase } from '../lib/supabase';

/**
 * Profile Completion Guard
 * 
 * Redirects drivers with incomplete profiles to profile completion page
 * Allows access to:
 * - /driver/profile (profile completion page)
 * - /driver/documents (document upload)
 * - /driver/dashboard (view-only)
 * 
 * Blocks access to:
 * - /driver/ride-requests (accepting rides)
 * - /driver/earnings (payout features)
 * - All other driver features
 */
const ProfileCompletionGuard = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const [profileStatus, setProfileStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('profile_completion_status, profile_completion_percentage')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setProfileStatus(profile);

        // Allow access to these pages regardless of completion status
        const allowedPaths = [
          '/driver/profile',
          '/driver/documents',
          '/driver/dashboard',
          '/driver/support'
        ];

        const currentPath = location.pathname;
        const isAllowedPath = allowedPaths.some(path => currentPath.startsWith(path));

        // If profile is incomplete and trying to access restricted page
        if (profile.profile_completion_status !== 'complete' && !isAllowedPath) {
          navigate('/driver/profile', { 
            state: { 
              message: 'Please complete your profile to access all features',
              from: currentPath 
            } 
          });
        }
      } catch (error) {
        console.error('Error checking profile completion:', error);
      } finally {
        setLoading(false);
      }
    };

    checkProfileCompletion();
  }, [user?.id, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-600">Checking profile status...</div>
      </div>
    );
  }

  return children;
};

export default ProfileCompletionGuard;

