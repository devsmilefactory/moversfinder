/**
 * Version Manager Utility
 * 
 * Handles app version detection, update detection, and cache clearing
 * when the app is updated to a new version.
 */

// Get app version from package.json (injected at build time)
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const VERSION_KEY = 'taxicab-app-version';
const LAST_UPDATE_KEY = 'taxicab-last-update';

/**
 * Get the current app version
 */
export const getCurrentVersion = () => {
  return APP_VERSION;
};

/**
 * Get the stored version from localStorage
 */
export const getStoredVersion = () => {
  try {
    return localStorage.getItem(VERSION_KEY);
  } catch (error) {
    console.error('Error reading stored version:', error);
    return null;
  }
};

/**
 * Store the current version in localStorage
 */
export const storeCurrentVersion = () => {
  try {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    localStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString());
    console.log('✅ Stored app version:', APP_VERSION);
  } catch (error) {
    console.error('Error storing version:', error);
  }
};

/**
 * Check if the app has been updated (version changed)
 * Returns true if version changed, false otherwise
 * Does NOT store the version automatically - that's handled by checkAndHandleUpdate
 */
export const isAppUpdated = () => {
  const storedVersion = getStoredVersion();
  
  // First time running the app - no update needed
  if (!storedVersion) {
    console.log('ℹ️ First time running app - no stored version');
    return false;
  }
  
  // Version changed - update available
  if (storedVersion !== APP_VERSION) {
    console.log('🔄 App updated from', storedVersion, 'to', APP_VERSION);
    return true;
  }
  
  return false;
};

/**
 * Clear all app caches (localStorage, sessionStorage, IndexedDB)
 */
export const clearAllCaches = async () => {
  console.log('🧹 Clearing all app caches...');
  
  try {
    // Clear localStorage (except version info)
    const versionInfo = {
      version: localStorage.getItem(VERSION_KEY),
      lastUpdate: localStorage.getItem(LAST_UPDATE_KEY),
    };
    
    localStorage.clear();
    
    // Restore version info
    if (versionInfo.version) {
      localStorage.setItem(VERSION_KEY, versionInfo.version);
    }
    if (versionInfo.lastUpdate) {
      localStorage.setItem(LAST_UPDATE_KEY, versionInfo.lastUpdate);
    }
    
    console.log('✅ localStorage cleared');
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    
    // Clear IndexedDB databases
    if (window.indexedDB) {
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
          console.log('✅ Deleted IndexedDB:', db.name);
        }
      }
    }
    
    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('✅ Deleted cache:', cacheName);
      }
    }
    
    console.log('✅ All caches cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
    return false;
  }
};

/**
 * Handle app update - clear caches and update version
 */
export const handleAppUpdate = async () => {
  console.log('🔄 Handling app update...');
  
  try {
    // Clear all caches
    await clearAllCaches();
    
    // Update stored version
    storeCurrentVersion();
    
    console.log('✅ App update handled successfully');
    return true;
  } catch (error) {
    console.error('❌ Error handling app update:', error);
    return false;
  }
};

/**
 * Check for updates and handle them
 * Stores version on first run, detects updates on subsequent runs
 */
export const checkAndHandleUpdate = async () => {
  const storedVersion = getStoredVersion();
  
  // First time running the app - store version
  if (!storedVersion) {
    console.log('ℹ️ First time running app - storing version');
    storeCurrentVersion();
    return false;
  }
  
  // Check if version changed
  if (isAppUpdated()) {
    console.log('🔄 App update detected - clearing caches and keeping stored version to trigger in-app prompt...');

    // Clear caches but intentionally do NOT update the stored version here.
    // We keep the previous version in storage so the PWA update banner
    // detects the mismatch on mount and prompts the user to refresh.
    // The stored version will be updated after the user accepts the update
    // via handleAppUpdate().
    await clearAllCaches();
    return true;
  }
  
  return false;
};

/**
 * Force clear all data (for manual reset)
 */
export const forceReset = async () => {
  console.log('🔄 Force resetting app...');
  
  try {
    // Clear everything including version info
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear IndexedDB
    if (window.indexedDB) {
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    }
    
    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
      }
    }
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    
    console.log('✅ App reset complete - reloading...');
    window.location.reload();
  } catch (error) {
    console.error('❌ Error resetting app:', error);
  }
};

