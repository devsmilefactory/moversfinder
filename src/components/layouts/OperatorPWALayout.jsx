import React, { useState } from 'react';
import PWALeftDrawer from './PWALeftDrawer';
import useAuthStore from '../../stores/authStore';
import useProfileStore from '../../stores/profileStore';

/**
 * Operator PWA Layout
 * Mirrors DriverPWALayout/CorporatePWALayout structure
 */
const OperatorPWALayout = ({ children, title = 'Operator' }) => {
  const { user } = useAuthStore();
  const { activeProfileType } = useProfileStore();
  const [showMenu, setShowMenu] = useState(false);

  const getUserInitial = () => (user?.name?.[0] || user?.email?.[0] || 'O').toUpperCase();

  return (
    <>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left: Menu */}
            <button
              onClick={() => setShowMenu(true)}
              className="p-2 rounded-md text-slate-700 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            {/* Center: Title */}
            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            </div>

            {/* Right: Avatar */}
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-slate-700 font-bold">{getUserInitial()}</span>
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

      {/* Unified Left Drawer */}
      <PWALeftDrawer open={showMenu} onClose={() => setShowMenu(false)} profileType={activeProfileType} />
    </>
  );
};

export default OperatorPWALayout;

