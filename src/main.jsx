import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tailwind.css';

// Debug: Log environment variables at app startup
console.log('🚀 App Starting - Environment Check:');
console.log('🗝️ Google Maps API Key:', {
  exists: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  length: import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.length || 0,
  preview: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? `${import.meta.env.VITE_GOOGLE_MAPS_API_KEY.substring(0, 15)}...` : 'NOT SET'
});
console.log('🔥 Firebase Config:', {
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  hasVapidKey: !!import.meta.env.VITE_FIREBASE_VAPID_KEY
});
console.log('🌍 Environment:', {
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD
});

// Service Worker Management
// Note: Service worker registration is handled by PWAUpdateNotification component
// This ensures proper update handling and user prompts
if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  // Development: Unregister any existing service workers to prevent caching issues
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
        console.log('SW unregistered for development:', registration);
      });
    });
  });
}

// Render the app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

