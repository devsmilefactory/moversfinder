import React, { useState, useEffect } from 'react';
import Button from './ui/Button';

/**
 * PWA Install Prompt Component
 * 
 * Displays an install button when the PWA is installable
 * Handles the beforeinstallprompt event and triggers installation
 */
const PWAInstallPrompt = ({ variant = 'default', size = 'md', className = '' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('PWA install prompt available');
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If no install prompt, open PWA in new tab
      const pwaUrl = import.meta.env.VITE_PWA_URL || 'http://localhost:4030';
      window.open(pwaUrl, '_blank');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setIsInstallable(false);

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
  };

  // Don't show button if already installed
  if (isInstalled) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleInstallClick}
      iconName="Download"
      iconPosition="left"
      className={className}
    >
      {isInstallable ? 'Install App' : 'Get App'}
    </Button>
  );
};

export default PWAInstallPrompt;

