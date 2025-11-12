/**
 * PWA Install Prompt Component
 *
 * Displays an install banner for Android/Desktop when the beforeinstallprompt event fires.
 *
 * Features:
 * - Robust platform detection (iOS vs Android vs Chromium)
 * - Install state detection (avoids showing if already installed)
 * - Anti-annoy rules (engagement thresholds, max shows, 30-day cooldown)
 * - Tracks analytics events
 * - Uses existing icons from /public/icons/
 */

import React from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import Button from '../ui/Button';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const PWAInstallPrompt = () => {
  const { platform, shouldShow, canPrompt, promptInstall, dismissPrompt } = usePWAInstall({
    minVisits: 2,        // Show after 2 page visits
    minSeconds: 30,      // Show after 30 seconds of activity
    maxShows: 3,         // Show maximum 3 times
    cooldownDays: 30,    // Wait 30 days after dismissal
    delaySeconds: 3      // Delay 3 seconds before showing
  });

  const handleInstallClick = async () => {
    await promptInstall();
  };

  const handleDismiss = () => {
    dismissPrompt();
  };

  // Only show for Android/Chromium browsers with install capability
  // Don't show for iOS (has separate component) or in-app browsers
  if (!shouldShow || !canPrompt || !platform?.isChromium || platform?.isInAppBrowser) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-slide-up">
      <div className="bg-gradient-to-r from-primary to-yellow-500 text-white shadow-2xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 mt-1">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <Smartphone className="w-7 h-7 text-primary" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold mb-1">
                Install TaxiCab App
              </h3>
              <p className="text-sm text-white/90 mb-3">
                Get quick access to book rides and track drivers. Works offline!
              </p>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleInstallClick}
                  className="bg-white text-primary hover:bg-gray-100 font-semibold px-4 py-2 rounded-lg shadow-md flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install App
                </Button>
                <button
                  onClick={handleDismiss}
                  className="text-white/90 hover:text-white text-sm font-medium px-3 py-2"
                >
                  Not now
                </button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
