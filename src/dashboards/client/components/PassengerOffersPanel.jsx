import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import Button from '../../shared/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import { rejectOffer as rejectOfferUtil } from '../../../utils/offers';
import { acceptDriverBid, getBidAcceptanceErrorMessage } from '../../../services/bidAcceptanceService';
import useAuthStore from '../../../stores/authStore';

/**
 * PassengerOffersPanel
 * - Lists live driver offers for a given ride
 * - Realtime updates via Supabase channel
 * - Uses atomic bid acceptance with driver availability checks
 */
const PassengerOffersPanel = ({ rideId, onAccepted }) => {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  const channelName = useMemo(() => `ride-offers-${rideId}`, [rideId]);

  // Helper function to reload offers
  const loadInitial = async () => {
    if (!rideId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('ride_offers')
        .select('id, ride_id, driver_id, quoted_price, message, offer_status, offered_at, responded_at')
        .eq('ride_id', rideId)
        .order('offered_at', { ascending: false });
      if (error) throw error;
      setOffers(data || []);
    } catch (e) {
      setError(e.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!rideId) return;
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('ride_offers')
          .select('id, ride_id, driver_id, quoted_price, message, offer_status, offered_at, responded_at')
          .eq('ride_id', rideId)
          .order('offered_at', { ascending: false});
        if (error) throw error;
        if (isMounted) setOffers(data || []);
      } catch (e) {
        if (isMounted) setError(e.message || 'Failed to load offers');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // initial load
    loadData();

    // realtime subscription
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_offers', filter: `ride_id=eq.${rideId}` }, () => {
        // Re-load on any change for simplicity and correctness
        if (isMounted) loadData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [rideId, channelName]);

  const acceptOffer = async (offer) => {
    if (!offer?.id || !user?.id) return;
    if (!confirm(`Accept this offer for $${Number(offer.quoted_price).toFixed(2)}?`)) return;
    
    setAcceptingId(offer.id);
    setError(null);
    
    try {
      console.log('🔄 Accepting offer:', {
        offerId: offer.id,
        rideId: offer.ride_id,
        driverId: offer.driver_id,
        passengerId: user.id
      });
      
      // Call new atomic bid acceptance service with driver availability check
      const result = await acceptDriverBid(
        offer.ride_id,
        offer.id,
        offer.driver_id,
        user.id
      );
      
      if (result.success) {
        console.log('✅ Offer accepted successfully');
        addToast({
          type: 'success',
          title: 'Driver Assigned',
          message: 'Your ride has been accepted!',
          duration: 5000
        });
        
        // Trigger parent refresh
        if (onAccepted) onAccepted();
      } else {
        // Handle specific error cases
        const errorConfig = getBidAcceptanceErrorMessage(result.error);
        
        console.warn('⚠️ Bid acceptance failed:', result.error);
        
        addToast({
          type: 'error',
          title: errorConfig.title,
          message: errorConfig.message,
          duration: 6000
        });
        
        // If driver is unavailable, remove the offer from display
        if (result.error === 'driver_unavailable') {
          setOffers(prev => prev.filter(o => o.id !== offer.id));
          
          // Show brief message about removed offers
          setTimeout(() => {
            addToast({
              type: 'info',
              title: 'Offer Removed',
              message: 'Some offers are no longer available',
              duration: 3000
            });
          }, 500);
        }
        
        // If action is to refresh offers, reload them
        if (errorConfig.action === 'refresh_offers') {
          setTimeout(() => {
            loadInitial();
          }, 1000);
        }
        
        setError(result.message);
      }
    } catch (e) {
      console.error('❌ Error accepting offer:', e);
      addToast({
        type: 'error',
        title: 'Error',
        message: e.message || 'Failed to accept offer. Please try again.',
        duration: 5000
      });
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

  const pendingOffers = offers.filter(o => o.offer_status === 'pending');
  const hasOffers = pendingOffers.length > 0;

  return (
    <div className="space-y-3">
      {/* Offers Section Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-bold text-gray-900">
          {hasOffers ? 'Awaiting Your Response' : 'Awaiting Offers'}
        </h4>
        {loading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-xs text-gray-500">Loading…</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Offers List - Scrollable */}
      {offers.length === 0 && !loading ? (
        <div className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-sm text-gray-600">
            No offers yet. We'll notify you as soon as a driver responds.
          </p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
          {offers.map((offer) => (
            <div 
              key={offer.id} 
              className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all ${
                offer.offer_status === 'pending' 
                  ? 'border-blue-300 bg-blue-50 shadow-sm hover:shadow-md' 
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-3xl">
                  {offer.offer_status === 'pending' ? '🚗' : '👤'}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">
                    Driver {offer.driver_id?.slice?.(0, 8) || offer.driver_id}
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    ${Number(offer.quoted_price || 0).toFixed(2)}
                  </div>
                  {offer.message && (
                    <div className="text-xs text-gray-600 mt-1 italic">
                      "{offer.message}"
                    </div>
                  )}
                  {offer.offer_status !== 'pending' && (
                    <div className="text-xs text-gray-500 mt-1 font-medium">
                      Status: {offer.offer_status}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Offered {new Date(offer.offered_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => acceptOffer(offer)}
                  disabled={acceptingId === offer.id || offer.offer_status !== 'pending'}
                  className="min-w-[100px]"
                >
                  {acceptingId === offer.id ? 'Accepting…' : '✓ Accept'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => rejectOffer(offer)}
                  disabled={rejectingId === offer.id || offer.offer_status !== 'pending'}
                  className="min-w-[100px]"
                >
                  {rejectingId === offer.id ? 'Rejecting…' : '✗ Reject'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      {hasOffers && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 text-center">
            <span className="font-semibold">{pendingOffers.length}</span> driver{pendingOffers.length !== 1 ? 's' : ''} waiting for your response
          </p>
        </div>
      )}
    </div>
  );
};

export default PassengerOffersPanel;
