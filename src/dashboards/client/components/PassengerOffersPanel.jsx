import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Button from '../../shared/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import { acceptOfferAtomic, rejectOffer as rejectOfferUtil } from '../../../utils/offers';

/**
 * PassengerOffersPanel
 * - Lists live driver offers for a given ride
 * - Realtime updates via Supabase channel
 * - Allows accept/reject (accept is guarded; will be replaced by Edge Function in later task)
 */
const PassengerOffersPanel = ({ rideId, onAccepted }) => {
  const { addToast } = useToast();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  const channelName = useMemo(() => `ride-offers-${rideId}`, [rideId]);

  useEffect(() => {
    if (!rideId) return;
    let isMounted = true;

    const loadInitial = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('ride_offers')
          .select('id, ride_id, driver_id, quoted_price, message, offer_status, offered_at, responded_at')
          .eq('ride_id', rideId)
          .order('offered_at', { ascending: false });
        if (error) throw error;
        if (isMounted) setOffers(data || []);
      } catch (e) {
        if (isMounted) setError(e.message || 'Failed to load offers');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // initial load
    loadInitial();

    // realtime subscription
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_offers', filter: `ride_id=eq.${rideId}` }, () => {
        // Re-load on any change for simplicity and correctness
        loadInitial();
      })
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [rideId, channelName]);

  const acceptOffer = async (offer) => {
    if (!offer?.id) return;
    if (!confirm(`Accept this offer for $${Number(offer.quoted_price).toFixed(2)}?`)) return;
    setAcceptingId(offer.id);
    setError(null);
    try {
      const res = await acceptOfferAtomic(offer.id, offer.ride_id);
      if (res.success) {
        addToast({ type: 'success', title: 'Offer accepted', message: 'Driver will be assigned shortly.' });
        onAccepted?.(res.data);
      } else {
        throw new Error(res.error || 'Failed to accept offer');
      }
    } catch (e) {
      console.error('Failed to accept offer:', e);
      addToast({ type: 'error', title: 'Failed to accept offer', message: e.message || String(e) });
      setError(e.message || 'Failed to accept offer');
    } finally {
      setAcceptingId(null);
    }
  };

  const rejectOffer = async (offer) => {
    if (!offer?.id) return;
    if (!confirm('Reject this offer?')) return;
    setRejectingId(offer.id);
    setError(null);
    try {
      const res = await rejectOfferUtil(offer.id);
      if (res.success) {
        addToast({ type: 'info', title: 'Offer rejected' });
      } else {
        throw new Error(res.error || 'Failed to reject offer');
      }
    } catch (e) {
      console.error('Failed to reject offer:', e);
      addToast({ type: 'error', title: 'Failed to reject offer', message: e.message || String(e) });
      setError(e.message || 'Failed to reject offer');
    } finally {
      setRejectingId(null);
    }
  };

  if (!rideId) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">Driver Offers</h4>
        {loading && <span className="text-xs text-gray-500">Loading…</span>}
      </div>
      {error && (
        <div className="text-xs text-red-600 mb-2">{error}</div>
      )}
      {offers.length === 0 && !loading ? (
        <div className="text-xs text-gray-500">No offers yet. We’ll notify you as soon as a driver responds.</div>
      ) : (
        <div className="space-y-2">
          {offers.map((offer) => (
            <div key={offer.id} className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                <div className="text-2xl">👤</div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Driver {offer.driver_id?.slice?.(0, 6) || offer.driver_id}</div>
                  <div className="text-xs text-gray-500">${Number(offer.quoted_price || 0).toFixed(2)} {offer.message ? `• ${offer.message}` : ''}</div>
                  {offer.offer_status !== 'pending' && (
                    <div className="text-[11px] text-gray-500 mt-0.5">Status: {offer.offer_status}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={() => acceptOffer(offer)}
                  disabled={acceptingId === offer.id || offer.offer_status !== 'pending'}
                >
                  {acceptingId === offer.id ? 'Accepting…' : 'Accept'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => rejectOffer(offer)}
                  disabled={rejectingId === offer.id || offer.offer_status !== 'pending'}
                >
                  {rejectingId === offer.id ? 'Rejecting…' : 'Reject'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PassengerOffersPanel;

