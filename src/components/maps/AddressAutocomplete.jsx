import React, { useState, useRef, useEffect } from 'react';

/**
 * AddressAutocomplete Component
 * Uses vanilla Google Maps JavaScript API with Dynamic Library Import
 */
const AddressAutocomplete = ({
  value = '',
  onChange,
  placeholder = 'Enter address...',
  required = false,
  error = '',
  className = '',
  label = ''
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const [useWidget, setUseWidget] = useState(false);
  const inputRef = useRef(null);
  const autocompleteService = useRef(null);
  const sessionToken = useRef(null);

  // Load Google Maps Places library
  useEffect(() => {
    const loadPlaces = async () => {
      try {
        if (!window.google?.maps?.importLibrary) {
          console.warn('Google Maps not loaded yet');
          return;
        }

        const placesLib = await window.google.maps.importLibrary('places');

        if (window.google?.maps?.places?.Autocomplete && inputRef.current) {
          const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: 'zw' },
            fields: ['formatted_address', 'geometry', 'place_id', 'name']
          });
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            const address = place.formatted_address || place.name || inputRef.current.value;
            const loc = place.geometry?.location;
            onChange?.({
              address,
              lat: loc ? loc.lat() : null,
              lng: loc ? loc.lng() : null,
              placeId: place.place_id
            });
            setInputValue(address);
          });
          setPlacesLoaded(true);
          setUseWidget(true);
        } else if (placesLib?.AutocompleteService) {
          autocompleteService.current = new placesLib.AutocompleteService();
          if (placesLib?.AutocompleteSessionToken) {
            sessionToken.current = new placesLib.AutocompleteSessionToken();
          }
          setPlacesLoaded(true);
          setUseWidget(false);
        } else {
          console.warn('Places library loaded but no Autocomplete available');
        }
      } catch (error) {
        console.error('Error loading Places library:', error);
      }
    };

    loadPlaces();
  }, []);

  useEffect(() => { setInputValue(value); }, [value]);

  useEffect(() => {
    if (useWidget) {
      setSuggestions([]);
      return;
    }
    if (!autocompleteService.current || !inputValue || inputValue.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);

    // Try to get current location for bias, but don't block on it
    const request = {
      input: inputValue,
      sessionToken: sessionToken.current,
      componentRestrictions: { country: 'zw' },
    };

    // Optionally add location bias if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          request.location = new window.google.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude
          );
          request.radius = 50000;
          autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
            setIsLoading(false);
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              setSuggestions(predictions);
            } else {
              setSuggestions([]);
            }
          });
        },
        () => {
          // If geolocation fails, proceed without location bias
          autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
            setIsLoading(false);
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              setSuggestions(predictions);
            } else {
              setSuggestions([]);
            }
          });
        },
        { timeout: 5000, maximumAge: 300000 }
      );
    } else {
      // No geolocation available, proceed without location bias
      autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
        setIsLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
        } else {
          setSuggestions([]);
        }
      });
    }
  }, [inputValue, useWidget]);

  const handleInput = (e) => {
    setInputValue(e.target.value);
    setSelectedIndex(-1);
  };

  const handleSelect = async (suggestion) => {
    const address = suggestion.description;
    setInputValue(address);
    setSuggestions([]);

    if (!placesLoaded) return;

    try {
      const { Geocoder } = await window.google.maps.importLibrary('geocoding');
      const geocoder = new Geocoder();
      const result = await geocoder.geocode({ placeId: suggestion.place_id });

      if (result.results && result.results[0]) {
        const location = result.results[0].geometry.location;
        if (onChange) {
          onChange({ address, lat: location.lat(), lng: location.lng(), placeId: suggestion.place_id });
        }
      }
    } catch (error) {
      console.error('Error getting geocode:', error);
      if (onChange) {
        onChange({ address, lat: null, lng: null, placeId: suggestion.place_id });
      }
    }

    // Create new session token
    const { AutocompleteSessionToken } = await window.google.maps.importLibrary('places');
    sessionToken.current = new AutocompleteSessionToken();
  };

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => prev < suggestions.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setSuggestions([]);
      setSelectedIndex(-1);
    }, 200);
  };

  const ready = placesLoaded;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">📍</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={!ready}
          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all ${
            error ? 'border-red-500' : 'border-slate-300'
          } ${!ready ? 'bg-slate-100 cursor-not-allowed' : ''}`}
        />
        {(isLoading || !ready) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
          </div>
        )}
      </div>
      {suggestions.length > 0 && !useWidget && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-yellow-50' : ''
              }`}
            >
              <div className="flex items-start">
                <span className="text-slate-400 mr-2 mt-0.5">📍</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {suggestion.structured_formatting.main_text}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {suggestion.structured_formatting.secondary_text}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {/* Only show "No locations found" if user has typed something different from the initial value */}
      {inputValue && inputValue.length >= 3 && suggestions.length === 0 && !isLoading && ready && inputValue !== value && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
          <p className="text-sm text-slate-500 text-center">
            No locations found. Try a different search term.
          </p>
        </div>
      )}
      {error && (<p className="mt-1 text-sm text-red-500">{error}</p>)}
      {!error && !ready && (<p className="mt-1 text-xs text-slate-500">Loading Google Places...</p>)}
    </div>
  );
};

export default AddressAutocomplete;

