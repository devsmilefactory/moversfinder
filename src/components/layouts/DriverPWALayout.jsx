import React, { useState } from 'react';

import PWALeftDrawer from './PWALeftDrawer';
import useAuthStore from '../../stores/authStore';
import useProfileStore from '../../stores/profileStore';

/**
 * Driver PWA Layout
 * 
 * Consistent layout wrapper for all driver pages in PWA
 * Includes:
 * - Header with hamburger menu
 * - User avatar
 * - Navigation drawer
 * - Profile switcher integration
 */
const DriverPWALayout = ({ children, title = 'Driver' }) => {
  const { user } = useAuthStore();
  const { activeProfileType } = useProfileStore();
  const [showMenu, setShowMenu] = useState(false);




  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header with Hamburger Menu */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left: Menu Button */}
              <button
                onClick={() => setShowMenu(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Center: Title */}
              <div className="flex-1 text-center">
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              </div>

              {/* Right: User Avatar */}
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-slate-700 font-bold">
                  {user?.name?.charAt(0) || 'D'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>

      {/* Unified Left Drawer */}
      <PWALeftDrawer open={showMenu} onClose={() => setShowMenu(false)} profileType={activeProfileType} />
    </>
  );
};

export default DriverPWALayout;

