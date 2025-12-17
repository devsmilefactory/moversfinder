import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'fs';

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const APP_VERSION = packageJson.version;

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
  },
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 2000,
  },
  optimizeDeps: {
    exclude: ['@react-google-maps/api', '@vis.gl/react-google-maps']
  },
  plugins: [
    tsconfigPaths(), 
    react(), 
    tagger(),
    // Workbox PWA Configuration - Optimized for real-time apps
    VitePWA({
      apply: 'build',
      devOptions: {
        enabled: false,
        type: 'module'
      },
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png', 'splash/*.png'],
      manifest: false, // Using public/manifest.json instead
      injectRegister: false, // Manual registration in PWAUpdateNotification
      workbox: {
        // Skip waiting and claim clients immediately for faster updates
        skipWaiting: true,
        clientsClaim: true,
        
        // PRIORITY: Network connectivity over caching
        // All strategies prioritize network with minimal caching for offline fallback only
        
        // Runtime caching strategies - Network-first approach
        runtimeCaching: [
          // Navigation requests - NetworkFirst with very short timeout, minimal caching
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'navigation-cache',
              networkTimeoutSeconds: 2, // Very short timeout - prioritize network
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 5, // Minimal cache entries
                maxAgeSeconds: 60 * 60 // 1 hour only
              },
              plugins: [
                {
                  cacheWillUpdate: async ({ response }) => {
                    // Only cache successful responses, and only as last resort
                    return response && response.status === 200 ? response : null;
                  },
                  fetchDidFail: async ({ request }) => {
                    // Fallback to index.html ONLY when network completely fails
                    if (request.mode === 'navigate') {
                      try {
                        const cache = await caches.open('navigation-cache');
                        const cachedIndex = await cache.match('/index.html');
                        if (cachedIndex) {
                          return cachedIndex;
                        }
                      } catch (e) {
                        console.warn('Failed to get cached index.html:', e);
                      }
                    }
                    return null;
                  }
                }
              ]
            }
          },
          // Static assets - NetworkFirst (not CacheFirst) to prioritize fresh content
          {
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico|webp)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'static-assets-cache',
              networkTimeoutSeconds: 3, // Short timeout, then fallback to cache
              expiration: {
                maxEntries: 50, // Reduced cache size
                maxAgeSeconds: 60 * 60 * 24 // 1 day only (not 30 days)
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // API requests - NetworkOnly (NEVER cache - always fresh)
          {
            urlPattern: /^https?:\/\/.*\/(api|auth|supabase|rest)\//,
            handler: 'NetworkOnly',
            options: {
              // No caching - always fetch from network for real-time data
            }
          },
          // Supabase REST API - NetworkOnly (always fresh)
          {
            urlPattern: ({ url }) => {
              // Match Supabase URLs (realtime, rest, auth, storage)
              return url.hostname.includes('supabase.co') || 
                     url.hostname.includes('supabase.io');
            },
            handler: 'NetworkOnly',
            options: {
              // Never cache - preserve real-time functionality
            }
          },
          // WebSocket connections - NetworkOnly (documented, though not intercepted by SW)
          {
            urlPattern: /^wss?:\/\/.*/,
            handler: 'NetworkOnly',
            options: {
              // WebSockets use native API, not intercepted, but documented here
            }
          }
        ],
        
        // Exclude patterns from precaching (API, WebSocket, etc.)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          // Don't fallback for API requests
          /^\/api\//,
          /^\/auth\//,
          /^\/supabase\//,
          // Don't fallback for file extensions that should 404
          /\.(?:json|xml|txt)$/
        ],
        
        // Cleanup old caches aggressively
        cleanupOutdatedCaches: true,
        
        // Reduced maximum cache size to prioritize network
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024, // 2MB (reduced from 5MB)
        
        // Disable precaching for most assets - we want network-first
        globIgnores: [
          '**/node_modules/**/*',
          '**/sw.js',
          '**/workbox-*.js'
        ]
      }
    })
  ],
  server: {
    port: 4030,
    host: "0.0.0.0",
    strictPort: true,
    hmr: {
      host: 'localhost',
      clientPort: 4030,
      protocol: 'ws'
    }
  }
});

