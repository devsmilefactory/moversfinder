// vite.config.mjs
import { defineConfig } from "file:///C:/Users/Public/Documents/bmtoa/pwa_app/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Public/Documents/bmtoa/pwa_app/node_modules/@vitejs/plugin-react/dist/index.js";
import tsconfigPaths from "file:///C:/Users/Public/Documents/bmtoa/pwa_app/node_modules/vite-tsconfig-paths/dist/index.mjs";
import tagger from "file:///C:/Users/Public/Documents/bmtoa/pwa_app/node_modules/@dhiwise/component-tagger/dist/index.mjs";
import { VitePWA } from "file:///C:/Users/Public/Documents/bmtoa/pwa_app/node_modules/vite-plugin-pwa/dist/index.js";
import { readFileSync } from "fs";
var packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
var APP_VERSION = packageJson.version;
var vite_config_default = defineConfig({
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(APP_VERSION)
  },
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 2e3
  },
  optimizeDeps: {
    exclude: ["@react-google-maps/api", "@vis.gl/react-google-maps"]
  },
  plugins: [
    tsconfigPaths(),
    react(),
    tagger(),
    VitePWA({
      apply: "build",
      devOptions: {
        enabled: false,
        type: "module"
      },
      registerType: "prompt",
      // Changed from 'autoUpdate' to give user control
      includeAssets: ["favicon.ico", "robots.txt", "icons/*.png", "splash/*.png"],
      // Manifest is now in public/manifest.json - vite-plugin-pwa will use it
      manifest: false,
      // Use the public/manifest.json file instead
      workbox: {
        // Service worker cache name with version
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        // Don't auto-activate, wait for user confirmation
        // Files to precache (App Shell)
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}"
        ],
        // Ignore these patterns
        globIgnores: [
          "**/node_modules/**/*",
          "**/screenshots/**/*",
          "sw.js",
          "workbox-*.js"
        ],
        // Maximum file size to precache (2MB)
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        // Runtime caching strategies
        runtimeCaching: [
          // App Shell - Cache First (for navigation requests)
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "taxicab-pages-v1",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7
                // 7 days
              },
              networkTimeoutSeconds: 3
            }
          },
          // Supabase API - Network First with fallback
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "taxicab-api-v1",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60
                // 1 hour
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
            handler: "NetworkOnly"
          },
          // Supabase Storage - Cache First for images
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "taxicab-images-v1",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30
                // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Google Maps API - Stale While Revalidate
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "taxicab-google-maps-v1",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7
                // 7 days
              }
            }
          },
          // Static assets (fonts, icons) - Cache First
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot|otf)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "taxicab-fonts-v1",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
                // 1 year
              }
            }
          },
          // Images - Cache First
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "taxicab-static-images-v1",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
                // 30 days
              }
            }
          },
          // CSS and JS - Stale While Revalidate
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "taxicab-static-resources-v1",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 7
                // 7 days
              }
            }
          }
        ],
        // Navigation fallback
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/auth/]
      }
    })
  ],
  server: {
    port: 4030,
    host: "0.0.0.0",
    strictPort: true,
    hmr: {
      host: "localhost",
      clientPort: 4030,
      protocol: "ws"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcUHVibGljXFxcXERvY3VtZW50c1xcXFxibXRvYVxcXFxwd2FfYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxQdWJsaWNcXFxcRG9jdW1lbnRzXFxcXGJtdG9hXFxcXHB3YV9hcHBcXFxcdml0ZS5jb25maWcubWpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9QdWJsaWMvRG9jdW1lbnRzL2JtdG9hL3B3YV9hcHAvdml0ZS5jb25maWcubWpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gXCJ2aXRlLXRzY29uZmlnLXBhdGhzXCI7XG5pbXBvcnQgdGFnZ2VyIGZyb20gXCJAZGhpd2lzZS9jb21wb25lbnQtdGFnZ2VyXCI7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcblxuLy8gUmVhZCB2ZXJzaW9uIGZyb20gcGFja2FnZS5qc29uXG5jb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKCcuL3BhY2thZ2UuanNvbicsICd1dGYtOCcpKTtcbmNvbnN0IEFQUF9WRVJTSU9OID0gcGFja2FnZUpzb24udmVyc2lvbjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGRlZmluZToge1xuICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9BUFBfVkVSU0lPTic6IEpTT04uc3RyaW5naWZ5KEFQUF9WRVJTSU9OKSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6IFwiYnVpbGRcIixcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDIwMDAsXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnQHJlYWN0LWdvb2dsZS1tYXBzL2FwaScsICdAdmlzLmdsL3JlYWN0LWdvb2dsZS1tYXBzJ11cbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIHRzY29uZmlnUGF0aHMoKSwgXG4gICAgcmVhY3QoKSwgXG4gICAgdGFnZ2VyKCksXG5WaXRlUFdBKHtcbiAgICAgIGFwcGx5OiAnYnVpbGQnLFxuICAgICAgZGV2T3B0aW9uczoge1xuICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICAgdHlwZTogJ21vZHVsZSdcbiAgICAgIH0sXG4gICAgICByZWdpc3RlclR5cGU6ICdwcm9tcHQnLCAvLyBDaGFuZ2VkIGZyb20gJ2F1dG9VcGRhdGUnIHRvIGdpdmUgdXNlciBjb250cm9sXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uaWNvJywgJ3JvYm90cy50eHQnLCAnaWNvbnMvKi5wbmcnLCAnc3BsYXNoLyoucG5nJ10sXG4gICAgICAvLyBNYW5pZmVzdCBpcyBub3cgaW4gcHVibGljL21hbmlmZXN0Lmpzb24gLSB2aXRlLXBsdWdpbi1wd2Egd2lsbCB1c2UgaXRcbiAgICAgIG1hbmlmZXN0OiBmYWxzZSwgLy8gVXNlIHRoZSBwdWJsaWMvbWFuaWZlc3QuanNvbiBmaWxlIGluc3RlYWRcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgLy8gU2VydmljZSB3b3JrZXIgY2FjaGUgbmFtZSB3aXRoIHZlcnNpb25cbiAgICAgICAgY2xlYW51cE91dGRhdGVkQ2FjaGVzOiB0cnVlLFxuICAgICAgICBjbGllbnRzQ2xhaW06IHRydWUsXG4gICAgICAgIHNraXBXYWl0aW5nOiBmYWxzZSwgLy8gRG9uJ3QgYXV0by1hY3RpdmF0ZSwgd2FpdCBmb3IgdXNlciBjb25maXJtYXRpb25cblxuICAgICAgICAvLyBGaWxlcyB0byBwcmVjYWNoZSAoQXBwIFNoZWxsKVxuICAgICAgICBnbG9iUGF0dGVybnM6IFtcbiAgICAgICAgICAnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd29mZix3b2ZmMix0dGYsZW90fSdcbiAgICAgICAgXSxcblxuICAgICAgICAvLyBJZ25vcmUgdGhlc2UgcGF0dGVybnNcbiAgICAgICAgZ2xvYklnbm9yZXM6IFtcbiAgICAgICAgICAnKiovbm9kZV9tb2R1bGVzLyoqLyonLFxuICAgICAgICAgICcqKi9zY3JlZW5zaG90cy8qKi8qJyxcbiAgICAgICAgICAnc3cuanMnLFxuICAgICAgICAgICd3b3JrYm94LSouanMnXG4gICAgICAgIF0sXG5cbiAgICAgICAgLy8gTWF4aW11bSBmaWxlIHNpemUgdG8gcHJlY2FjaGUgKDJNQilcbiAgICAgICAgbWF4aW11bUZpbGVTaXplVG9DYWNoZUluQnl0ZXM6IDIgKiAxMDI0ICogMTAyNCxcblxuICAgICAgICAvLyBSdW50aW1lIGNhY2hpbmcgc3RyYXRlZ2llc1xuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgICAgICAgIC8vIEFwcCBTaGVsbCAtIENhY2hlIEZpcnN0IChmb3IgbmF2aWdhdGlvbiByZXF1ZXN0cylcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAoeyByZXF1ZXN0IH0pID0+IHJlcXVlc3QubW9kZSA9PT0gJ25hdmlnYXRlJyxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdOZXR3b3JrRmlyc3QnLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICd0YXhpY2FiLXBhZ2VzLXYxJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDcgLy8gNyBkYXlzXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG5ldHdvcmtUaW1lb3V0U2Vjb25kczogM1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAvLyBTdXBhYmFzZSBBUEkgLSBOZXR3b3JrIEZpcnN0IHdpdGggZmFsbGJhY2tcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcLy4qXFwuc3VwYWJhc2VcXC5jb1xcL3Jlc3RcXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ3RheGljYWItYXBpLXYxJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwMCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwIC8vIDEgaG91clxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZToge1xuICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBuZXR3b3JrVGltZW91dFNlY29uZHM6IDVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgLy8gU3VwYWJhc2UgQXV0aCAtIE5ldHdvcmsgT25seSAobmV2ZXIgY2FjaGUgYXV0aClcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcLy4qXFwuc3VwYWJhc2VcXC5jb1xcL2F1dGhcXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtPbmx5J1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAvLyBTdXBhYmFzZSBTdG9yYWdlIC0gQ2FjaGUgRmlyc3QgZm9yIGltYWdlc1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvLipcXC5zdXBhYmFzZVxcLmNvXFwvc3RvcmFnZVxcLy4qL2ksXG4gICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ3RheGljYWItaW1hZ2VzLXYxJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDIwMCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzMCAvLyAzMCBkYXlzXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7XG4gICAgICAgICAgICAgICAgc3RhdHVzZXM6IFswLCAyMDBdXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgLy8gR29vZ2xlIE1hcHMgQVBJIC0gU3RhbGUgV2hpbGUgUmV2YWxpZGF0ZVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvbWFwc1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ1N0YWxlV2hpbGVSZXZhbGlkYXRlJyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAndGF4aWNhYi1nb29nbGUtbWFwcy12MScsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiA1MCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiA3IC8vIDcgZGF5c1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIC8vIFN0YXRpYyBhc3NldHMgKGZvbnRzLCBpY29ucykgLSBDYWNoZSBGaXJzdFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9cXC4oPzp3b2ZmfHdvZmYyfHR0Znxlb3R8b3RmKSQvaSxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAndGF4aWNhYi1mb250cy12MScsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAzMCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzNjUgLy8gMSB5ZWFyXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgLy8gSW1hZ2VzIC0gQ2FjaGUgRmlyc3RcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwuKD86cG5nfGpwZ3xqcGVnfHN2Z3xnaWZ8d2VicHxpY28pJC9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICd0YXhpY2FiLXN0YXRpYy1pbWFnZXMtdjEnLFxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDMwIC8vIDMwIGRheXNcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAvLyBDU1MgYW5kIEpTIC0gU3RhbGUgV2hpbGUgUmV2YWxpZGF0ZVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9cXC4oPzpqc3xjc3MpJC9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ1N0YWxlV2hpbGVSZXZhbGlkYXRlJyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAndGF4aWNhYi1zdGF0aWMtcmVzb3VyY2VzLXYxJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDYwLFxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDcgLy8gNyBkYXlzXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIF0sXG5cbiAgICAgICAgLy8gTmF2aWdhdGlvbiBmYWxsYmFja1xuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFsvXlxcL2FwaS8sIC9eXFwvYXV0aC9dXG4gICAgICB9XG4gICAgfSlcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNDAzMCxcbiAgICBob3N0OiBcIjAuMC4wLjBcIixcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIGhtcjoge1xuICAgICAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gICAgICBjbGllbnRQb3J0OiA0MDMwLFxuICAgICAgcHJvdG9jb2w6ICd3cydcbiAgICB9XG4gIH1cbn0pO1xuXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFULFNBQVMsb0JBQW9CO0FBQ2xWLE9BQU8sV0FBVztBQUNsQixPQUFPLG1CQUFtQjtBQUMxQixPQUFPLFlBQVk7QUFDbkIsU0FBUyxlQUFlO0FBQ3hCLFNBQVMsb0JBQW9CO0FBRzdCLElBQU0sY0FBYyxLQUFLLE1BQU0sYUFBYSxrQkFBa0IsT0FBTyxDQUFDO0FBQ3RFLElBQU0sY0FBYyxZQUFZO0FBR2hDLElBQU8sc0JBQVEsYUFBYTtBQUFB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
