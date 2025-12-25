/**
 * Firebase Messaging Integration for Workbox Service Worker
 * This script is imported into the Workbox-generated service worker
 * to add Firebase push notification support
 */

// Firebase Messaging imports
let firebaseApp = null;
let messaging = null;

// Initialize Firebase when config is received
function initializeFirebase(config) {
  if (!firebaseApp && config) {
    try {
      // Load Firebase scripts
      importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
      importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');
      
      firebaseApp = firebase.initializeApp(config);
      messaging = firebase.messaging();
      console.log('[SW] Firebase initialized successfully');
      
      // Set up background message handler
      setupBackgroundMessageHandler();
    } catch (error) {
      console.error('[SW] Error initializing Firebase:', error);
    }
  }
}

// Set up background message handler
function setupBackgroundMessageHandler() {
  if (!messaging) {
    console.warn('[SW] Messaging not available, cannot set up handler');
    return;
  }

  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Received background message:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.message || '',
      icon: payload.notification?.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: payload.data?.notification_type || 'default',
      data: {
        ...payload.data,
        url: payload.data?.action_url || payload.notification?.click_action || '/',
      },
      requireInteraction: payload.data?.priority === 'urgent' || payload.data?.priority === 'high',
      vibrate: payload.data?.priority === 'urgent' || payload.data?.priority === 'high'
        ? [200, 100, 200]
        : [100],
      actions: payload.data?.action_url
        ? [
            { action: 'open', title: 'View', icon: '/icons/icon-96x96.png' },
            { action: 'close', title: 'Dismiss' },
          ]
        : [],
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Listen for messages from main app
// Note: This adds to any existing message listeners from Workbox
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    console.log('[SW] Received Firebase config from main app');
    initializeFirebase(event.data.config);
  }
  // Note: Workbox may also have message listeners, they will all be called
});

// Handle notification clicks (add to existing notificationclick listener)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};
  
  // Handle app update notifications specially
  if (notificationData.update_type === 'app_update' || notificationData.notification_type === 'app_update') {
    const url = '/?update=true';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ('focus' in client) {
            return client.focus().then(() => {
              // Send message to client to trigger update
              client.postMessage({ type: 'APP_UPDATE_REQUIRED' });
            });
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
    return;
  }
  
  const url = notificationData.url || notificationData.action_url || '/';

  if (action === 'close') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});


