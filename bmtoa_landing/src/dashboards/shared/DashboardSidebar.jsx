import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/**
 * Dashboard Sidebar Component
 * Dynamic navigation based on user type
 * Supabase-ready with role-based menu items
 */
const DashboardSidebar = ({ userType, user, isOpen, isMobileOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();

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
      { name: 'Bulk Booking', icon: '📅', path: '/corporate/bulk-booking' },
      { name: 'Employees', icon: '👥', path: '/corporate/employees' },
      { name: 'Analytics', icon: '📈', path: '/corporate/analytics' },
      { name: 'Billing', icon: '💰', path: '/corporate/billing' },
      { name: 'Scheduled Rides', icon: '🕐', path: '/corporate/scheduled-rides' },
      { name: 'Reports', icon: '📄', path: '/corporate/reports' },
      { name: 'Settings', icon: '⚙️', path: '/corporate/settings' },
    ],
    driver: [
      { name: 'Dashboard', icon: '📊', path: '/driver/dashboard' },
      { name: 'Earnings', icon: '💵', path: '/driver/earnings' },
      { name: 'Ride Requests', icon: '🔔', path: '/driver/ride-requests' },
      { name: 'My Rides', icon: '🚗', path: '/driver/rides' },
      { name: 'Schedule', icon: '📅', path: '/driver/schedule' },
      { name: 'Documents', icon: '📄', path: '/driver/documents' },
      { name: 'Performance', icon: '📈', path: '/driver/performance' },
      { name: 'Support', icon: '❓', path: '/driver/support' },
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
          { name: 'Corporate Accounts', icon: '🏢', path: '/admin/corporate-accounts' },
          { name: 'Invoices', icon: '📄', path: '/admin/invoices' },
          { name: 'Corporate Reports', icon: '📊', path: '/admin/corporate-reports' },
          { name: 'Payment Verification', icon: '💳', path: '/admin/payments' },
          { name: 'Announcements', icon: '📢', path: '/admin/content' },
        ]
      },
      {
        name: 'BMTOA',
        icon: '🏢',
        isDropdown: true,
        children: [
          { name: 'Members', icon: '👥', path: '/admin/members' },
          { name: 'Membership Requests', icon: '📋', path: '/admin/member-requests' },
          { name: 'Driver Verification', icon: '🚗', path: '/admin/driver-verification' },
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
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-slate-700 text-white ${
          isOpen ? 'w-64' : 'w-20'
        } hidden lg:block`}
      >
        {/* Logo - Clickable to navigate to landing page */}
        <div
          className="h-16 flex items-center justify-center border-b border-slate-600 cursor-pointer hover:bg-slate-600 transition-colors"
          onClick={() => navigate('/')}
          title="Go to BMTOA Home"
        >
          {isOpen ? (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                <span className="text-slate-700 font-bold text-lg">B</span>
              </div>
              <span className="font-bold text-lg">BMTOA</span>
            </div>
          ) : (
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <span className="text-slate-700 font-bold text-lg">B</span>
            </div>
          )}
        </div>

        {/* Dashboard Title */}
        {isOpen && (
          <div className="px-6 py-4 border-b border-slate-600">
            <h2 className="text-sm font-semibold text-yellow-400">{dashboardTitle}</h2>
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-6 px-3 overflow-y-auto scrollbar-slate" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          {menuItems.map((item) => (
            <div key={item.name}>
              {item.isDropdown ? (
                // Dropdown Menu Item
                <div className="mb-2">
                  <button
                    onClick={() => toggleDropdown(item.name)}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-slate-600 text-white transition-colors"
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
                              ? 'bg-yellow-400 text-slate-700'
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
                      ? 'bg-yellow-400 text-slate-700'
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
        </nav>

        {/* User Info */}
        {isOpen && user && (
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
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-slate-700 text-white transform transition-transform duration-300 lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo - Clickable to navigate to landing page */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-600">
          <div
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              navigate('/');
              onClose();
            }}
            title="Go to BMTOA Home"
          >
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <span className="text-slate-700 font-bold text-lg">B</span>
            </div>
            <span className="font-bold text-lg">BMTOA</span>
          </div>
          <button onClick={onClose} className="text-white hover:text-yellow-400">
            ✕
          </button>
        </div>

        {/* Dashboard Title */}
        <div className="px-6 py-4 border-b border-slate-600">
          <h2 className="text-sm font-semibold text-yellow-400">{dashboardTitle}</h2>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3 overflow-y-auto scrollbar-slate" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          {menuItems.map((item) => (
            <div key={item.name}>
              {item.isDropdown ? (
                // Dropdown Menu Item
                <div className="mb-2">
                  <button
                    onClick={() => toggleDropdown(item.name)}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-slate-600 text-white transition-colors"
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
                              ? 'bg-yellow-400 text-slate-700'
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
                      ? 'bg-yellow-400 text-slate-700'
                      : 'hover:bg-slate-600 text-white'
                  }`}
                >
                  <Icon name={item.icon} className="text-lg flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* User Info */}
        {user && (
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

