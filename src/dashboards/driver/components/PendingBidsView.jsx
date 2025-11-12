import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';
import Button from '../../../components/ui/Button';
import ConfirmationModal from '../../../components/modals/ConfirmationModal';
import MapView from '../../../components/maps/MapView';
import { useToast } from '../../../components/ui/ToastProvider';

/**
 * PendingBidsView - Shows driver's bids waiting for passenger acceptance
 *
 * Displays ride_offers where:
 * - driver_id = current driver
 * - offer_status = 'pending'
 *
 * Real-time updates when:
 * - Passenger accepts bid → offer_status = 'accepted', ride moves to Active
 * - Passenger accepts another driver → offer_status = 'rejected', notification shown
 * - Passenger cancels ride → ride_status = 'cancelled'
 */
const PendingBidsView = ({ onBidUpdate }) => {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [pendingBids, setPendingBids] = useState([]);
  const [selectedBid, setSelectedBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [withdrawOfferId, setWithdrawOfferId] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadPendingBids();
      setupRealtimeSubscription();
    }
  }, [user?.id]);

  const loadPendingBids = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ride_offers')
        .select(`
          *,
          ride:rides(*)
        `)
        .eq('driver_id', user.id)
        .eq('offer_status', 'pending')
        .order('offered_at', { ascending: false });

      if (error) throw error;

      // Convert GeoJSON coordinates to {lat, lng} format
      const bidsWithConvertedCoords = data?.map(bid => {
        if (!bid.ride) return bid;

        let pickupCoords = null;
        let dropoffCoords = null;

        // Convert pickup coordinates
        if (bid.ride.pickup_coordinates) {
          if (bid.ride.pickup_coordinates.type === 'Point') {
            const [lng, lat] = bid.ride.pickup_coordinates.coordinates;
            pickupCoords = { lat, lng };
          } else if (bid.ride.pickup_coordinates.lat && bid.ride.pickup_coordinates.lng) {
            pickupCoords = bid.ride.pickup_coordinates;
          }
        }

        // Convert dropoff coordinates
        if (bid.ride.dropoff_coordinates) {
          if (bid.ride.dropoff_coordinates.type === 'Point') {
            const [lng, lat] = bid.ride.dropoff_coordinates.coordinates;
            dropoffCoords = { lat, lng };
          } else if (bid.ride.dropoff_coordinates.lat && bid.ride.dropoff_coordinates.lng) {
            dropoffCoords = bid.ride.dropoff_coordinates;
          }
        }

        return {
          ...bid,
          ride: {
            ...bid.ride,
            pickup_coordinates: pickupCoords,
            dropoff_coordinates: dropoffCoords
          }
        };
      }) || [];

      setPendingBids(bidsWithConvertedCoords);
      if (bidsWithConvertedCoords && bidsWithConvertedCoords.length > 0 && !selectedBid) {
        setSelectedBid(bidsWithConvertedCoords[0]);
      }
    } catch (error) {
      console.error('Error loading pending bids:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel(`driver-pending-bids-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_offers',
          filter: `driver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Bid update:', payload);

          if (payload.new.offer_status === 'accepted') {
            try { if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]); } catch {}
            addToast({ type: 'success', title: '🎉 Offer Accepted!', message: 'Your offer was accepted! Check Active Rides to start the trip.', duration: 10000 });
            loadPendingBids();
            if (onBidUpdate) onBidUpdate();
          } else if (payload.new.offer_status === 'rejected') {
            try { if ('vibrate' in navigator) navigator.vibrate(200); } catch {}
            addToast({ type: 'info', title: 'Bid not accepted', message: 'Passenger chose another driver', duration: 6000 });
            loadPendingBids();
            if (onBidUpdate) onBidUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleWithdrawBid = async (offerId) => {
    setWithdrawing(true);
    try {
      const { error } = await supabase
        .from('ride_offers')
        .update({
          offer_status: 'withdrawn',
          responded_at: new Date().toISOString()
        })
        .eq('id', offerId);

      if (error) throw error;

      addToast({ type: 'success', title: 'Bid withdrawn' });
      loadPendingBids();
      if (onBidUpdate) onBidUpdate();
    } catch (error) {
      console.error('Error withdrawing bid:', error);
      addToast({ type: 'error', title: 'Failed to withdraw bid' });
    } finally {
      setWithdrawing(false);
    }
  };

  const getServiceIcon = (serviceType) => {
    const icons = {
      taxi: '🚕',
      courier: '📦',
      school_run: '🚌',
      errands: '🛒'
    };
    return icons[serviceType] || '🚗';
  };

  const timeAgo = (dateString) => {
    if (!dateString) return '';
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bids...</p>
        </div>
      </div>
    );
  }

  if (pendingBids.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⏳</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Bids</h3>
        <p className="text-gray-600 mb-6">
          You haven't placed any bids yet. Go to Available Rides to start bidding.
        </p>
        <Button variant="outline" onClick={loadPendingBids}>
          🔄 Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          ⏳ <strong>{pendingBids.length}</strong> bid(s) waiting for passenger acceptance
        </p>
        <Button variant="outline" size="sm" onClick={loadPendingBids}>
          🔄 Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bids List */}
        <div className="lg:col-span-1 space-y-3">
          {pendingBids.map(bid => (
            <div
              key={bid.id}
              onClick={() => setSelectedBid(bid)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedBid?.id === bid.id
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getServiceIcon(bid.ride?.service_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 capitalize truncate">
                    {bid.ride?.service_type?.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    📍 {bid.ride?.pickup_address || bid.ride?.pickup_location}
                  </p>
                  <p className="text-sm font-semibold text-yellow-700 mt-2">
                    Your Bid: ${parseFloat(bid.quoted_price).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Placed {timeAgo(bid.offered_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bid Details */}
        <div className="lg:col-span-2">
          {selectedBid ? (
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getServiceIcon(selectedBid.ride?.service_type)}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 capitalize">
                        {selectedBid.ride?.service_type?.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Bid placed {timeAgo(selectedBid.offered_at)}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    ⏳ Pending
                  </div>
                </div>
              </div>

              {/* Map */}
              {selectedBid.ride?.pickup_coordinates && (
                <div className="h-64">
                  <MapView
                    center={selectedBid.ride.pickup_coordinates}
                    zoom={14}
                    markers={[
                      {
                        position: selectedBid.ride.pickup_coordinates,
                        label: 'P',
                        title: 'Pickup'
                      },
                      selectedBid.ride.dropoff_coordinates && {
                        position: selectedBid.ride.dropoff_coordinates,
                        label: 'D',
                        title: 'Dropoff'
                      }
                    ].filter(Boolean)}
                  />
                </div>
              )}

              {/* Details */}
              <div className="p-6 space-y-4">
                {/* Your Bid */}
                <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">💰 Your Bid</p>
                  <p className="text-3xl font-bold text-yellow-700">
                    ${parseFloat(selectedBid.quoted_price).toFixed(2)}
                  </p>
                  {selectedBid.message && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Your message:</strong> {selectedBid.message}
                    </p>
                  )}
                </div>

                {/* Locations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">📍 Pickup</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedBid.ride?.pickup_address || selectedBid.ride?.pickup_location}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">🎯 Dropoff</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedBid.ride?.dropoff_address || selectedBid.ride?.dropoff_location}
                    </p>
                  </div>
                </div>

                {/* Passenger Info */}
                {selectedBid.ride?.passenger_name && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">👤 Passenger</p>
                    <p className="text-sm text-gray-900">{selectedBid.ride.passenger_name}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600 mb-3">
                    ⏳ Waiting for passenger to review and accept your bid...
                  </p>
                  <Button
                    variant="danger"
                    onClick={() => { setWithdrawOfferId(selectedBid.id); setWithdrawConfirmOpen(true); }}
                    disabled={withdrawing}
                    className="w-full"
                  >
                    {withdrawing ? 'Withdrawing...' : '❌ Withdraw Bid'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Select a bid to view details</p>
            </div>
          )}
        </div>

      <ConfirmationModal
        isOpen={withdrawConfirmOpen}
        onClose={() => setWithdrawConfirmOpen(false)}
        onConfirm={() => { if (withdrawOfferId) handleWithdrawBid(withdrawOfferId); }}
        title="Withdraw your bid?"
        message={"This will remove your offer from the passenger's list. You can bid again if the ride is still open."}
        confirmText="Withdraw bid"
        cancelText="Keep bid"
        type="warning"
        confirmButtonClass="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
      />

      </div>
    </div>
  );
};

export default PendingBidsView;

