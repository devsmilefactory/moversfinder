import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MapPin, FileText, User, Car, DollarSign, 
  RefreshCw, LogOut, Download, CheckCircle2,
  Building2, Users, Briefcase, Package
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useProfileStore from '../../stores/profileStore';
import useRidesStore from '../../stores/ridesStore';
import ProfileSwitcher from '../profiles/ProfileSwitcher';
import usePWAInstall from '../../hooks/usePWAInstall';
import { isActiveRideStatus } from '../../hooks/useRideStatus';

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
  const { isInstalled, canPrompt, promptInstall } = usePWAInstall();

  const location = useLocation();
  const type = profileType || activeProfileType || 'individual';
  const activeRidesCount = type === 'individual'
    ? (rides || []).filter((r) => isActiveRideStatus(r.ride_status || r.status)).length
    : 0;

  // Unified brand scheme (yellow across all)
  const headerGradient = 'bg-gradient-to-r from-yellow-400 to-yellow-500';

  const profileMeta = {
    individual: { label: 'Passenger', icon: User, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    corporate: { label: 'Corporate', icon: Building2, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    driver: { label: 'Driver', icon: Car, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    operator: { label: 'Operator', icon: Users, color: 'text-slate-600', bgColor: 'bg-slate-50' }
  };

  const current = profileMeta[type] || profileMeta.individual;
  const CurrentIcon = current.icon;

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

  // Menu config per profile with line icons
  const menuByType = {
    individual: [
      { icon: MapPin, label: 'Book Ride', path: '/user/book-ride' },
      { icon: FileText, label: 'My Rides', path: '/user/rides' },
      { icon: User, label: 'Profile', path: '/user/profile' },
    ],
    corporate: [
      { icon: MapPin, label: 'Book Ride', path: '/corporate/book-ride' },
      { icon: Briefcase, label: 'Dashboard', path: '/corporate/dashboard' },
      { icon: Car, label: 'Rides', path: '/corporate/rides' },
      { icon: Users, label: 'Passengers', path: '/corporate/employees' },
      { icon: User, label: 'Profile', path: '/corporate/profile' },
    ],
    driver: [
      { icon: MapPin, label: 'Rides', path: '/driver/rides' },
      { icon: DollarSign, label: 'Earnings', path: '/driver/earnings' },
      { icon: FileText, label: 'Rides History', path: '/driver/rides-history' },
      { icon: User, label: 'Profile', path: '/driver/profile' },
    ],
    operator: [
      { icon: Briefcase, label: 'Dashboard', path: '/operator/dashboard' },
      { icon: Car, label: 'Fleet', path: '/operator/fleet' },
      { icon: Users, label: 'Drivers', path: '/operator/drivers' },
      { icon: User, label: 'Profile', path: '/operator/profile' },
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
                    <div className={`w-12 h-12 ${current.bgColor} rounded-full flex items-center justify-center border-2 border-white shadow-md`}>
                      <CurrentIcon className={`w-6 h-6 ${current.color}`} />
                    </div>
                    <div>
                      <span className="text-xl font-bold text-slate-800">TaxiCab</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        <p className="text-xs font-semibold text-white">{current.label} Mode</p>
                      </div>
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
                      <CurrentIcon className={`w-4 h-4 ${current.color}`} />
                      <p className="text-xs font-bold text-slate-800">
                        Active profile: {current.label}
                      </p>
                    </div>
                    <button
                      onClick={handleSwitchProfile}
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
                  {(menuByType[type] || []).map((item, idx) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleNavigate(item.path)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          isActive 
                            ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-900 font-semibold' 
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-yellow-700' : 'text-slate-600'}`} />
                        <span className="font-medium">{item.label}</span>
                        {type === 'individual' && item.label === 'My Rides' && activeRidesCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center rounded-full bg-green-600 text-white text-xs min-w-[1.25rem] h-5 px-1.5">
                            {activeRidesCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-red-50 text-red-600 mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200">
                <button
                  onClick={promptInstall}
                  className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-500 transition-colors"
                >
                  {isInstalled ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span>{isInstalled ? 'Installed' : 'Install App'}</span>
                </button>
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

