import { supabase } from '../lib/supabase';

/**
 * Attempt to accept an offer atomically via Edge Function, with client-side fallback.
 * Returns { success, data?, error? }
 */
export async function acceptOfferAtomic(offerId, rideId) {
  // Call the Edge Function only; no client-side fallback
  const { data, error } = await supabase.functions.invoke('accept-offer', {
    body: { offer_id: offerId, ride_id: rideId },
  });

  if (error) {
    throw new Error(error.message || String(error));
  }
  if (!data || data.success !== true) {
    const message = data?.error || 'Failed to accept offer';
    throw new Error(message);
  }
  return { success: true, data };
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

