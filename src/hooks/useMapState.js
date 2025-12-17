import { useState, useEffect, useRef } from 'react';
import { getCurrentLocation } from '../utils/locationServices';

/**
 * useMapState Hook
 * 
 * Manages Google Maps state and initialization
 */
const useMapState = ({ center, zoom = 13, showCurrentLocation = true }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  // Load Google Maps Script using Dynamic Library Import
  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        // Check if API key is configured
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          setLoadError(new Error('Google Maps API key is not configured'));
          return;
        }

        // Check if already loaded
        if (window.google?.maps?.importLibrary) {
          setIsLoaded(true);
          return;
        }

        // Listen for Google Maps authentication errors
        window.gm_authFailure = () => {
          setLoadError(new Error('Google Maps API authentication failed. The API key may be invalid or restricted.'));
        };

        // Load the bootstrap loader inline
        const script = document.createElement('script');
        script.innerHTML = `
          (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
            key: "${apiKey}",
            v: "weekly"
          });
        `;
        document.head.appendChild(script);

        // Wait for the loader to be available
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds
        while (!window.google?.maps?.importLibrary && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.google?.maps?.importLibrary) {
          throw new Error('Google Maps failed to load. Please check your API key configuration.');
        }

        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setLoadError(error);
      }
    };

    loadGoogleMaps();
  }, []);

  // Get current location
  useEffect(() => {
    if (showCurrentLocation) {
      getCurrentLocation()
        .then(location => {
          setCurrentLocation(location);
        })
        .catch(error => {
          console.warn('Could not get current location:', error);
        });
    }
  }, [showCurrentLocation]);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const initMap = async () => {
      try {
        const { Map } = await google.maps.importLibrary('maps');
        const container = mapRef.current;

        if (!container) return;

        // Determine map center
        const mapCenterCandidate = center || currentLocation;
        const mapCenter = mapCenterCandidate ? coerceLatLng(mapCenterCandidate) : null;
        
        if (!mapCenter) {
          console.log('Waiting for location to initialize map...');
          return;
        }

        const map = new Map(container, {
          center: mapCenter,
          zoom,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
        });

        mapInstanceRef.current = map;
      } catch (error) {
        console.error('Error initializing map:', error);
        setLoadError(error);
      }
    };

    initMap();
  }, [isLoaded, center, currentLocation, zoom]);

  // Helper function to coerce coordinates
  const coerceLatLng = (coords) => {
    if (!coords) return null;
    
    return {
      lat: typeof coords.lat === 'number' ? coords.lat : parseFloat(coords.lat),
      lng: typeof coords.lng === 'number' ? coords.lng : parseFloat(coords.lng)
    };
  };

  return {
    mapRef,
    mapInstance: mapInstanceRef.current,
    isLoaded,
    loadError,
    currentLocation,
    setCurrentLocation
  };
};

export default useMapState;