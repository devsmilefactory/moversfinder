import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/ToastProvider';

/**
 * Offers Notification Banner
 * Displays a notification when driver offers are received
 * Updates in real-time as offers come in
 * Also triggers global toast notifications
 */
const OffersNotificationBanner = ({ rideId }) => {
  const { addToast } = useToast();
  const [offerCount, setOfferCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const previousCountRef = useRef(0);

  useEffect(() => {
    if (!rideId) return;

    const loadOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('ride_offers')
          .select('id, offer_status')
          .eq('ride_id', rideId)
          .eq('offer_status', 'pending');

        if (error) throw error;
        
        const newCount = data?.length || 0;
        
        // Show toast notification when new offers arrive
        if (!loading && newCount > previousCountRef.current) {
          const newOffersCount = newCount - previousCountRef.current;
          addToast({
            type: 'success',
            title: '🎉 New Driver Offer!',
            message: `${newOffersCount} new ${newOffersCount === 1 ? 'offer' : 'offers'} received. Tap to view details.`,
            duration: 8000,
            onClick: () => {
              // Scroll to offers section
              const offersSection = document.querySelector('[data-offers-section]');
              if (offersSection) {
                offersSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            },
            style: {
              cursor: 'pointer'
            }
          });
        }
        
        previousCountRef.current = newCount;
        setOfferCount(newCount);
      } catch (error) {
        console.error('Error loading offers count:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOffers();

    // Real-time subscription for offer updates
    const channel = supabase
      .channel(`offers-notification-${rideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_offers',
          filter: `ride_id=eq.${rideId}`
        },
        () => {
          loadOffers();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [rideId, loading, addToast]);

  if (loading || offerCount === 0) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 shadow-md">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-yellow-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-bold text-yellow-800">
            🎉 {offerCount} {offerCount === 1 ? 'Driver Offer' : 'Driver Offers'} Received!
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Scroll down to view and accept {offerCount === 1 ? 'the offer' : 'offers'}
          </p>
        </div>
        <div className="ml-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
            {offerCount} New
          </span>
        </div>
      </div>
    </div>
  );
};

export default OffersNotificationBanner;
