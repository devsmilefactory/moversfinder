import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Clock, DollarSign, Star, Check, XCircle, MapPin, ClipboardList, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { acceptOfferAtomic, rejectOffer } from '../../../utils/offers';
import Button from '../../shared/Button';
import RatingModal from './RatingModal';
import { parseErrandTasks, describeTaskState } from '../../../utils/errandTasks';
import { isErrandService, normalizeServiceType } from '../../../utils/serviceTypes';
import ErrandTaskList from '../../../components/cards/ErrandTaskList';

/**
 * Ride Details Modal
 *
 * Shows detailed information about a ride including:
 * - Ride details (pickup, dropoff, service type, etc.)
 * - Live count of pending driver offers
 * - Timeline of all driver offers with details
 * - Ability to accept or reject each offer
 * - Rating functionality for completed rides
 */
const RideDetailsModal = ({ isOpen, onClose, ride, onAccepted, autoOpenRating = false }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingOfferId, setProcessingOfferId] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Auto-open rating modal when requested and ride is completed without rating
  useEffect(() => {
    if (isOpen && autoOpenRating && ride?.ride_status === 'trip_completed' && !ride?.rating) {
      setShowRatingModal(true);
    }
  }, [isOpen, autoOpenRating, ride?.id, ride?.ride_status, ride?.rating]);

  // Load offers when modal opens
  useEffect(() => {
    if (isOpen && ride?.id) {
      loadOffers();
      
      // Set up real-time subscription for new offers
      const channel = supabase
        .channel(`ride-offers-${ride.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ride_offers',
            filter: `ride_id=eq.${ride.id}`
          },
          (payload) => {
            console.log('Offer update:', payload);
            loadOffers();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [isOpen, ride?.id]);

  const loadOffers = async () => {
    if (!ride?.id) return;

    setLoading(true);
    try {
      // First, get the offers
      const { data: offersData, error: offersError } = await supabase
        .from('ride_offers')
        .select('*')
        .eq('ride_id', ride.id)
        .order('offered_at', { ascending: false });

      if (offersError) throw offersError;

      if (!offersData || offersData.length === 0) {
        setOffers([]);
        setLoading(false);
        return;
      }

      // Get driver IDs from offers
      const driverIds = offersData.map(offer => offer.driver_id);

      // Get driver profiles for these driver IDs
      const { data: driverProfiles, error: profilesError } = await supabase
        .from('driver_profiles')
        .select('id, user_id, full_name, vehicle_make, vehicle_model, vehicle_color, license_plate')
        .in('user_id', driverIds);

      if (profilesError) {
        console.error('Error loading driver profiles:', profilesError);
      }

      // Get driver stats from completed rides
      const { data: driverStats, error: statsError } = await supabase
        .from('rides')
        .select('driver_id, rating')
        .in('driver_id', driverIds)
        .eq('ride_status', 'trip_completed')
        .not('rating', 'is', null);

      if (statsError) {
        console.error('Error loading driver stats:', statsError);
      }

      // Calculate average rating and total rides for each driver
      const statsMap = {};
      if (driverStats) {
        driverStats.forEach(ride => {
          if (!statsMap[ride.driver_id]) {
            statsMap[ride.driver_id] = { ratings: [], totalRides: 0 };
          }
          statsMap[ride.driver_id].ratings.push(ride.rating);
          statsMap[ride.driver_id].totalRides++;
        });
      }

      // Create a map of driver profiles by user_id
      const profilesMap = {};
      if (driverProfiles) {
        driverProfiles.forEach(profile => {
          profilesMap[profile.user_id] = profile;
        });
      }

      // Enrich offers with driver data
      const enrichedOffers = offersData.map(offer => {
        const driverProfile = profilesMap[offer.driver_id] || {};
        const driverStat = statsMap[offer.driver_id];

        // Default rating is 4.9 if no ratings exist
        const calculatedRating = driverStat && driverStat.ratings.length > 0
          ? driverStat.ratings.reduce((a, b) => a + b, 0) / driverStat.ratings.length
          : 4.9;

        return {
          ...offer,
          driver: {
            ...driverProfile,
            full_name: driverProfile.full_name || `Driver ${offer.driver_id?.slice(0, 8)}`,
            rating: calculatedRating,
            total_rides: driverStat ? driverStat.totalRides : 0
          }
        };
      });

      setOffers(enrichedOffers);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId) => {
    setProcessingOfferId(offerId);
    try {
      // Use the atomic accept offer function from utils
      const result = await acceptOfferAtomic(offerId, ride.id);

      if (result.success) {
        alert('✅ Driver offer accepted! The driver will arrive shortly.');
        try { if (typeof onAccepted === 'function') onAccepted(); } catch {}
        onClose();
      } else {
        throw new Error(result.error || 'Failed to accept offer');
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      alert(`❌ Failed to accept offer: ${error.message}`);
    } finally {
      setProcessingOfferId(null);
    }
  };

  const handleRejectOffer = async (offerId) => {
    setProcessingOfferId(offerId);
    try {
      // Use the reject offer function from utils
      const result = await rejectOffer(offerId);

      if (result.success) {
        alert('Offer rejected');
        loadOffers();
      } else {
        throw new Error(result.error || 'Failed to reject offer');
      }
    } catch (error) {
      console.error('Error rejecting offer:', error);
      alert(`❌ Failed to reject offer: ${error.message}`);
    } finally {
      setProcessingOfferId(null);
    }
  };

  const handleCancelRide = async () => {
    if (!window.confirm('Are you sure you want to cancel this ride? This action cannot be undone.')) return;
    
    setIsCancelling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data, error } = await supabase.rpc('transition_ride_status', {
        p_ride_id: ride.id,
        p_new_state: 'CANCELLED',
        p_actor_type: 'PASSENGER',
        p_actor_id: user.id
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to cancel ride');
      
      alert('Ride cancelled successfully');
      onClose();
    } catch (error) {
      console.error('Error cancelling ride:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      driver_assigned: { color: 'bg-blue-100 text-blue-800', text: 'Driver Assigned' },
      in_progress: { color: 'bg-green-100 text-green-800', text: 'In Progress' },
      completed: { color: 'bg-gray-100 text-gray-800', text: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    };
    
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getOfferStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      accepted: { color: 'bg-green-100 text-green-800', text: 'Accepted' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' }
    };
    
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (!isOpen || !ride) return null;

  const pendingOffers = offers.filter(o => o.offer_status === 'pending');
  const serviceType = normalizeServiceType(ride.service_type || 'taxi');
  const isErrand = isErrandService(ride.service_type) || serviceType === 'errand';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Ride Details</h2>
              <p className="text-sm text-slate-600 mt-1">
                {pendingOffers.length} pending offer{pendingOffers.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Ride Information */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">
                {ride.service_type?.replace('_', ' ').toUpperCase() || 'RIDE'}
              </h3>
              {getStatusBadge(ride.ride_status || ride.status)}
            </div>
            
            <div className="space-y-2 text-sm">
              {!isErrand ? (
                <>
                  <div>
                    <span className="text-slate-600">📍 Pickup:</span>
                    <span className="ml-2 text-slate-800">{ride.pickup_address || ride.pickup_location}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">🎯 Dropoff:</span>
                    <span className="ml-2 text-slate-800">{ride.dropoff_address || ride.dropoff_location}</span>
                  </div>
                </>
              ) : (
                <div className="mt-2">
                  <ErrandTaskList
                    tasks={ride.errand_tasks}
                    compact={false}
                    showStatus={true}
                    showCosts={true}
                  />
                </div>
              )}
              {ride.distance_km && (
                <div>
                  <span className="text-slate-600">📏 Distance:</span>
                  <span className="ml-2 text-slate-800">{ride.distance_km} km</span>
                </div>
              )}
              {ride.estimated_cost && (
                <div>
                  <span className="text-slate-600">💰 Estimated Cost:</span>
                  <span className="ml-2 text-green-600 font-semibold">${(parseFloat(ride.estimated_cost) || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Driver Offers */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">
              Driver Offers ({offers.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading offers...</div>
            ) : offers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No offers yet</p>
                <p className="text-sm mt-2">Drivers will be notified about your ride request</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className={`border rounded-lg p-4 ${
                      offer.offer_status === 'accepted' 
                        ? 'border-green-300 bg-green-50' 
                        : offer.offer_status === 'rejected'
                        ? 'border-red-200 bg-red-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {offer.driver?.full_name}
                          </p>
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{offer.driver?.rating?.toFixed(1) || '4.9'}</span>
                            <span className="text-slate-400">
                              ({offer.driver?.total_rides || 0} rides)
                            </span>
                          </div>
                        </div>
                      </div>
                      {getOfferStatusBadge(offer.offer_status)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-slate-600">Price:</span>
                        <span className="font-semibold text-green-600">
                          ${parseFloat(offer.quoted_price).toFixed(2)}
                        </span>
                      </div>
                      {offer.estimated_arrival_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-slate-600">ETA:</span>
                          <span className="font-semibold text-blue-600">
                            {offer.estimated_arrival_time} min
                          </span>
                        </div>
                      )}
                    </div>

                    {offer.message && (
                      <p className="text-sm text-slate-600 mb-3 italic">"{offer.message}"</p>
                    )}

                    {offer.offer_status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          onClick={() => handleAcceptOffer(offer.id)}
                          disabled={processingOfferId === offer.id}
                          className="flex-1 flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRejectOffer(offer.id)}
                          disabled={processingOfferId === offer.id}
                          className="flex-1 flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex flex-col gap-2">
          {ride?.ride_status === 'trip_completed' && !ride?.rating && (
            <Button
              variant="primary"
              onClick={() => setShowRatingModal(true)}
              className="w-full"
            >
              <Star className="w-4 h-4 mr-2" />
              Rate This Ride
            </Button>
          )}
          
          {/* Passenger Cancel CTA */}
          {!['trip_completed', 'completed', 'cancelled'].includes(ride?.ride_status || ride?.status) && (
            <Button
              variant="outline"
              onClick={handleCancelRide}
              disabled={isCancelling}
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isCancelling ? 'Cancelling...' : 'Cancel Ride'}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          onClose(); // Close parent modal too after rating
        }}
        ride={ride}
      />
    </div>
  );
};

export default RideDetailsModal;

