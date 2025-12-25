/**
 * Location Permission Modal
 * 
 * Shows a user-friendly modal when location permission is denied
 * Provides a CTA button to request permission
 */

import React, { useState } from 'react';
import { MapPin, X, AlertCircle, Settings } from 'lucide-react';
import { getCurrentLocation } from '../../utils/locationServices';

const LocationPermissionModal = ({ 
  isOpen, 
  onClose, 
  onPermissionGranted,
  onRequestPermission 
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    setErrorMessage(null);
    
    try {
      // Simply call getCurrentLocation - browser will show prompt if needed
      const location = await getCurrentLocation({
        enableHighAccuracy: false,
        timeout: 10000
      });

      // Permission granted and location obtained
      if (onPermissionGranted) {
        onPermissionGranted({
          lat: location.lat,
          lng: location.lng
        });
      }
      onClose();
    } catch (error) {
      // Check if user denied or if it's another error
      const PERMISSION_DENIED = 1;
      if (error.code === PERMISSION_DENIED || error.isPermissionDenied) {
        // Permission denied - show instructions
        setErrorMessage('Location permission is denied. Please click "Open Browser Settings" below to enable it, then refresh this page.');
      } else if (error.code === 3) {
        // Timeout
        setErrorMessage('Location request timed out. Please try again or check your device location settings.');
      } else {
        // Other error
        setErrorMessage('Unable to get your location. Please check your device settings and try again.');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenBrowserSettings = () => {
    // Try to open browser settings (may be blocked by browser security)
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    let settingsUrl = '';
    let instructions = '';
    
    if (isChrome) {
      settingsUrl = 'chrome://settings/content/location';
      instructions = `Chrome Instructions:
1. Click the lock icon (🔒) in the address bar
2. Click "Site settings"
3. Find "Location" and set it to "Allow"
4. Refresh this page

OR

1. Go to Chrome Settings (three dots menu → Settings)
2. Privacy and security → Site settings → Location
3. Find this site and set to "Allow"
4. Refresh this page`;
    } else if (isEdge) {
      settingsUrl = 'edge://settings/content/location';
      instructions = `Edge Instructions:
1. Click the lock icon (🔒) in the address bar
2. Click "Site permissions"
3. Find "Location" and set it to "Allow"
4. Refresh this page

OR

1. Go to Edge Settings (three dots menu → Settings)
2. Cookies and site permissions → Location
3. Find this site and set to "Allow"
4. Refresh this page`;
    } else if (isFirefox) {
      instructions = `Firefox Instructions:
1. Click the lock icon (🔒) in the address bar
2. Click "More Information"
3. Click "Permissions" tab
4. Find "Access your location" and set to "Allow"
5. Refresh this page

OR

1. Go to Firefox Settings (three lines menu → Settings)
2. Privacy & Security → Permissions → Location → Settings
3. Find this site and set to "Allow"
4. Refresh this page`;
    } else if (isSafari) {
      instructions = `Safari Instructions:
1. Safari menu → Preferences → Websites
2. Select "Location" from the sidebar
3. Find this site and set to "Allow"
4. Refresh this page`;
    } else {
      instructions = `Browser Settings Instructions:
1. Look for a lock icon (🔒) or site info icon in the address bar
2. Click it and find "Location" or "Site permissions"
3. Set location access to "Allow"
4. Refresh this page`;
    }
    
    // Show instructions in the modal (better UX than alert)
    setErrorMessage(instructions);
    
    // Try to open settings URL (may be blocked by browser security)
    // This is a best-effort attempt - browsers often block internal URLs
    if (settingsUrl) {
      try {
        // Try opening in new tab (most browsers block this)
        const opened = window.open(settingsUrl, '_blank');
        // If blocked, opened will be null
        if (!opened) {
          // Browser blocked the URL - instructions are already shown above
        }
      } catch (e) {
        // Settings URL blocked - instructions are already shown
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Location Access Required</h3>
              <p className="text-sm text-gray-600 mt-1">We need your location to find nearby drivers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-800 font-medium mb-1">
                  Location permission is currently denied
                </p>
                <p className="text-xs text-yellow-700">
                  Please enable location access to use this feature. Your location helps us find the nearest drivers and calculate accurate trip costs.
                </p>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className={`border rounded-lg p-3 mb-4 ${
              errorMessage.includes('Instructions:') 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm whitespace-pre-line ${
                errorMessage.includes('Instructions:') 
                  ? 'text-blue-800 font-medium' 
                  : 'text-red-800'
              }`}>{errorMessage}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRequesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Requesting Permission...</span>
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5" />
                  <span>Allow Location Access</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenBrowserSettings}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Open Browser Settings</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-500 text-center">
          <p>Your location is only used to find nearby drivers and is never shared with third parties.</p>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionModal;
