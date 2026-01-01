/**
 * Deep Linking Utilities
 * Handles navigation from push notifications and deep links
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Parse deep link URL and extract route information
 * @param {string} url - Deep link URL
 * @returns {Object} Parsed route information
 */
export const parseDeepLink = (url) => {
  try {
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname;
    const searchParams = Object.fromEntries(urlObj.searchParams.entries());

    return {
      path,
      params: searchParams,
      fullPath: path + (urlObj.search || ''),
    };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return {
      path: '/',
      params: {},
      fullPath: '/',
    };
  }
};

/**
 * Navigate to deep link route
 * @param {string} url - Deep link URL
 * @param {Function} navigate - React Router navigate function
 */
export const navigateToDeepLink = (url, navigate) => {
  const { path, params, fullPath } = parseDeepLink(url);

  // Navigate to the route
  navigate(fullPath);

  // Store params in sessionStorage for components to access
  if (Object.keys(params).length > 0) {
    sessionStorage.setItem('deepLinkParams', JSON.stringify(params));
  }
};

/**
 * Get deep link parameters from session storage
 * @returns {Object} Deep link parameters
 */
export const getDeepLinkParams = () => {
  try {
    const params = sessionStorage.getItem('deepLinkParams');
    return params ? JSON.parse(params) : {};
  } catch (error) {
    console.error('Error getting deep link params:', error);
    return {};
  }
};

/**
 * Clear deep link parameters from session storage
 */
export const clearDeepLinkParams = () => {
  sessionStorage.removeItem('deepLinkParams');
};

/**
 * Hook to handle deep linking
 * @param {Function} navigate - React Router navigate function
 * @returns {Object} Deep link utilities
 */
export const useDeepLinking = (navigate) => {
  const handleDeepLink = useCallback(
    (url) => {
      navigateToDeepLink(url, navigate);
    },
    [navigate]
  );

  return {
    handleDeepLink,
    getDeepLinkParams,
    clearDeepLinkParams,
    parseDeepLink,
  };
};






