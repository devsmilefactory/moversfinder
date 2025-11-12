import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useProfileStore from '../../stores/profileStore';
import useRidesStore from '../../stores/ridesStore';
import ProfileSwitcher from '../profiles/ProfileSwitcher';

/**
 * PWALeftDrawer
 * Unified left-side drawer for all profile types with brand-consistent styling
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - profileType?: 'individual' | 'corporate' | 'driver' | 'operator' (defaults to activeProfileType)
 */
const PWALeftDrawer = ({ open, onClose, profileType }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { activeProfileType } = useProfileStore();
  const rides = useRidesStore((state) => state.rides);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);

  const type = profileType || activeProfileType || 'individual';
  const activeRidesCount = type === 'individual'
    ? (rides || []).filter((r) => ['accepted','driver_on_way','driver_arrived','trip_started','driver_assigned','offer_accepted','driver_en_route','in_progress','journey_started'].includes(r.ride_status || r.status)).length
    : 0;

  // Unified brand scheme (yellow across all)
  const headerGradient = 'bg-gradient-to-r from-yellow-400 to-yellow-500';

  const profileMeta = {
    individual: { label: 'Passenger', icon: '👤' },
    corporate: { label: 'Corporate', icon: '🏢' },
    driver: { label: 'Driver', icon: '🚗' },
    operator: { label: 'Operator', icon: '🚕' }
  };

  const current = profileMeta[type] || profileMeta.individual;

  const handleNavigate = (path) => {
    navigate(path);
    onClose?.();
  };

  const handleSwitchProfile = () => {
    setShowProfileSwitcher(true);
  };

  const handleLogout = async () => {
    await logout();
    onClose?.();
    navigate('/login');
  };

  // Menu config per profile
  const menuByType = {
    individual: [
      { icon: '📍', label: 'Book Ride', onClick: () => handleNavigate('/user/book-ride') },
      { icon: '📜', label: 'My Rides', onClick: () => handleNavigate('/user/rides') },
      { icon: '👤', label: 'Profile', onClick: () => handleNavigate('/user/profile') },
    ],
    corporate: [
      { icon: '📍', label: 'Book Ride', onClick: () => handleNavigate('/corporate/book-ride') },
      { icon: '📊', label: 'Dashboard', onClick: () => handleNavigate('/corporate/dashboard') },
      { icon: '🚗', label: 'Rides', onClick: () => handleNavigate('/corporate/rides') },
      { icon: '🧑‍💼', label: 'Passengers', onClick: () => handleNavigate('/corporate/employees') },
      { icon: '👤', label: 'Profile', onClick: () => handleNavigate('/corporate/profile') },
    ],
    driver: [
      { icon: '🛰️', label: 'Ride Requests', onClick: () => handleNavigate('/driver/rides') },
      { icon: '💰', label: 'Earnings', onClick: () => handleNavigate('/driver/earnings') },
      { icon: '📜', label: 'My Rides', onClick: () => handleNavigate('/driver/rides-history') },
      { icon: '👤', label: 'Profile', onClick: () => handleNavigate('/driver/profile') },
    ],
    operator: [
      { icon: '🗂️', label: 'Dashboard', onClick: () => handleNavigate('/operator/dashboard') },
      { icon: 'f693', label: 'Fleet', onClick: () => handleNavigate('/operator/fleet') },
      { icon: 'f46e', label: 'Drivers', onClick: () => handleNavigate('/operator/drivers') },
      { icon: '👤', label: 'Profile', onClick: () => handleNavigate('/operator/profile') },
    ],
  };

  // Always render component so nested modals can outlive the drawer
  return (
    <>
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Drawer */}
          <div className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-[101] transform transition-transform duration-300">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className={`${headerGradient} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                      <span className="text-2xl">{current.icon}</span>
                    </div>
                    <div>
                      <span className="text-xl font-bold text-slate-800">TaxiCab</span>
                      <p className="text-xs text-slate-700">{current.label} Mode</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                    aria-label="Close menu"
                  >
                    <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* User Info */}
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="font-semibold text-slate-800 truncate">{user?.name || user?.email || current.label}</p>
                  {user?.email && <p className="text-sm text-slate-700 truncate">{user.email}</p>}
                  <p className="text-xs text-slate-700 mt-1">Current Profile: {current.label}</p>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 px-4 py-6 overflow-y-auto">
                {/* Switch Profile */}
                <button
                  onClick={handleSwitchProfile}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-yellow-50 text-yellow-700 font-semibold mb-2"
                >
                  <span className="text-2xl">🔄</span>
                  <span>Switch Profile</span>
                </button>

                <div className="space-y-2">
                  {(menuByType[type] || []).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={item.onClick}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-slate-100"
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <span className="font-medium text-slate-700">{item.label}</span>
                      {type === 'individual' && item.label === 'My Rides' && activeRidesCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-green-600 text-white text-xs min-w-[1.25rem] h-5 px-1.5">
                          {activeRidesCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-red-50 text-red-600 mt-4"
                >
                  <span className="text-2xl">🚪</span>
                  <span>Logout</span>
                </button>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200">
                <p className="text-xs text-center text-slate-500">TaxiCab PWA v1.0.0</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Profile Switcher Modal */}
      <ProfileSwitcher isOpen={showProfileSwitcher} onClose={() => setShowProfileSwitcher(false)} />
    </>
  );
};

export default PWALeftDrawer;

