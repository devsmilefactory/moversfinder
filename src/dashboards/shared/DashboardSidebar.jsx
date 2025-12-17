import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Dashboard Sidebar Component
 * Dynamic navigation based on user type
 * Supabase-ready with role-based menu items
 */
const DashboardSidebar = ({ userType, user, isOpen, isMobileOpen, onClose }) => {
  const location = useLocation();

  // Dashboard type titles
  const dashboardTitles = {
    individual: '👤 Individual Dashboard',
    corporate: '🏢 Corporate Dashboard',
    driver: '🚗 Driver Dashboard',
    taxi_operator: '🚕 Operator Dashboard',
    admin: '⚙️ Admin Dashboard'
  };

  // Navigation items based on user type
  const navigationItems = {
    individual: [
      { name: 'Dashboard', icon: '📊', path: '/user/dashboard' },
      { name: 'Book a Ride', icon: '🚕', path: '/user/book-ride' },
      { name: 'My Rides', icon: '📜', path: '/user/rides' },
      { name: 'Saved Trips', icon: '⭐', path: '/user/saved-trips' },
      { name: 'Saved Places', icon: '📍', path: '/user/saved-places' },
      { name: 'Payments', icon: '💳', path: '/user/payments' },
      { name: 'Profile', icon: '👤', path: '/user/profile' },
      { name: 'Support', icon: '❓', path: '/user/support' },
    ],
    corporate: [
      { name: 'Dashboard', icon: '📊', path: '/corporate/dashboard' },
      { name: 'Bulk Booking', icon: '📦', path: '/corporate/bulk-booking' },
      { name: 'Scheduled Trips', icon: '📅', path: '/corporate/scheduled-trips' },
      { name: 'My Rides', icon: '📜', path: '/corporate/rides' },
      { name: 'Passengers', icon: '👥', path: '/corporate/passengers' },
      { name: 'Account Top-Up', icon: '💰', path: '/corporate/top-up' },
      { name: 'Billing', icon: '💳', path: '/corporate/billing' },
      { name: 'Reports', icon: '📊', path: '/corporate/reports' },
      { name: 'Settings', icon: '⚙️', path: '/corporate/settings' },
    ],
    driver: [
      { name: 'Earnings', icon: '💵', path: '/driver/earnings' },
      { name: 'Rides History', icon: '📋', path: '/driver/rides' },
      { name: 'Profile', icon: '👤', path: '/driver/profile' },
    ],
    taxi_operator: [
      { name: 'Dashboard', icon: '📊', path: '/operator/dashboard' },
      { name: 'Fleet Management', icon: '🚗', path: '/operator/fleet' },
      { name: 'Drivers', icon: '👥', path: '/operator/drivers' },
      { name: 'Revenue', icon: '💵', path: '/operator/revenue' },
      { name: 'Membership', icon: '🏆', path: '/operator/membership' },
      { name: 'Maintenance', icon: '🔧', path: '/operator/maintenance' },
      { name: 'Reports', icon: '📄', path: '/operator/reports' },
      { name: 'Settings', icon: '⚙️', path: '/operator/settings' },
    ],
    admin: [
      { name: 'Dashboard', icon: '📊', path: '/admin/dashboard' },
      {
        name: 'TaxiCab Platform',
        icon: '🚕',
        isDropdown: true,
        children: [
          { name: 'Users', icon: '👥', path: '/admin/users' },
          { name: 'Trips', icon: '🗺️', path: '/admin/trips' },
          { name: 'Content', icon: '📝', path: '/admin/content' },
        ]
      },
      {
        name: 'BMTOA',
        icon: '🏢',
        isDropdown: true,
        children: [
          { name: 'Members', icon: '👥', path: '/admin/members' },
          { name: 'Member Requests', icon: '📋', path: '/admin/member-requests' },
          { name: 'Subscriptions', icon: '💳', path: '/admin/subscriptions' },
          { name: 'Reports', icon: '📄', path: '/admin/bmtoa-reports' },
        ]
      },
      {
        name: 'Admin',
        icon: '⚙️',
        isDropdown: true,
        children: [
          { name: 'Admin Users', icon: '👤', path: '/admin/admin-users' },
          { name: 'Tickets', icon: '🎫', path: '/admin/tickets' },
        ]
      },
    ],
  };

  const menuItems = navigationItems[userType] || navigationItems.individual;
  const dashboardTitle = dashboardTitles[userType] || dashboardTitles.individual;

  const [openDropdowns, setOpenDropdowns] = React.useState({});

  const isActive = (path) => location.pathname === path;

  const toggleDropdown = (itemName) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  // Icon component - using emoji icons
  const Icon = ({ name, className }) => (
    <span className={className}>{name}</span>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ${
          userType === 'driver' ? 'bg-white' : 'bg-slate-700 text-white'
        } ${
          isOpen ? 'w-64' : 'w-20'
        } hidden lg:block`}
      >
        {/* Logo/Header - Yellow for driver, dark for others */}
        <div className={`${userType === 'driver' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 p-6' : 'h-16 flex items-center justify-center border-b border-slate-600'}`}>
          {userType === 'driver' && isOpen ? (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <span className="text-2xl">🚗</span>
                </div>
                <span className="font-bold text-xl text-slate-800">TaxiCab</span>
              </div>
              {user && (
                <div className="bg-white/20 rounded-xl p-3 border border-white/30">
                  <p className="font-semibold text-slate-800 truncate text-sm">{user.name || user.email}</p>
                  <p className="text-xs text-slate-700 truncate">{user.email}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs">⭐</span>
                    <p className="text-xs font-semibold text-slate-800">Driver Mode</p>
                  </div>
                </div>
              )}
            </div>
          ) : userType !== 'driver' && isOpen ? (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                <span className="text-slate-700 font-bold text-lg">T</span>
              </div>
              <span className="font-bold text-lg">TaxiCab</span>
            </div>
          ) : (
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <span className="text-slate-700 font-bold text-lg">T</span>
            </div>
          )}
        </div>

        {/* Dashboard Title - Only for non-driver */}
        {isOpen && userType !== 'driver' && (
          <div className="px-6 py-4 border-b border-slate-600">
            <h2 className="text-sm font-semibold text-yellow-400">{dashboardTitle}</h2>
          </div>
        )}

        {/* Switch Profile Button - Driver only, separate from navigation */}
        {userType === 'driver' && isOpen && (
          <div className="px-3 mt-4">
            <button
              onClick={() => {/* TODO: Add profile switcher */}}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-slate-900 font-semibold shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <span className="text-yellow-500 text-lg">🔄</span>
              <span>Switch Profile</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className={`${userType === 'driver' ? 'mt-4' : 'mt-6'} px-3 overflow-y-auto scrollbar-slate`} style={{ maxHeight: 'calc(100vh - 250px)' }}>
          {menuItems.map((item) => (
            <div key={item.name}>
              {item.isDropdown ? (
                // Dropdown Menu Item
                <div className="mb-2">
                  <button
                    onClick={() => toggleDropdown(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${
                      userType === 'driver' 
                        ? 'hover:bg-slate-100 text-slate-700' 
                        : 'hover:bg-slate-600 text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon name={item.icon} className="text-lg flex-shrink-0" />
                      {isOpen && <span className="font-medium">{item.name}</span>}
                    </div>
                    {isOpen && (
                      <span className={`transition-transform ${openDropdowns[item.name] ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    )}
                  </button>
                  {isOpen && openDropdowns[item.name] && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                            isActive(child.path)
                              ? userType === 'driver' 
                                ? 'bg-yellow-100 border-2 border-yellow-400 text-slate-900'
                                : 'bg-yellow-400 text-slate-700'
                              : userType === 'driver'
                                ? 'hover:bg-slate-100 text-slate-700'
                                : 'hover:bg-slate-600 text-white'
                          }`}
                        >
                          <Icon name={child.icon} className="text-sm flex-shrink-0" />
                          <span className="text-sm">{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Regular Menu Item
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg mb-2 transition-colors ${
                    isActive(item.path)
                      ? userType === 'driver'
                        ? 'bg-yellow-100 border-2 border-yellow-400 text-slate-900 font-semibold'
                        : 'bg-yellow-400 text-slate-700'
                      : userType === 'driver'
                        ? 'hover:bg-slate-100 text-slate-700'
                        : 'hover:bg-slate-600 text-white'
                  }`}
                  title={!isOpen ? item.name : ''}
                >
                  <Icon name={item.icon} className="text-lg flex-shrink-0" />
                  {isOpen && <span className="font-medium">{item.name}</span>}
                </Link>
              )}
            </div>
          ))}
          
          {/* Logout - Driver style */}
          {userType === 'driver' && isOpen && (
            <button
              onClick={() => {/* TODO: Add logout */}}
              className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg mb-2 transition-colors hover:bg-red-50 text-red-600 mt-4"
            >
              <span className="text-lg">🚪</span>
              <span className="font-medium">Logout</span>
            </button>
          )}
        </nav>

        {/* Footer - Driver Install App Button */}
        {isOpen && userType === 'driver' && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-500 transition-colors mb-2">
              <span className="text-lg">⬇️</span>
              <span>Install App</span>
            </button>
            <p className="text-xs text-center text-slate-500">TaxiCab PWA v1.0.0</p>
          </div>
        )}

        {/* User Info - Non-driver */}
        {isOpen && user && userType !== 'driver' && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-600">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-slate-700 font-bold">
                  {user.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-slate-300 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 ${
          userType === 'driver' ? 'bg-white' : 'bg-slate-700 text-white'
        } transform transition-transform duration-300 lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo/Header */}
        <div className={userType === 'driver' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 p-6' : 'h-16 flex items-center justify-between px-4 border-b border-slate-600'}>
          {userType === 'driver' ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <span className="text-2xl">🚗</span>
                  </div>
                  <span className="font-bold text-xl text-slate-800">TaxiCab</span>
                </div>
                <button onClick={onClose} className="text-slate-800 hover:text-slate-600">
                  ✕
                </button>
              </div>
              {user && (
                <div className="bg-white/20 rounded-xl p-3 border border-white/30">
                  <p className="font-semibold text-slate-800 truncate text-sm">{user.name || user.email}</p>
                  <p className="text-xs text-slate-700 truncate">{user.email}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs">⭐</span>
                    <p className="text-xs font-semibold text-slate-800">Driver Mode</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <span className="text-slate-700 font-bold text-lg">T</span>
                </div>
                <span className="font-bold text-lg">TaxiCab</span>
              </div>
              <button onClick={onClose} className="text-white hover:text-yellow-400">
                ✕
              </button>
            </>
          )}
        </div>

        {/* Dashboard Title - Non-driver only */}
        {userType !== 'driver' && (
          <div className="px-6 py-4 border-b border-slate-600">
            <h2 className="text-sm font-semibold text-yellow-400">{dashboardTitle}</h2>
          </div>
        )}

        {/* Switch Profile Button - Driver only, separate from navigation */}
        {userType === 'driver' && (
          <div className="px-3 mt-4">
            <button
              onClick={() => {/* TODO: Add profile switcher */}}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-slate-900 font-semibold shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <span className="text-yellow-500 text-lg">🔄</span>
              <span>Switch Profile</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className={`${userType === 'driver' ? 'mt-4' : 'mt-6'} px-3 overflow-y-auto scrollbar-slate`} style={{ maxHeight: 'calc(100vh - 250px)' }}>
          {menuItems.map((item) => (
            <div key={item.name}>
              {item.isDropdown ? (
                // Dropdown Menu Item
                <div className="mb-2">
                  <button
                    onClick={() => toggleDropdown(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${
                      userType === 'driver'
                        ? 'hover:bg-slate-100 text-slate-700'
                        : 'hover:bg-slate-600 text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon name={item.icon} className="text-lg flex-shrink-0" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className={`transition-transform ${openDropdowns[item.name] ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {openDropdowns[item.name] && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onClose}
                          className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                            isActive(child.path)
                              ? userType === 'driver'
                                ? 'bg-yellow-100 border-2 border-yellow-400 text-slate-900'
                                : 'bg-yellow-400 text-slate-700'
                              : userType === 'driver'
                                ? 'hover:bg-slate-100 text-slate-700'
                                : 'hover:bg-slate-600 text-white'
                          }`}
                        >
                          <Icon name={child.icon} className="text-sm flex-shrink-0" />
                          <span className="text-sm">{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Regular Menu Item
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg mb-2 transition-colors ${
                    isActive(item.path)
                      ? userType === 'driver'
                        ? 'bg-yellow-100 border-2 border-yellow-400 text-slate-900 font-semibold'
                        : 'bg-yellow-400 text-slate-700'
                      : userType === 'driver'
                        ? 'hover:bg-slate-100 text-slate-700'
                        : 'hover:bg-slate-600 text-white'
                  }`}
                >
                  <Icon name={item.icon} className="text-lg flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )}
            </div>
          ))}
          
          {/* Logout - Driver style */}
          {userType === 'driver' && (
            <button
              onClick={() => {/* TODO: Add logout */}}
              className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg mb-2 transition-colors hover:bg-red-50 text-red-600 mt-4"
            >
              <span className="text-lg">🚪</span>
              <span className="font-medium">Logout</span>
            </button>
          )}
        </nav>

        {/* Footer - Driver Install App */}
        {userType === 'driver' && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-500 transition-colors mb-2">
              <span className="text-lg">⬇️</span>
              <span>Install App</span>
            </button>
            <p className="text-xs text-center text-slate-500">TaxiCab PWA v1.0.0</p>
          </div>
        )}

        {/* User Info - Non-driver */}
        {user && userType !== 'driver' && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-600">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-slate-700 font-bold">
                  {user.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-slate-300 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default DashboardSidebar;

