import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverRidesHub from '../components/DriverRidesHub';
import ProfileSwitcher from '../../../components/profiles/ProfileSwitcher';
import useAuthStore from '../../../stores/authStore';
import useProfileStore from '../../../stores/profileStore';

/**
 * Ride Requests Page (Driver)
 *
 * Primary interface for drivers after login
 * Now uses DriverRidesHub with inDrive-style bidding system:
 * - Available Rides: Rides to bid on
 * - My Bids: Pending bids waiting for passenger acceptance
 * - Active Rides: Accepted rides in progress
 */
const RideRequestsPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { activeProfileType } = useProfileStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);

  // CRITICAL FIX: Redirect if activeProfileType doesn't match this page
  // This ensures seamless profile switching - when user switches to individual/corporate,
  // this page will detect it and navigate to the appropriate page
  useEffect(() => {
    if (!activeProfileType) return;

    // This page is for driver profile only
    if (activeProfileType !== 'driver') {
      console.log(`RideRequestsPage: activeProfileType is ${activeProfileType}, redirecting...`);

      // Navigate to the appropriate page for the active profile
      const routes = {
        individual: '/user/book-ride',
        corporate: '/corporate/book-ride',
        operator: '/operator/dashboard'
      };

      const targetRoute = routes[activeProfileType];
      if (targetRoute) {
        navigate(targetRoute, { replace: true });
      }
    }
  }, [activeProfileType, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSwitchProfile = () => {
    setShowMenu(false);
    setShowProfileSwitcher(true);
  };

  const menuItems = [
    { icon: '🔄', label: 'Switch Profile', action: handleSwitchProfile },
    { icon: '💰', label: 'Earnings', action: () => navigate('/driver/earnings') },
    { icon: '📜', label: 'Rides History', action: () => navigate('/driver/rides-history') },
    { icon: '👤', label: 'Profile', action: () => navigate('/driver/profile') },
    { icon: '🚪', label: 'Logout', action: handleLogout },
  ];

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
                <h1 className="text-xl font-bold text-gray-900">Ride Management</h1>
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
            <DriverRidesHub />
          </div>
        </div>
      </div>

      {/* Navigation Menu Drawer */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={() => setShowMenu(false)}
          />

          {/* Drawer */}
          <div className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-[101] transform transition-transform duration-300">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                      <span className="text-2xl">🚗</span>
                    </div>
                    <span className="text-xl font-bold text-slate-800">TaxiCab</span>
                  </div>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="p-2 rounded-full hover:bg-yellow-600 transition-colors"
                  >
                    <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* User Info */}
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-800">{user?.name || 'Driver'}</p>
                  <p className="text-xs text-slate-700">{user?.email || ''}</p>
                  <div className="mt-2 inline-block bg-white/30 px-2 py-1 rounded text-xs font-medium text-slate-800">
                    Driver Mode
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 px-4 py-6 overflow-y-auto">
                <div className="space-y-2">
                  {menuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        item.action();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-slate-100"
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <span className="font-medium text-slate-700">{item.label}</span>
                    </button>
                  ))}
                </div>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200">
                <p className="text-xs text-center text-slate-500">
                  TaxiCab PWA v1.0.0
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Profile Switcher Modal */}
      <ProfileSwitcher
        isOpen={showProfileSwitcher}
        onClose={() => setShowProfileSwitcher(false)}
      />
    </>
  );
};

export default RideRequestsPage;
