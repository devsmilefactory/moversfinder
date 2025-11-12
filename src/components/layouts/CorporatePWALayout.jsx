import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useProfileStore from '../../stores/profileStore';
import PWALeftDrawer from './PWALeftDrawer';

/**
 * Corporate PWA Layout Component
 * 
 * Provides consistent PWA-style layout for all corporate pages:
 * - Hamburger menu (left)
 * - Page title (center)
 * - User avatar (right)
 * - Slide-out navigation drawer
 * - Profile switcher integration
 * 
 * Usage:
 * <CorporatePWALayout title="Bookings">
 *   <YourPageContent />
 * </CorporatePWALayout>
 */
const CorporatePWALayout = ({ children, title = 'Corporate' }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { activeProfileType } = useProfileStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);


  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };


  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen-safe bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Hamburger Menu */}
          <button
            onClick={toggleDrawer}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-slate-700" />
          </button>

          {/* Title */}
          <h1 className="text-lg font-semibold text-slate-800 truncate px-2">
            {title}
          </h1>

          {/* User Avatar */}
          <button
            onClick={toggleDrawer}
            className="w-10 h-10 bg-slate-700 text-white rounded-full flex items-center justify-center font-semibold hover:bg-slate-800 transition-colors flex-shrink-0"
            aria-label="User menu"
          >
            {getUserInitials()}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-safe">
        {children}
      </main>

      {/* Unified Left Drawer */}
      <PWALeftDrawer open={isDrawerOpen} onClose={closeDrawer} profileType={activeProfileType} />
    </div>
  );
};

export default CorporatePWALayout;

