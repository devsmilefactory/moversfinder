import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
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
VitePWA({
      apply: 'build',
      devOptions: {
        enabled: false,
        type: 'module'
      },
      registerType: 'prompt', // Changed from 'autoUpdate' to give user control
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png', 'splash/*.png'],
      // Manifest is now in public/manifest.json - vite-plugin-pwa will use it
      manifest: false, // Use the public/manifest.json file instead
      workbox: {
        // Service worker cache name with version
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // Don't auto-activate, wait for user confirmation

        // Files to precache (App Shell)
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'
        ],

        // Ignore these patterns
        globIgnores: [
          '**/node_modules/**/*',
          '**/screenshots/**/*',
          'sw.js',
          'workbox-*.js'
        ],

        // Maximum file size to precache (2MB)
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,

        // Runtime caching strategies
        runtimeCaching: [
          // App Shell - Cache First (for navigation requests)
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'taxicab-pages-v1',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              networkTimeoutSeconds: 3
            }
          },

          // Supabase API - Network First with fallback
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'taxicab-api-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 5
            }
          },

          // Supabase Auth - Network Only (never cache auth)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly'
          },

          // Supabase Storage - Cache First for images
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'taxicab-images-v1',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },

          // Google Maps API - Stale While Revalidate
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'taxicab-google-maps-v1',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },

          // Static assets (fonts, icons) - Cache First
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot|otf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'taxicab-fonts-v1',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },

          // Images - Cache First
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'taxicab-static-images-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },

          // CSS and JS - Stale While Revalidate
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'taxicab-static-resources-v1',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ],

        // Navigation fallback
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/]
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

