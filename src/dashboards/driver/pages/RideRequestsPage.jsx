import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  RefreshCw,
  DollarSign,
  FileText,
  User as UserIcon,
  LogOut,
  Car as CarIcon,
  CheckCircle2,
  MapPin as MapPinIcon
} from 'lucide-react';
import DriverRidesPage from '../DriverRidesPage';
import ProfileSwitcher from '../../../components/profiles/ProfileSwitcher';
import useAuthStore from '../../../stores/authStore';
import useProfileStore from '../../../stores/profileStore';
import ToggleSwitch from '../../../components/ui/ToggleSwitch';
import NotificationBell from '../../../components/notifications/NotificationBell';

/**
 * Ride Requests Page (Driver)
 *
 * Primary interface for drivers after login
 * Now uses DriverRidesPage with unified ride feed system:
 * - Available Rides: Rides to bid on (within 5km radius)
 * - My Bids: Pending bids waiting for passenger acceptance
 * - Active Rides: Accepted rides in progress
 * - Completed Rides: Historical ride data
 * 
 * Note: If you see "Failed to fetch dynamically imported module" error,
 * try restarting the Vite dev server.
 */
const RideRequestsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { activeProfileType } = useProfileStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [ridesUiState, setRidesUiState] = useState({
    isOnline: false,
    locationCity: '',
    locationLoading: false,
    onToggleOnline: () => {},
    onRefresh: () => {},
    hasNewRides: false,
    newRidesCount: 0,
    isRefreshing: false
  });

  const handleRidesUiState = useCallback((nextState) => {
    if (!nextState) {
      return;
    }
    setRidesUiState((prev) => {
      const keys = Object.keys(nextState);
      const changed = keys.some((key) => prev[key] !== nextState[key]);
      return changed ? nextState : prev;
    });
  }, []);

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
    { icon: MapPinIcon, label: 'Rides', path: '/driver/rides', action: () => navigate('/driver/rides'), accent: 'text-blue-600' },
    { icon: DollarSign, label: 'Earnings', path: '/driver/earnings', action: () => navigate('/driver/earnings'), accent: 'text-green-600' },
    { icon: FileText, label: 'Rides History', path: '/driver/rides-history', action: () => navigate('/driver/rides-history'), accent: 'text-purple-600' },
    { icon: UserIcon, label: 'Profile', path: '/driver/profile', action: () => navigate('/driver/profile'), accent: 'text-slate-600' },
    { icon: LogOut, label: 'Logout', path: null, action: handleLogout, accent: 'text-red-600' },
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        {/* Header with Hamburger Menu */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-2 h-16">
              <button
                onClick={() => setShowMenu(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex-1 text-center min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">Rides</h1>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <NotificationBell className="flex-shrink-0 scale-90 origin-right" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="py-1">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 mb-2">
            <div className="bg-white rounded-xl shadow-lg py-2 px-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Service Area</p>
                <p className="text-lg font-bold text-slate-700">{ridesUiState.locationCity || 'Detecting...'}</p>
                {ridesUiState.locationLoading && (
                  <p className="text-[10px] text-blue-500 animate-pulse font-medium">Updating location...</p>
                )}
              </div>
              <div className="text-right">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs text-slate-500 font-medium">My Status</p>
                    <p className={`text-lg font-bold ${ridesUiState.isOnline ? 'text-green-600' : 'text-slate-400'}`}>
                      {ridesUiState.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {ridesUiState.isOnline ? 'Go Offline' : 'Go Online'}
                    </span>
                    <ToggleSwitch
                      checked={ridesUiState.isOnline}
                      onChange={ridesUiState.onToggleOnline}
                      disabled={ridesUiState.locationLoading}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
            <DriverRidesPage onUiStateChange={handleRidesUiState} />
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
                    <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                      <CarIcon className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <span className="text-xl font-bold text-slate-800">TaxiCab</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        <p className="text-xs font-semibold text-white">Driver Mode</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                    aria-label="Close menu"
                  >
                    <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Profile summary + switch CTA */}
                <div className="bg-white/20 rounded-xl p-4 border border-white/30 space-y-3">
                  <div>
                    <p className="font-semibold text-slate-800 truncate">
                      {user?.name || user?.email || 'Your account'}
                    </p>
                    {user?.email && <p className="text-sm text-slate-700 truncate">{user.email}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/30">
                      <CarIcon className="w-4 h-4 text-yellow-600" />
                      <p className="text-xs font-bold text-slate-800">
                        Active profile: Driver
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        handleSwitchProfile();
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-slate-900 text-sm font-semibold shadow hover:bg-yellow-50 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-yellow-500" />
                      <span>Switch profile</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 px-4 py-6 overflow-y-auto">
                <div className="space-y-1">
                  {menuItems.map((item, index) => {
                    const isActive = item.path && location.pathname === item.path;
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          item.action();
                          setShowMenu(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          isActive 
                            ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-900 font-semibold' 
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-yellow-700' : (item.accent || 'text-slate-600')}`} />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
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
