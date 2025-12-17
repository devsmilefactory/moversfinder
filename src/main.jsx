import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tailwind.css';

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

