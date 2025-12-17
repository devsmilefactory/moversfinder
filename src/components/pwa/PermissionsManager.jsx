/**
 * Permissions Manager Component
 * 
 * Manages all native permissions required by the app:
 * - Notifications
 * - Geolocation
 * 
 * Requests permissions at appropriate times with user-friendly prompts
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Bell, MapPin, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import Button from '../ui/Button';
import { useToast } from '../ui/ToastProvider';

const DISMISS_STORAGE_KEY = 'taxicab_permissions_prompt_dismissed';

const PermissionsManager = () => {
  const { addToast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [geolocationPermission, setGeolocationPermission] = useState('prompt');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check current permission status
  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Check geolocation permission (async check)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setGeolocationPermission(result.state);
        result.onchange = () => {
          setGeolocationPermission(result.state);
        };
      }).catch(() => {
        // Fallback: assume prompt if we can't check
        setGeolocationPermission('prompt');
      });
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      addToast({
        type: 'error',
        title: 'Not Supported',
        message: 'Notifications are not supported in this browser',
        duration: 5000
      });
      return;
    }

    if (Notification.permission === 'granted') {
      addToast({
        type: 'success',
        title: 'Already Granted',
        message: 'Notification permission is already granted',
        duration: 3000
      });
      return;
    }

    if (Notification.permission === 'denied') {
      addToast({
        type: 'error',
        title: 'Permission Denied',
        message: 'Please enable notifications in your browser settings',
        duration: 5000
      });
      return;
    }

    setIsRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        addToast({
          type: 'success',
          title: 'Notifications Enabled',
          message: 'You will now receive ride updates and notifications',
          duration: 5000
        });
      } else {
        addToast({
          type: 'warning',
          title: 'Notifications Disabled',
          message: 'You can enable them later in browser settings',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to request notification permission',
        duration: 5000
      });
    } finally {
      setIsRequesting(false);
    }
  }, [addToast]);

  // Request geolocation permission (by attempting to get location)
  const requestGeolocationPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      addToast({
        type: 'error',
        title: 'Not Supported',
        message: 'Geolocation is not supported in this browser',
        duration: 5000
      });
      return;
    }

    setIsRequesting(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false
        });
      });

      setGeolocationPermission('granted');
      addToast({
        type: 'success',
        title: 'Location Access Enabled',
        message: 'Your location will be used to find nearby drivers',
        duration: 5000
      });
    } catch (error) {
      if (error.code === error.PERMISSION_DENIED) {
        setGeolocationPermission('denied');
        addToast({
          type: 'error',
          title: 'Location Permission Denied',
          message: 'Please enable location access in your browser settings to use this feature',
          duration: 5000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Location Error',
          message: 'Unable to access your location. Please try again.',
          duration: 5000
        });
      }
    } finally {
      setIsRequesting(false);
    }
  }, [addToast]);

  // Request all permissions
  const requestAllPermissions = useCallback(async () => {
    setIsRequesting(true);
    await Promise.all([
      requestNotificationPermission(),
      requestGeolocationPermission()
    ]);
    setIsRequesting(false);
  }, [requestNotificationPermission, requestGeolocationPermission]);

  // Auto-request permissions after user engagement (not on first load)
  useEffect(() => {
    // Only auto-request if user has been on the page for a bit
    const timer = setTimeout(() => {
      // Check if we should request permissions
      const shouldRequest = 
        (notificationPermission === 'default' || geolocationPermission === 'prompt') &&
        !isRequesting;

      if (shouldRequest) {
        // Don't auto-request, just show a subtle prompt
        // User can request manually via UI
      }
    }, 10000); // Wait 10 seconds

    return () => clearTimeout(timer);
  }, [notificationPermission, geolocationPermission, isRequesting]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DISMISS_STORAGE_KEY);
      if (stored === 'true') {
        setIsDismissed(true);
      }
    } catch (e) {
      console.warn('PermissionsManager: unable to read dismissal flag', e);
    }
  }, []);

  // Don't show UI if all permissions are granted
  if (isDismissed || (notificationPermission === 'granted' && geolocationPermission === 'granted')) {
    return null;
  }

  const getPermissionStatus = (permission) => {
    if (permission === 'granted') return 'granted';
    if (permission === 'denied') return 'denied';
    return 'prompt';
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9998] animate-slide-up">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">Enable App Features</h4>
            <p className="text-sm text-gray-600 mb-3">
              Grant permissions to use all features of TaxiCab
            </p>

            {/* Notification Permission */}
            <div className="mb-3 p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Notifications</span>
                </div>
                {notificationPermission === 'granted' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : notificationPermission === 'denied' ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : null}
              </div>
              {notificationPermission !== 'granted' && (
                <Button
                  onClick={requestNotificationPermission}
                  disabled={isRequesting || notificationPermission === 'denied'}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  {notificationPermission === 'denied' ? 'Enable in Settings' : 'Enable Notifications'}
                </Button>
              )}
            </div>

            {/* Geolocation Permission */}
            <div className="mb-3 p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Location</span>
                </div>
                {geolocationPermission === 'granted' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : geolocationPermission === 'denied' ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : null}
              </div>
              {geolocationPermission !== 'granted' && (
                <Button
                  onClick={requestGeolocationPermission}
                  disabled={isRequesting || geolocationPermission === 'denied'}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  {geolocationPermission === 'denied' ? 'Enable in Settings' : 'Enable Location'}
                </Button>
              )}
            </div>

            {/* Request All Button */}
            {(notificationPermission !== 'granted' || geolocationPermission !== 'granted') && (
              <Button
                onClick={requestAllPermissions}
                disabled={isRequesting}
                className="w-full"
                size="sm"
              >
                {isRequesting ? 'Requesting...' : 'Enable All Features'}
              </Button>
            )}
          </div>
          <button
            aria-label="Close"
            className="p-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
            onClick={() => {
              setIsDismissed(true);
              try {
                window.localStorage.setItem(DISMISS_STORAGE_KEY, 'true');
              } catch (e) {
                console.warn('PermissionsManager: unable to persist dismiss state', e);
              }
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsManager;

