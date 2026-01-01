import React, { useState, useEffect, useRef } from 'react';
import { getCurrentLocation } from '../../utils/locationServices';

/**
 * MapView Component - Using Google Maps JavaScript API with Dynamic Library Import
 * UPDATED: Now using google.maps.importLibrary() for proper loading
 *
 * Core Google Maps component with:
 * - Centered on Bulawayo, Zimbabwe by default
 * - Zoom controls
 * - Current location button
 * - Loading skeleton
 * - Error handling
 * - Responsive design
 * - Uses AdvancedMarkerElement (new API, not deprecated)
 *
 * Props:
 * - center: { lat, lng } - Map center coordinates
 * - zoom: number - Initial zoom level (default: 13)
 * - markers: array - Array of marker objects { lat, lng, label, icon }
 * - onMapClick: function - Callback when map is clicked
 * - onMarkerClick: function - Callback when marker is clicked
 * - height: string - Map container height (default: '400px')
 * - className: string - Additional CSS classes
 */

const defaultCenter = null;

const MapView = ({
  center = defaultCenter,
  zoom = 13,
  markers = [],
  onMapClick,
  onMarkerClick,
  height = '400px',
  className = '',
  showCurrentLocation = true,
  // Draggable marker support
  draggableMarkerPosition,
  onDraggableMarkerDrag,
  onDraggableMarkerDragEnd,
  draggableMarkerIcon,
  // Route polyline support
  routePath,
  routePolylineOptions,
  fitBoundsToRoute = false,
  children
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const draggableMarkerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  const polylineRef = useRef(null);

  // Load Google Maps Script using Dynamic Library Import
  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        // Check if API key is configured
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        console.log('🗝️ MapView: Checking Google Maps API key...', {
          hasKey: !!apiKey,
          keyLength: apiKey?.length || 0,
          keyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET'
        });
        
        if (!apiKey) {
          console.warn('⚠️ Google Maps API key is not configured - map will not load, but location detection can still work');
          // Don't set error - allow the component to render without map
          // Location detection can still work via browser geolocation API
          setIsLoaded(false); // Keep isLoaded false so map doesn't try to initialize
          return;
        }
        
        console.log('✅ Google Maps API key found');

        // Check if already loaded
        if (window.google?.maps?.importLibrary) {
          console.log('✅ Google Maps already loaded');
          setIsLoaded(true);
          return;
        }
        
        console.log('📦 Loading Google Maps script...');

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
        console.log('⏳ Waiting for Google Maps to initialize...');
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds
        while (!window.google?.maps?.importLibrary && attempts < maxAttempts) {
          if (attempts % 10 === 0) {
            console.log(`⏳ Still waiting... (${attempts * 100}ms)`);
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.google?.maps?.importLibrary) {
          console.error('❌ Google Maps failed to load after 5 seconds');
          throw new Error('Google Maps failed to load. Please check your API key configuration.');
        }

        console.log('✅ Google Maps loaded successfully');
        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setLoadError(error);
      }
    };

    loadGoogleMaps();

    return () => {
      // Cleanup auth failure handler
      delete window.gm_authFailure;
    };
  }, []);

  // Initialize map using Dynamic Library Import
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      try {
        // Local ingest debug logging removed (was causing ERR_CONNECTION_REFUSED in dev)

        // Import the maps library
        const { Map } = await window.google.maps.importLibrary("maps");

        const container = mapRef.current;
        if (!(container instanceof HTMLElement)) {
          throw new Error('Map container not found or not an element');
        }

        // Use provided center (coerced), or currentLocation, or wait for geolocation
        const coerceLatLng = (c) => {
          const lat = typeof c?.lat === 'string' ? parseFloat(c.lat) : c?.lat;
          const lng = typeof c?.lng === 'string' ? parseFloat(c.lng) : c?.lng;
          return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
        };
        const mapCenterCandidate = center || currentLocation;
        const mapCenter = mapCenterCandidate ? coerceLatLng(mapCenterCandidate) : null;
        
        // Local ingest debug logging removed (was causing ERR_CONNECTION_REFUSED in dev)

        if (!mapCenter) {
          // Local ingest debug logging removed (was causing ERR_CONNECTION_REFUSED in dev)
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

        // Add click listener
        if (onMapClick) {
          map.addListener('click', onMapClick);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        setLoadError(error);
      }
    };

    initMap();
  }, [isLoaded, center, currentLocation, zoom, onMapClick]);

  // Update markers preferring native Marker (fallback to AdvancedMarkerElement)
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    const updateMarkers = async () => {
      try {
        // Try to get the classic Marker class first
        let MarkerCtor;
        try {
          const markerLib = await window.google.maps.importLibrary('marker');
          MarkerCtor = markerLib?.Marker;
        } catch (e) { /* ignore */ }
        if (!MarkerCtor) {
          try {
            const mapsLib = await window.google.maps.importLibrary('maps');
            MarkerCtor = mapsLib?.Marker;
          } catch (e2) { /* ignore */ }
        }

        // Helper to extract and coerce lat/lng from marker data
        const extractPos = (md) => {
          const p = md?.position || md;
          const lat = typeof p?.lat === 'string' ? parseFloat(p.lat) : p?.lat;
          const lng = typeof p?.lng === 'string' ? parseFloat(p.lng) : p?.lng;
          return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
        };

        // Clear existing markers
        markersRef.current.forEach(m => (m.setMap ? m.setMap(null) : (m.map = null)));
        markersRef.current = [];

        for (let index = 0; index < markers.length; index++) {
          const markerData = markers[index];
          const pos = extractPos(markerData);
          if (!pos) continue;

          if (MarkerCtor) {
            const opts = {
              position: pos,
              map: mapInstanceRef.current,
              title: markerData.label || undefined
            };
            if (markerData.icon && markerData.icon.path) {
              opts.icon = markerData.icon;
            }
            const marker = new MarkerCtor(opts);
            if (onMarkerClick) {
              marker.addListener('click', () => onMarkerClick(markerData, index));
            }
            markersRef.current.push(marker);
          } else {
            const { AdvancedMarkerElement } = await window.google.maps.importLibrary('marker');
            const adv = new AdvancedMarkerElement({
              position: pos,
              map: mapInstanceRef.current,
              title: markerData.label || ''
            });
            if (onMarkerClick) {
              adv.addListener('click', () => onMarkerClick(markerData, index));
            }
            markersRef.current.push(adv);
          }
        }
      } catch (error) {
        console.error('Error updating markers:', error);
      }
    };

    updateMarkers();
  }, [markers, isLoaded, onMarkerClick]);

  // Update current location marker using native Marker when available
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !currentLocation) return;

    let marker;

    const addCurrentLocationMarker = async () => {
      try {
        let MarkerCtor;
        try {
          const markerLib = await window.google.maps.importLibrary('marker');
          MarkerCtor = markerLib?.Marker;
        } catch (e) { /* ignore */ }
        if (!MarkerCtor) {
          try {
            const mapsLib = await window.google.maps.importLibrary('maps');
            MarkerCtor = mapsLib?.Marker;
          } catch (e2) { /* ignore */ }
        }

        if (MarkerCtor) {
          const symbolPath = window.google?.maps?.SymbolPath?.CIRCLE;
          const icon = symbolPath ? {
            path: symbolPath,
            scale: 8,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          } : undefined;

          marker = new MarkerCtor({
            position: currentLocation,
            map: mapInstanceRef.current,
            title: 'Your location',
            ...(icon ? { icon } : {})
          });
        } else {
          // Fallback to AdvancedMarkerElement
          const { AdvancedMarkerElement } = await window.google.maps.importLibrary('marker');
          marker = new AdvancedMarkerElement({
            position: currentLocation,
            map: mapInstanceRef.current,
            title: 'Your location'
          });
        }
      } catch (error) {
        console.error('Error adding current location marker:', error);
      }
    };

    addCurrentLocationMarker();

    return () => {
      if (marker) {
        if (marker.setMap) marker.setMap(null); else marker.map = null;
      }
    };
  }, [currentLocation, isLoaded]);
  // Draggable marker management (native Google Maps Marker)
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    // If no position provided, remove existing draggable marker
    if (!draggableMarkerPosition) {
      if (draggableMarkerRef.current) {
        if (draggableMarkerRef.current.setMap) {
          draggableMarkerRef.current.setMap(null);
        } else {
          draggableMarkerRef.current.map = null;
        }
        draggableMarkerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const ensureDraggableMarker = async () => {
      try {
        // Try to get the classic Marker class (supports draggable)
        let MarkerCtor = undefined;
        try {
          const markerLib = await window.google.maps.importLibrary('marker');
          MarkerCtor = markerLib?.Marker;
        } catch (e) {
          // ignore
        }
        if (!MarkerCtor) {
          try {
            const mapsLib = await window.google.maps.importLibrary('maps');
            MarkerCtor = mapsLib?.Marker;
          } catch (e2) {
            // ignore
          }
        }

        // If marker already exists, just update its position
        if (draggableMarkerRef.current && draggableMarkerRef.current.setPosition) {
          draggableMarkerRef.current.setPosition(draggableMarkerPosition);
          return;
        }

        // Remove any previous instance
        if (draggableMarkerRef.current) {
          if (draggableMarkerRef.current.setMap) {
            draggableMarkerRef.current.setMap(null);
          } else {
            draggableMarkerRef.current.map = null;
          }
          draggableMarkerRef.current = null;
        }

        if (MarkerCtor) {
          const marker = new MarkerCtor({
            map: mapInstanceRef.current,
            position: draggableMarkerPosition,
            draggable: true,
            icon: draggableMarkerIcon,
            title: 'Selected location'
          });

          if (onDraggableMarkerDrag) {
            marker.addListener('drag', () => {
              const pos = marker.getPosition();
              if (pos) onDraggableMarkerDrag({ lat: pos.lat(), lng: pos.lng() });
            });
          }
          if (onDraggableMarkerDragEnd) {
            marker.addListener('dragend', () => {
              const pos = marker.getPosition();
              if (pos) onDraggableMarkerDragEnd({ lat: pos.lat(), lng: pos.lng() });
            });
          }

          if (!cancelled) {
            draggableMarkerRef.current = marker;
          }
        } else {
          // Fallback: AdvancedMarkerElement (no native drag support)
          const { AdvancedMarkerElement } = await window.google.maps.importLibrary('marker');

          const adv = new AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position: draggableMarkerPosition,
            title: 'Selected location'
          });

          if (!cancelled) {
            // Remove old instance if any
            if (draggableMarkerRef.current) {
              draggableMarkerRef.current.map = null;
            }
            draggableMarkerRef.current = adv;
          }
        }
      } catch (err) {
        console.error('Error managing draggable marker:', err);
      }
    };

    ensureDraggableMarker();

    return () => {
      cancelled = true;
    };
  }, [draggableMarkerPosition, draggableMarkerIcon, isLoaded, onDraggableMarkerDrag, onDraggableMarkerDragEnd]);

  // Route polyline rendering
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    // Clear polyline if no route
    if (!routePath || !Array.isArray(routePath) || routePath.length === 0) {
      if (polylineRef.current) {
        try { polylineRef.current.setMap(null); } catch (e) { /* ignore */ }
        polylineRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const drawPolyline = async () => {
      try {
        const mapsLib = await window.google.maps.importLibrary('maps');
        const PolylineCtor = mapsLib?.Polyline || window.google.maps.Polyline;
        if (!PolylineCtor) return;

        if (polylineRef.current && polylineRef.current.setPath) {
          polylineRef.current.setPath(routePath);
        } else {
          const defaultOpts = {
            path: routePath,
            map: mapInstanceRef.current,
            strokeColor: '#2563eb',
            strokeOpacity: 0.9,
            strokeWeight: 5
          };
          polylineRef.current = new PolylineCtor({
            ...defaultOpts,
            ...(routePolylineOptions || {})
          });
        }

        if (!cancelled && fitBoundsToRoute && routePath.length > 1) {
          const bounds = new window.google.maps.LatLngBounds();
          for (const p of routePath) bounds.extend(p);
          mapInstanceRef.current.fitBounds(bounds);
        }
      } catch (err) {
        console.error('Error drawing polyline:', err);
      }
    };

    drawPolyline();

    return () => {
      cancelled = true;
    };
  }, [routePath, routePolylineOptions, fitBoundsToRoute, isLoaded]);



  const handleGetCurrentLocation = async () => {
    // Local ingest debug logging removed (was causing ERR_CONNECTION_REFUSED in dev)
    try {
      const coords = await getCurrentLocation();
      setCurrentLocation(coords);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo(coords);
        mapInstanceRef.current.setZoom(15);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert(error.message || 'Unable to get your current location. Please check your browser permissions.');
    }
  };

  // Loading state
  if (!isLoaded) {
    return (
      <div
        className={`bg-slate-100 rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-3"></div>
          <p className="text-slate-600">Loading map...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    const isApiError = loadError.message?.includes('API') || loadError.message?.includes('ApiNotActivatedMapError');

    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center p-6 max-w-md">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-red-600 font-bold text-lg mb-2">Google Maps Not Available</p>

          {isApiError ? (
            <div className="text-left bg-white rounded-lg p-4 mt-3 border border-red-300">
              <p className="text-sm text-red-700 font-semibold mb-2">⚠️ API Not Enabled</p>
              <p className="text-xs text-slate-600 mb-3">
                The Google Maps JavaScript API is not enabled for this API key.
              </p>
              <div className="text-xs text-slate-700 space-y-2">
                <p className="font-semibold">To fix this:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></li>
                  <li>Select project: <span className="font-mono bg-slate-100 px-1">zbinnovation</span></li>
                  <li>Navigate to "APIs & Services" → "Library"</li>
                  <li>Search for "Maps JavaScript API"</li>
                  <li>Click "Enable"</li>
                  <li>Also enable "Places API" and "Geocoding API"</li>
                </ol>
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-500 mt-1">
              {loadError.message || 'Please check your internet connection and try again'}
            </p>
          )}

          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height, width: '100%' }}>
      {/* Map Container */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
      />

      {/* Current Location Button */}
      {showCurrentLocation && (
        <button
          onClick={handleGetCurrentLocation}
          className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 hover:bg-slate-50 transition-colors z-10"
          title="Get current location"
        >
          <svg
            className="w-6 h-6 text-slate-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default MapView;

