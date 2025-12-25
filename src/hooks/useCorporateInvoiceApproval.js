/**
 * Hook to check corporate invoice payment method approval
 * Checks if corporate user has approval for invoice/credit payment method
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores';

export function useCorporateInvoiceApproval() {
  const user = useAuthStore((state) => state.user);
  const [isApproved, setIsApproved] = useState(false);
  const [corporateProfile, setCorporateProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const checkApproval = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check corporate profile for approval
        const { data: corporateProfile, error: corpError } = await supabase
          .from('corporate_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (corpError) throw corpError;

        if (!corporateProfile) {
          setIsApproved(false);
          setCorporateProfile(null);
          return;
        }

        setCorporateProfile(corporateProfile);

        // Check if credit booking is approved
        const approved = corporateProfile?.credit_booking_approved === true ||
                        corporateProfile?.corporate_credit_status === 'approved' ||
                        (Array.isArray(corporateProfile?.billing_method) && 
                         corporateProfile.billing_method.includes('credit_account'));

        setIsApproved(approved);
      } catch (err) {
        console.error('Error checking corporate invoice approval:', err);
        setError(err);
        setIsApproved(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkApproval();
  }, [user]);

  return { isApproved, corporateProfile, isLoading, error };
}




