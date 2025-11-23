/**
 * iOS Install Instructions Component
 * 
 * Displays installation instructions for iOS devices (Safari).
 * 
 * Features:
 * - Robust iOS detection (including iPadOS 13+)
 * - Install state detection (avoids showing if already installed)
 * - Anti-annoy rules (engagement thresholds, max shows, 30-day cooldown)
 * - Only shows in Safari (not in-app browsers like Facebook, Instagram)
 * - Provides step-by-step installation guide
 * - Floating button to manually open instructions
 */

import React, { useState, useEffect } from 'react';
import { X, Share, Plus, Smartphone } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const IOSInstallInstructions = () => {
  const [showModal, setShowModal] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);

  const { platform, shouldShow, isInstalled, dismissPrompt } = usePWAInstall({
    minVisits: 2,        // Show after 2 page visits
    minSeconds: 30,      // Show after 30 seconds of activity
    maxShows: 3,         // Show maximum 3 times
    cooldownDays: 30,    // Wait 30 days after dismissal
    delaySeconds: 5      // Delay 5 seconds before showing (iOS users need more time)
  });

  // Auto-show modal when shouldShow is true
  useEffect(() => {
    if (shouldShow && !isInstalled && platform?.isIOS && platform?.isSafari && !platform?.isInAppBrowser) {
      setShowModal(true);
    }
  }, [shouldShow, isInstalled, platform]);

  // Show floating button after dismissal
  useEffect(() => {
    if (!shouldShow && !isInstalled && platform?.isIOS && platform?.isSafari && !platform?.isInAppBrowser) {
      setShowFloatingButton(true);
    }
  }, [shouldShow, isInstalled, platform]);

  // Only show for iOS devices in Safari (not in-app browsers)
  if (!platform?.isIOS || !platform?.isSafari || platform?.isInAppBrowser) {
    return null;
  }

  const handleDismiss = () => {
    dismissPrompt();
    setShowModal(false);
    setShowFloatingButton(true);
  };

  const handleShowInstructions = () => {
    setShowModal(true);
    
    // Track manual open (optional analytics)
    if (window.gtag) {
      window.gtag('event', 'ios_install_instructions_opened', {
        event_category: 'engagement'
      });
    }
  };

  return (
    <>
      {/* Floating button to show instructions */}
      {showFloatingButton && !showModal && (
        <button
          onClick={handleShowInstructions}
          className="fixed bottom-20 right-4 z-[9998] bg-primary text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
          aria-label="Install app instructions"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Instructions Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleDismiss}
        title="Install TaxiCab on iOS"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Add TaxiCab to Your Home Screen
            </h3>
            <p className="text-gray-600">
              Install our app for quick access and a better experience
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium mb-1">
                  Tap the Share button
                </p>
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Share className="w-5 h-5 text-blue-500" />
                  <span>Look for the share icon in Safari toolbar</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium mb-1">
                  Select Add to Home Screen
                </p>
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Plus className="w-5 h-5 text-blue-500" />
                  <span>Scroll down and tap this option</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium mb-1">
                  Tap Add to confirm
                </p>
                <p className="text-gray-600 text-sm">
                  The TaxiCab icon will appear on your home screen
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Why install?</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Quick access from your home screen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Full-screen experience without browser bars</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Works offline for viewing past rides</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Faster loading and better performance</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleDismiss}
              className="flex-1 bg-primary text-white hover:bg-primary/90 font-semibold py-3 rounded-lg"
            >
              Got it!
            </Button>
            <button
              onClick={handleDismiss}
              className="px-4 py-3 text-gray-600 hover:text-gray-900 font-medium"
            >
              Not now
            </button>
          </div>

          {/* Note */}
          <p className="text-xs text-gray-500 text-center">
            Note: Installation is only available in Safari browser on iOS
          </p>
        </div>
      </Modal>
    </>
  );
};

export default IOSInstallInstructions;
