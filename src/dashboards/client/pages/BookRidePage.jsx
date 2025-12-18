import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MapView from '../../../components/maps/MapView';
import LocationPicker from '../../../components/maps/LocationPicker';

import UnifiedBookingModal from '../components/UnifiedBookingModal';
import PWALeftDrawer from '../../../components/layouts/PWALeftDrawer';
import RideStatusIndicator from '../../../components/passenger/RideStatusIndicator';
import useAuthStore from '../../../stores/authStore';
import useProfileStore from '../../../stores/profileStore';
import useRidesStore from '../../../stores/ridesStore';
import { supabase } from '../../../lib/supabase';

import { calculateEstimatedFareV2 } from '../../../utils/pricingCalculator';
import { detectCurrentLocationWithCity } from '../../../utils/locationServices';


/**
 * Individual Book Ride Page - PWA Style
 *
 * Features:
 * - Full-screen map view showing current location
 * - Bottom navigation tabs for services (Taxi, Courier, School Run, Errands)
 * - Floating booking panel that slides up when service is selected
 * - Real-time driver availability
 * - PWA-optimized design for mobile
 */

const BookRidePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { activeProfileType } = useProfileStore();
  const { getAvailableDriversCount } = useRidesStore();

  // Profile type display configuration


  // CRITICAL FIX: Redirect if activeProfileType doesn't match this page
  // This ensures seamless profile switching - when user switches to driver,
  // this page will detect it and navigate to the driver page
  useEffect(() => {
    if (!activeProfileType) return;

    // This page is for individual profile only
    if (activeProfileType !== 'individual') {
      console.log(`BookRidePage: activeProfileType is ${activeProfileType}, redirecting...`);

      // Navigate to the appropriate page for the active profile
      const routes = {
        corporate: '/corporate/book-ride',
        driver: '/driver/rides',
        operator: '/operator/dashboard'
      };

      const targetRoute = routes[activeProfileType];
      if (targetRoute) {
        navigate(targetRoute, { replace: true });
      }
    }
  }, [activeProfileType, navigate]);


  const [currentLocation, setCurrentLocation] = useState(null);
  const [detectedCity, setDetectedCity] = useState(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);
  const [locationDetectionFailed, setLocationDetectionFailed] = useState(false);
  const [selectedService, setSelectedService] = useState('taxi');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [showPickupPicker, setShowPickupPicker] = useState(false);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [showDropoffPicker, setShowDropoffPicker] = useState(false);
  const [routePath, setRoutePath] = useState([]);
  const [routeEstimate, setRouteEstimate] = useState(null);


  // Handle rebooking from past ride
  const routerLocation = useLocation();
  useEffect(() => {
    const rebook = routerLocation.state && routerLocation.state.rebookFromRide;
    if (rebook) {
      if (rebook.pickup) setPickupLocation(rebook.pickup);
      if (rebook.dropoff) setDropoffLocation(rebook.dropoff);
      setShowBookingModal(true);
      // Clear the state to avoid re-triggering on back/forward
      navigate('/user/book-ride', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.state]);



  // Automatic location detection on mount using universal utility
  useEffect(() => {
    let timeoutId;
    let isMounted = true;

    const waitForGoogleMaps = async () => {
      const maxWait = 10000;
      const startTime = Date.now();

      while (!window.google?.maps?.importLibrary && Date.now() - startTime < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!window.google?.maps?.importLibrary) {
        return false;
      }

      try {
        if (!window.google?.maps?.Geocoder) {
          await window.google.maps.importLibrary('geocoding');
        }
        return true;
      } catch (error) {
        console.error('Failed to load Google geocoding library:', error);
        return false;
      }
    };

    const detectLocation = async () => {
      if (!isMounted) return;

      setIsDetectingLocation(true);
      setLocationDetectionFailed(false);

      // Set 20-second timeout for overall operation (including Google Maps loading)
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        console.log('⏱️ Location detection timed out');
        setIsDetectingLocation(false);
        setLocationDetectionFailed(true);
      }, 20000);

      try {
        // Wait for Google Maps to load
        const mapsLoaded = await waitForGoogleMaps();

        if (!mapsLoaded) {
          throw new Error('Google Maps failed to load');
        }

        if (!isMounted) return;

        // Use universal location detection utility with retry logic for production
        const location = await detectCurrentLocationWithCity({
          timeout: 20000, // Longer timeout for production
          geolocationOptions: {
            maxRetries: 2,
            retryDelay: 2000,
            enableHighAccuracy: true
          }
        });

        if (!isMounted) return;

        clearTimeout(timeoutId);

        console.log('📍 Location detected:', {
          city: location.city,
          country: location.country,
          address: location.address,
          coords: location.coords
        });

        // Set detected location data
        setCurrentLocation(location.coords);
        setDetectedCity(location.city);
        // Removed: no auto-setting pickupLocation

        setIsDetectingLocation(false);
        setLocationDetectionFailed(false);
      } catch (error) {
        if (!isMounted) return;
        console.error('❌ Location detection error:', error.message || error);
        console.error('❌ Full error:', error);
        clearTimeout(timeoutId);
        setIsDetectingLocation(false);
        setLocationDetectionFailed(true);
      }
    };

    detectLocation();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Compute route, distance/ETA and cost when both pickup and dropoff are set
  useEffect(() => {
    const resetRoute = () => {
      setRoutePath([]);
      setRouteEstimate(null);
    };

    if (!pickupLocation || !dropoffLocation) {
      resetRoute();
      return;
    }

    const compute = async () => {
      try {
        if (!window.google?.maps?.importLibrary) return; // maps not ready yet
        const { DirectionsService } = await window.google.maps.importLibrary('routes');
        const directionsService = new DirectionsService();

        const result = await directionsService.route({
          origin: { lat: pickupLocation.lat, lng: pickupLocation.lng },
          destination: { lat: dropoffLocation.lat, lng: dropoffLocation.lng },
          travelMode: window.google?.maps?.TravelMode?.DRIVING || 'DRIVING'
        });

        const route = result?.routes?.[0];
        const leg = route?.legs?.[0];

        // Build polyline path
        let path = [];
        if (route?.overview_path?.length) {
          path = route.overview_path.map(ll => ({ lat: ll.lat(), lng: ll.lng() }));
        } else if (leg?.steps?.length) {
          path = leg.steps.flatMap(s => (s.path || []).map(ll => ({ lat: ll.lat(), lng: ll.lng() })));
        }

        const distanceMeters = leg?.distance?.value ?? 0;
        const distanceKm = distanceMeters / 1000;
        const durationSeconds = leg?.duration?.value ?? 0;
        const durationMinutes = Math.round(durationSeconds / 60);

        const costVal = await calculateEstimatedFareV2({ distanceKm });
        const costRounded = typeof costVal === 'number' ? Number(costVal.toFixed(2)) : 0;

        setRoutePath(path);
        setRouteEstimate({
          distanceKm,
          durationMinutes,
          distanceText: leg?.distance?.text,
          durationText: leg?.duration?.text,
          cost: costRounded
        });
      } catch (e) {
        console.error('Error calculating route:', e);
        setRoutePath([]);
        setRouteEstimate(null);
      }
    };

    compute();
  }, [pickupLocation, dropoffLocation]);


  const openPickupPicker = () => setShowPickupPicker(true);
  const handleConfirmPickup = (loc) => {
    setPickupLocation(loc);
    setShowPickupPicker(false);
    setCurrentLocation({ lat: loc.lat, lng: loc.lng });
  };

  const openDropoffPicker = () => setShowDropoffPicker(true);
  const handleConfirmDropoff = (loc) => {
    setDropoffLocation(loc);
    setShowDropoffPicker(false);
    setCurrentLocation({ lat: loc.lat, lng: loc.lng });
  };

  const services = [
    { id: 'taxi', name: 'Taxi', icon: '🚕', color: 'yellow' },
    { id: 'courier', name: 'Courier', icon: '📦', color: 'blue' },
    { id: 'school_run', name: 'School/Work', icon: '🎒', color: 'green' },
    { id: 'errands', name: 'Errands', icon: '🛍️', color: 'purple' },
    { id: 'bulk', name: 'Bulk', icon: '👥', color: 'teal' }
  ];

  const handleServiceSelect = (serviceId) => {
    setSelectedService(serviceId);
  };

  const handleBookNow = () => {
    // Removed: no auto-defaulting pickup from current GPS
    setShowBookingModal(true);
  };



  return (
    <>
      {/* Full-screen PWA interface */}
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-50">
        {/* Map View - Takes full screen */}
        <div className="flex-1 relative">
          <MapView
            center={currentLocation}
            zoom={14}
            height="100%"
            showCurrentLocation={true}
            markers={[
              ...(currentLocation ? [{
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                label: 'You',
                icon: window.google?.maps?.SymbolPath?.CIRCLE ? {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3
                } : undefined
              }] : []),
              ...(pickupLocation ? [{
                lat: pickupLocation.lat,
                lng: pickupLocation.lng,
                label: 'Pickup',
                icon: window.google?.maps?.SymbolPath?.CIRCLE ? {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#FFC107',
                  fillOpacity: 1,
                  strokeColor: '#334155',

                  strokeWeight: 2
                } : undefined
              }] : []),
              ...(dropoffLocation ? [{
                lat: dropoffLocation.lat,
                lng: dropoffLocation.lng,
                label: 'Dropoff',
                icon: window.google?.maps?.SymbolPath?.CIRCLE ? {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#22C55E',
                  fillOpacity: 1,
                  strokeColor: '#334155',
                  strokeWeight: 2
                } : undefined
              }] : [])
            ]}
            routePath={routePath}
            routePolylineOptions={{ strokeColor: '#F59E0B', strokeOpacity: 0.85, strokeWeight: 6 }}
            fitBoundsToRoute={true}
          />

          {/* Subtle overlay for improved contrast */}
          <div className="absolute inset-0 pointer-events-none bg-slate-900/10 mix-blend-multiply" />


          {/* Route summary card */}
          {routeEstimate && (
            <div className="absolute bottom-72 left-0 right-0 z-10 px-4">
              <div className="bg-white rounded-xl shadow-xl p-3">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <div>
                    <div className="text-xs text-slate-500">Distance</div>
                    <div className="font-semibold">{routeEstimate.distanceText || `${routeEstimate.distanceKm.toFixed(1)} km`}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">ETA</div>
                    <div className="font-semibold">{routeEstimate.durationText || `${routeEstimate.durationMinutes} min`}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Est. Cost</div>
                    <div className="font-bold text-green-600">${routeEstimate.cost.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hamburger Menu Button - Top Left */}
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={() => setShowMenu(true)}
              className="bg-white rounded-full shadow-xl p-3 hover:bg-slate-50 transition-all transform hover:scale-105"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Ride Status Indicator - Top Right */}
          <div className="absolute top-4 right-4 z-20">
            <div className="bg-white rounded-full shadow-xl hover:bg-slate-50 transition-all transform hover:scale-105">
              <RideStatusIndicator userId={user?.id} />
            </div>
          </div>

          {/* Location Detection Status Banner */}
          {isDetectingLocation && (
            <div className="absolute top-4 left-20 right-20 z-10">
              <div className="bg-blue-500 text-white rounded-xl shadow-lg p-4 flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <p className="text-sm font-medium">Detecting your location...</p>
              </div>
            </div>
          )}

          {/* Location Detection Failed Banner */}
          {locationDetectionFailed && !isDetectingLocation && (
            <div className="absolute top-4 left-20 right-20 z-10">
              <div className="bg-yellow-500 text-slate-900 rounded-xl shadow-lg p-4">
                <p className="text-sm font-medium mb-2">📍 Unable to detect location</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs bg-white px-3 py-1 rounded-lg font-medium hover:bg-slate-100"
                >
                  Retry Location Detection
                </button>
              </div>
            </div>
          )}

          {/* Top Info Bar */}
          {!isDetectingLocation && !locationDetectionFailed && (
            <div className="absolute top-4 left-20 right-20 z-10">
              <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Service Area</p>
                  <p className="text-lg font-bold text-slate-700">{detectedCity || 'Detecting...'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Drivers</p>
                  <p className="text-lg font-bold text-green-600">{getAvailableDriversCount()} online</p>
                </div>
              </div>
            </div>
          )}

          {/* Floating Book Now Button */}
          <div className="absolute bottom-24 left-0 right-0 z-10 px-4">
            <button
              onClick={handleBookNow}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-800 font-bold py-4 px-6 rounded-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
            >

              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">{services.find(s => s.id === selectedService)?.icon}</span>
                <span className="text-lg">
                  {selectedService === 'school_run'
                    ? 'Book School/Work Run'
                    : selectedService === 'bulk'
                    ? 'Book Bulk'
                    : `Book ${services.find(s => s.id === selectedService)?.name} Now`}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom Navigation Tabs - Fixed at bottom */}
        <div className="bg-white border-t border-slate-200 shadow-lg">
          <div className="grid grid-cols-5 gap-0">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => handleServiceSelect(service.id)}
                className={`flex flex-col items-center justify-center py-3 px-2 transition-all ${
                  selectedService === service.id
                    ? 'bg-yellow-50 border-t-4 border-yellow-400'
                    : 'bg-white border-t-4 border-transparent hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl mb-1">{service.icon}</span>
                <span className={`text-xs font-medium ${
                  selectedService === service.id
                    ? 'text-yellow-600'
                    : 'text-slate-600'
                }`}>
                  {service.name}
                </span>
              </button>


            ))}
          </div>
        </div>
      </div>

      {/* Unified Booking Modal */}
      <UnifiedBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        defaultServiceType={selectedService}
        savedTrips={[]}
        mode="create"
        initialData={null}
        estimate={routeEstimate ? { distanceKm: routeEstimate.distanceKm, durationMinutes: routeEstimate.durationMinutes, cost: routeEstimate.cost } : null}
        onSuccess={(data) => {
          // Navigate to rides page after successful booking
          console.log('Booking successful:', data);
          navigate('/user/rides');
        }}
      />


      {/* Pickup Picker Overlay */}
      {showPickupPicker && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPickupPicker(false)} />
          <div className="absolute bottom-0 left-0 right-0 h-[85vh] p-4">
            <div className="bg-white rounded-t-2xl shadow-2xl h-full flex flex-col overflow-hidden">
              <LocationPicker
                initialLocation={{
                  lat: pickupLocation?.lat ?? currentLocation.lat,
                  lng: pickupLocation?.lng ?? currentLocation.lng,
                  address: pickupLocation?.address ?? 'Set pickup location'
                }}
                onConfirm={handleConfirmPickup}
                onCancel={() => setShowPickupPicker(false)}
                showHeader={true}
                title="Select Pickup Location"
                height="100%"
              />
            </div>
          </div>
        </div>
      )}

      {/* Dropoff Picker Overlay */}
      {showDropoffPicker && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDropoffPicker(false)} />
          <div className="absolute bottom-0 left-0 right-0 h-[85vh] p-4">
            <div className="bg-white rounded-t-2xl shadow-2xl h-full flex flex-col overflow-hidden">
              <LocationPicker
                initialLocation={dropoffLocation || (currentLocation ? {
                  lat: currentLocation.lat,
                  lng: currentLocation.lng,
                  address: 'Set dropoff location'
                } : null)}
                onConfirm={handleConfirmDropoff}
                onCancel={() => setShowDropoffPicker(false)}
                showHeader={true}
                title="Select Dropoff Location"
                height="100%"
              />
            </div>
          </div>
        </div>
      )}

      {/* Unified Left Drawer */}
      <PWALeftDrawer open={showMenu} onClose={() => setShowMenu(false)} profileType={activeProfileType} />
    </>
  );
};

export default BookRidePage;

