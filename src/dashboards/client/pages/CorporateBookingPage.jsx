import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from '../../../components/maps/MapView';
import CorporateBookingFlowSimplified from '../components/CorporateBookingFlowSimplified';
import useAuthStore from '../../../stores/authStore';
import useRidesStore from '../../../stores/ridesStore';
import useProfileStore from '../../../stores/profileStore';
import CorporatePWALayout from '../../../components/layouts/CorporatePWALayout';
import CorporateProfileForm from '../../../components/auth/CorporateProfileForm';

import ComingSoon from '../../../components/common/ComingSoon';
import { isComingSoon } from '../../../config/profileAvailability';
import { detectCurrentLocationWithCity } from '../../../utils/locationServices';

/**
 * Corporate Booking Page - PWA Style
 *
 * Features:
 * - Full-screen map view showing office location
 * - Bottom navigation tabs for booking types (Single, Bulk, Courier, Scheduled)
 * - Floating booking panel that slides up when type is selected
 * - Real-time stats and availability
 * - PWA-optimized design for mobile

 */

const CorporateBookingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getAvailableDriversCount } = useRidesStore();
  const { getProfileStatus, loadAvailableProfiles, activeProfileType } = useProfileStore();

  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [selectedBookingType, setSelectedBookingType] = useState('single');
  const [showProfileForm, setShowProfileForm] = useState(false);

  // CRITICAL FIX: Redirect if activeProfileType doesn't match this page
  // Phased rollout: Corporate is Coming Soon
  if (isComingSoon('corporate')) {
    return (
      <CorporatePWALayout title="Corporate Coming Soon">
        <ComingSoon profileType="corporate" />
      </CorporatePWALayout>
    );
  }

  // This ensures seamless profile switching
  useEffect(() => {
    if (!activeProfileType) return;

    // This page is for corporate profile only
    if (activeProfileType !== 'corporate') {
      console.log(`CorporateBookingPage: activeProfileType is ${activeProfileType}, redirecting...`);

      // Navigate to the appropriate page for the active profile
      const routes = {
        individual: '/user/book-ride',
        driver: '/driver/rides',
        operator: '/operator/dashboard'
      };

      const targetRoute = routes[activeProfileType];
      if (targetRoute) {
        navigate(targetRoute, { replace: true });
      }
    }
  }, [activeProfileType, navigate]);

  // Check if corporate profile exists
  useEffect(() => {
    const profileStatus = getProfileStatus('corporate');
    if (profileStatus.status === 'not_created') {
      setShowProfileForm(true);
    }
  }, [getProfileStatus]);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [detectedAddress, setDetectedAddress] = useState(null);
  const [detectedCity, setDetectedCity] = useState(null);

  // Get current location on mount using universal location detection utility
  useEffect(() => {
    let isMounted = true;

    const waitForGoogleMaps = async () => {
      // Wait for Google Maps to load (max 10 seconds)
      const maxWait = 10000;
      const startTime = Date.now();

      while (!window.google?.maps?.Geocoder && Date.now() - startTime < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return !!window.google?.maps?.Geocoder;
    };

    const detectLocation = async () => {
      try {
        // Wait for Google Maps to load
        const mapsLoaded = await waitForGoogleMaps();

        if (!mapsLoaded) {
          throw new Error('Google Maps failed to load');
        }

        if (!isMounted) return;

        // Use universal location detection utility
        const location = await detectCurrentLocationWithCity({
          timeout: 15000
        });

        if (!isMounted) return;

        console.log('📍 Corporate location detected:', {
          city: location.city,
          country: location.country,
          address: location.address,
          coords: location.coords
        });

        setCurrentLocation(location.coords);
        setDetectedAddress(location.address);
        setDetectedCity(location.city);
      } catch (error) {
        if (!isMounted) return;
        console.error('❌ Corporate location detection error:', error.message || error);
        setDetectedAddress('Current location');
      }
    };

    detectLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const bookingTypes = [
    {
      id: 'single',
      name: 'Single',
      icon: '🚕',
      description: 'One ride'
    },
    {
      id: 'bulk',
      name: 'Bulk',
      icon: '🚐',
      description: 'Multiple rides'
    },
    {
      id: 'courier',
      name: 'Courier',
      icon: '📦',
      description: 'Deliveries'
    },
    {
      id: 'scheduled',
      name: 'Scheduled',
      icon: '📅',
      description: 'Future trips'
    }
  ];

  const handleBookingTypeSelect = (typeId) => {
    setSelectedBookingType(typeId);
  };

  const handleBookNow = () => {
    setShowBookingFlow(true);
  };

  const handleBack = () => {
    setShowBookingFlow(false);
  };

  const handleProfileComplete = async () => {
    // Reload profile data from database
    if (user?.id) {
      await loadAvailableProfiles(user.id);
    }

    // Hide profile form and show booking page
    setShowProfileForm(false);

    // Navigate to corporate booking page (this page will re-render with profile loaded)
    // No need to reload the entire page
  };

  // Show profile form if corporate profile doesn't exist
  if (showProfileForm) {
    return (
      <CorporatePWALayout title="Complete Your Profile">
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Corporate Mode!</h2>
              <p className="text-slate-600 mb-4">
                Please complete your corporate profile to start booking rides for your business.
              </p>
            </div>
            <CorporateProfileForm onComplete={handleProfileComplete} canDismiss={false} />
          </div>
        </div>
      </CorporatePWALayout>
    );
  }

  if (showBookingFlow) {
    return (
      <CorporatePWALayout title="New Booking">
        <div className="p-6">
          <CorporateBookingFlowSimplified
            onBack={handleBack}
            initialLocation={detectedAddress ? {
              address: detectedAddress,
              coordinates: currentLocation
            } : null}
          />
        </div>
      </CorporatePWALayout>
    );
  }

  return (
    <CorporatePWALayout title="Corporate Bookings">
      <div className="fixed inset-0 top-[60px] flex flex-col">
        {/* Map View - Takes available space */}
        <div className="flex-1 relative">
          <MapView
            center={currentLocation}
            zoom={14}
            height="100%"
            showCurrentLocation={true}
            markers={[
              {
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                label: 'Office',
                icon: {
                  path: window.google?.maps?.SymbolPath?.CIRCLE,
                  scale: 10,
                  fillColor: '#3B82F6',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3
                }
              }
            ]}
          />

          {/* Floating Book Now Button */}
          <div className="absolute bottom-4 left-0 right-0 z-10 px-4">
            <button
              onClick={handleBookNow}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-800 font-bold py-4 px-6 rounded-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">{bookingTypes.find(t => t.id === selectedBookingType)?.icon}</span>
                <span className="text-lg">Book {bookingTypes.find(t => t.id === selectedBookingType)?.name} Ride</span>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom Navigation Tabs - Fixed at bottom */}
        <div className="bg-white border-t border-slate-200 shadow-lg flex-shrink-0">
          <div className="grid grid-cols-4 gap-0">
            {bookingTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleBookingTypeSelect(type.id)}
                className={`flex flex-col items-center justify-center py-3 px-2 transition-all ${
                  selectedBookingType === type.id
                    ? 'bg-yellow-50 border-t-4 border-yellow-400'
                    : 'bg-white border-t-4 border-transparent hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl mb-1">{type.icon}</span>
                <span className={`text-xs font-medium ${
                  selectedBookingType === type.id
                    ? 'text-yellow-600'
                    : 'text-slate-600'
                }`}>
                  {type.name}
                </span>
                <span className="text-[10px] text-slate-400">{type.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </CorporatePWALayout>
  );
};

export default CorporateBookingPage;

