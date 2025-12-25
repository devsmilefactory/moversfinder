import { supabase } from '../lib/supabase';

/**
 * Attempt to accept an offer atomically via Edge Function, with client-side fallback.
 * Returns { success, data?, error? }
 */
export async function acceptOfferAtomic(offerId, rideId, passengerId = null) {
  // Get current user if passengerId not provided
  let userId = passengerId;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  }
  
  try {
    // Call the Edge Function only; no client-side fallback
    const { data, error } = await supabase.functions.invoke('accept-offer', {
      body: { offer_id: offerId, ride_id: rideId, passenger_id: userId },
    });

    // When edge function returns non-2xx, error is set and we need to parse the response body
    if (error) {
      let errorMessage = error.message || 'Failed to accept offer';
      
      // Try to extract error message from response body
      // For FunctionsHttpError, the response body is in error.context (Response object)
      if (error.context) {
        try {
          const response = error.context;
          // Check if response is a Response object with json() method
          if (response && typeof response.json === 'function') {
            try {
              const errorBody = await response.json();
              errorMessage = errorBody?.error || errorBody?.message || errorMessage;
            } catch (jsonError) {
              // Response body might already be consumed, try text()
              if (response && typeof response.text === 'function') {
                try {
                  const errorText = await response.text();
                  if (errorText) {
                    try {
                      const parsed = JSON.parse(errorText);
                      errorMessage = parsed?.error || parsed?.message || errorMessage;
                    } catch {
                      // If not JSON, use the text as-is if it's reasonable
                      if (errorText.length < 200) {
                        errorMessage = errorText;
                      }
                    }
                  }
                } catch (textError) {
                  console.warn('Could not read error response as text:', textError);
                }
              }
            }
          } else if (response && typeof response.text === 'function') {
            // Direct text() call if json() not available
            try {
              const errorText = await response.text();
              if (errorText) {
                try {
                  const parsed = JSON.parse(errorText);
                  errorMessage = parsed?.error || parsed?.message || errorMessage;
                } catch {
                  if (errorText.length < 200) {
                    errorMessage = errorText;
                  }
                }
              }
            } catch (textError) {
              console.warn('Could not read error response:', textError);
            }
          }
        } catch (parseError) {
          console.warn('Could not parse error response body:', parseError);
        }
      }
      
      // Fallback: check if data contains error info (sometimes Supabase still parses it)
      if (!errorMessage || errorMessage === 'Edge Function returned a non-2xx status code') {
        errorMessage = data?.error || data?.message || errorMessage;
      }
      
      console.error('Edge function error:', { 
        error, 
        data, 
        errorMessage, 
        errorName: error.name,
        errorContext: error.context,
        errorStatus: error.status
      });
      throw new Error(errorMessage);
    }
    
    // Check if response indicates failure
    if (!data || data.success !== true) {
      const message = data?.error || data?.message || 'Failed to accept offer';
      console.error('Edge function returned failure:', { data, message });
      throw new Error(message);
    }
    
    return { success: true, data };
  } catch (err) {
    // Re-throw if it's already our formatted error
    if (err.message && err.message !== String(err) && !err.message.includes('non-2xx')) {
      throw err;
    }
    // Otherwise, wrap in a more descriptive error
    console.error('Unexpected error accepting offer:', err);
    throw new Error(err.message || 'Failed to accept offer: Unknown error');
  }
}

export async function rejectOffer(offerId) {
  try {
    const { error } = await supabase
      .from('ride_offers')
      .update({ offer_status: 'rejected', responded_at: new Date().toISOString() })
      .eq('id', offerId);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

