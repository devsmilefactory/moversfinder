/**
 * Firebase Configuration and Initialization
 * Handles Firebase app initialization and messaging setup
 */

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase app (only if not already initialized)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  
  // Send config to service worker if available
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({
        type: 'FIREBASE_CONFIG',
        config: firebaseConfig,
      });
    }).catch((err) => {
      console.warn('Could not send Firebase config to service worker:', err);
    });
  }
} else {
  app = getApps()[0];
}

// VAPID key for web push notifications
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Check if Firebase Messaging is supported
let messaging = null;
let messagingSupported = false;

const initMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
      messagingSupported = true;
      return messaging;
    } else {
      console.warn('Firebase Messaging is not supported in this browser');
      messagingSupported = false;
      return null;
    }
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    messagingSupported = false;
    return null;
  }
};

/**
 * Get FCM token for push notifications
 * @returns {Promise<string|null>} FCM token or null if unavailable
 */
export const getFCMToken = async () => {
  try {
    if (!messaging) {
      await initMessaging();
    }

    if (!messaging || !messagingSupported) {
      console.warn('Firebase Messaging not available');
      return null;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Ensure service worker is registered and active
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers are not supported in this browser');
    }

    try {
      // Use the Workbox service worker (sw.js) instead of registering a separate one
      // This prevents service worker conflicts
      let registration = await navigator.serviceWorker.getRegistration();
      
      // In dev mode, service worker might not be available - that's OK
      if (!registration) {
        if (import.meta.env.DEV) {
          console.log('Service worker not available in dev mode (expected)');
          // In dev mode, we can't get FCM token without service worker
          // Return null gracefully
          return null;
        }
        
        // In production, try to register the Workbox one
        // This should already be registered by PWAUpdateNotification, but just in case
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        console.log('Service Worker registered (Workbox):', registration.scope);
      } else {
        console.log('Using existing Service Worker (Workbox):', registration.scope);
      }
      
      // Wait for service worker to be ready
      const readyRegistration = await navigator.serviceWorker.ready;
      
      // Wait for service worker to be active
      if (readyRegistration.installing) {
        await new Promise((resolve) => {
          const installingWorker = readyRegistration.installing;
          const stateChangeHandler = () => {
            if (installingWorker.state === 'activated') {
              installingWorker.removeEventListener('statechange', stateChangeHandler);
              resolve();
            }
          };
          installingWorker.addEventListener('statechange', stateChangeHandler);
        });
      } else if (readyRegistration.waiting) {
        // If waiting, activate it
        readyRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(), 2000);
          const controllerChangeHandler = () => {
            clearTimeout(timeout);
            readyRegistration.removeEventListener('controllerchange', controllerChangeHandler);
            resolve();
          };
          readyRegistration.addEventListener('controllerchange', controllerChangeHandler);
        });
      }
      
      // Ensure we have an active service worker
      if (!readyRegistration.active) {
        throw new Error('Service Worker is not active');
      }
      
      // Send Firebase config to service worker
      readyRegistration.active.postMessage({
        type: 'FIREBASE_CONFIG',
        config: firebaseConfig,
      });
      console.log('Firebase config sent to service worker');
      
      // Give the service worker time to initialize Firebase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (swError) {
      console.error('Service Worker registration failed:', swError);
      throw swError;
    }

    // Get FCM token - Firebase will use the registered service worker
    // In development, service worker might not be available, so handle gracefully
    let token;
    try {
      token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });
    } catch (tokenError) {
      // If token fails, it might be because service worker isn't ready or in dev mode
      console.warn('Failed to get FCM token (this is OK in dev mode):', tokenError.message);
      
      // In development mode, don't throw - just return null
      if (import.meta.env.DEV) {
        console.log('Running in development mode - FCM token not required');
        return null;
      }
      
      // In production, log but don't crash
      throw tokenError;
    }

    if (!token) {
      console.warn('No FCM token available');
      return null;
    }

    return token;
  } catch (error) {
    // Don't log as error in dev mode - it's expected
    if (import.meta.env.DEV) {
      console.log('FCM token unavailable in dev mode (expected)');
    } else {
      console.error('Error getting FCM token:', error);
    }
    return null;
  }
};

/**
 * Set up foreground message handler
 * @param {Function} callback - Callback function to handle messages
 * @returns {Function} Unsubscribe function
 */
export const onForegroundMessage = (callback) => {
  if (!messaging) {
    initMessaging().then(() => {
      if (messaging) {
        onMessage(messaging, callback);
      }
    });
    return () => {}; // Return empty unsubscribe function
  }

  return onMessage(messaging, callback);
};

/**
 * Check if Firebase is configured
 * @returns {boolean}
 */
export const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    VAPID_KEY
  );
};

/**
 * Check if messaging is supported
 * @returns {Promise<boolean>}
 */
export const checkMessagingSupport = async () => {
  if (!messagingSupported && !messaging) {
    await initMessaging();
  }
  return messagingSupported;
};

export { app, messaging, initMessaging };
export default app;






