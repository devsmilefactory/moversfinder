/**
 * Google Maps Loader Utility
 * 
 * Centralized utility to ensure Google Maps is loaded before use
 * Prevents race conditions and duplicate script loading
 */

let googleMapsLoadPromise = null;
let isGoogleMapsLoading = false;

/**
 * Ensure Google Maps is loaded and ready to use
 * @returns {Promise<boolean>} True if Google Maps is available, false otherwise
 */
export const ensureGoogleMapsLoaded = async () => {
  // If already loaded, return immediately
  if (window.google?.maps?.importLibrary) {
    return true;
  }

  // If already loading, wait for existing promise
  if (isGoogleMapsLoading && googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  // Check if API key is configured
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return false;
  }

  // Start loading
  isGoogleMapsLoading = true;
  googleMapsLoadPromise = new Promise(async (resolve) => {
    try {
      // Check if script already exists in DOM
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (!existingScript) {
        // Listen for Google Maps authentication errors
        window.gm_authFailure = () => {
          isGoogleMapsLoading = false;
          googleMapsLoadPromise = null;
          resolve(false);
        };

        // Load the bootstrap loader inline
        const script = document.createElement('script');
        script.innerHTML = `
          (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
            key: "${apiKey}",
            v: "weekly"
          });
        `;
        document.head.appendChild(script);
      }

      // Wait for the loader to be available
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds
      
      while (!window.google?.maps?.importLibrary && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (window.google?.maps?.importLibrary) {
        isGoogleMapsLoading = false;
        resolve(true);
      } else {
        isGoogleMapsLoading = false;
        googleMapsLoadPromise = null;
        resolve(false);
      }
    } catch (error) {
      isGoogleMapsLoading = false;
      googleMapsLoadPromise = null;
      resolve(false);
    }
  });

  return googleMapsLoadPromise;
};

/**
 * Check if Google Maps is currently available
 * @returns {boolean} True if Google Maps is loaded
 */
export const isGoogleMapsAvailable = () => {
  return !!window.google?.maps?.importLibrary;
};

/**
 * Wait for Google Maps to be available (with timeout)
 * @param {number} timeoutMs - Maximum time to wait in milliseconds (default: 10000)
 * @returns {Promise<boolean>} True if Google Maps becomes available, false if timeout
 */
export const waitForGoogleMaps = async (timeoutMs = 10000) => {
  if (isGoogleMapsAvailable()) {
    return true;
  }

  // Try to ensure it's loading
  await ensureGoogleMapsLoaded();

  const startTime = Date.now();
  while (!isGoogleMapsAvailable() && (Date.now() - startTime) < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return isGoogleMapsAvailable();
};







