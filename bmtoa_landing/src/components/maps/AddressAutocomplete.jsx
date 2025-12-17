import React, { useState, useRef, useEffect } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';

/**
 * AddressAutocomplete Component
 * 
 * Google Places Autocomplete for address input with:
 * - Real-time suggestions as user types
 * - Biased to Bulawayo, Zimbabwe
 * - Returns address and coordinates
 * - Keyboard navigation support
 * - Loading states
 * - Error handling
 * 
 * Props:
 * - value: string - Current input value
 * - onChange: function - Callback with selected place { address, lat, lng, placeId }
 * - placeholder: string - Input placeholder
 * - required: boolean - Is field required
 * - error: string - Error message to display
 * - className: string - Additional CSS classes
 * - label: string - Input label
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
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);

  const {
    ready,
    value: autocompleteValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      location: { lat: () => -20.1594, lng: () => 28.5833 }, // Bulawayo
      radius: 50000, // 50km radius
      componentRestrictions: { country: 'zw' }, // Zimbabwe only
    },
    debounce: 300,
  });

  // Update autocomplete value when input changes
  useEffect(() => {
    setValue(inputValue);
  }, [inputValue, setValue]);

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInput = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);
  };

  const handleSelect = async (suggestion) => {
    const address = suggestion.description;
    setInputValue(address);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);

      if (onChange) {
        onChange({
          address,
          lat,
          lng,
          placeId: suggestion.place_id,
        });
      }
    } catch (error) {
      console.error('Error getting geocode:', error);
      if (onChange) {
        onChange({
          address,
          lat: null,
          lng: null,
          placeId: suggestion.place_id,
        });
      }
    }
  };

  const handleKeyDown = (e) => {
    if (!data || data.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < data.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < data.length) {
          handleSelect(data[selectedIndex]);
        }
        break;
      case 'Escape':
        clearSuggestions();
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      clearSuggestions();
      setSelectedIndex(-1);
    }, 200);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
          📍
        </span>
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
        {!ready && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {status === 'OK' && data.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {data.map((suggestion, index) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion;

            return (
              <button
                key={place_id}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                  index === selectedIndex ? 'bg-yellow-50' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {main_text}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {secondary_text}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No results message */}
      {status === 'ZERO_RESULTS' && inputValue && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
          <p className="text-sm text-slate-500 text-center">
            No locations found. Try a different search term.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

      {/* Helper text */}
      {!error && !ready && (
        <p className="mt-1 text-xs text-slate-500">
          Loading Google Places...
        </p>
      )}
    </div>
  );
};

export default AddressAutocomplete;

