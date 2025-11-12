import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Splash Screen Component
 * Displays on app launch with TaxiCab branding and loading animation
 * 
 * Features:
 * - Animated logo
 * - Loading indicator
 * - Smooth fade out transition
 * - Mobile-optimized design
 */
const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          // Delay before calling onComplete to show 100% briefly
          setTimeout(() => onComplete?.(), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #FFC107 0%, #FF9800 50%, #334155 100%)'
      }}
    >
      {/* Logo Container */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        {/* Taxi Icon */}
        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="mb-6"
        >
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl p-4">
            <img
              src="/icons/icon-192x192.png"
              alt="TaxiCab Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        {/* App Name */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-4xl font-bold text-white mb-2 text-center"
        >
          TaxiCab
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-lg text-white/90 mb-8 text-center"
        >
          Ride & Drive
        </motion.p>

        {/* Loading Bar */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 200, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="w-48 h-2 bg-white/30 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>

        {/* Loading Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="mt-4 text-white/80 text-sm"
        >
          {progress < 100 ? 'Loading...' : 'Ready!'}
        </motion.p>
      </motion.div>

      {/* Powered by BMTOA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute bottom-8 text-center"
      >
        <p className="text-white/70 text-sm">
          Powered by
        </p>
        <p className="text-white font-semibold text-base">
          BMTOA
        </p>
        <p className="text-white/60 text-xs mt-1">
          Bulawayo Metered Taxi Operators Association
        </p>
      </motion.div>

      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating circles */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-32 right-16 w-40 h-40 bg-white/10 rounded-full blur-2xl"
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 right-20 w-24 h-24 bg-white/10 rounded-full blur-2xl"
        />
      </div>
    </motion.div>
  );
};

export default SplashScreen;

