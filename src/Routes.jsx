import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import useProfileStore from './stores/profileStore';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { redirectToDashboard } from './lib/routing';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Pages
import ModeSelection from './pages/ModeSelection';

// Dashboards
const IndividualDashboard = React.lazy(() => import('./dashboards/client/IndividualDashboard'));

// PWA Booking Pages
const BookRidePage = React.lazy(() => import('./dashboards/client/pages/BookRidePage'));
const CorporateBookingPage = React.lazy(() => import('./dashboards/client/pages/CorporateBookingPage'));


// Individual Pages
const IndividualRidesPage = React.lazy(() => import('./dashboards/client/pages/IndividualRidesPage'));
const IndividualProfilePage = React.lazy(() => import('./dashboards/client/pages/IndividualProfilePage'));
const PassengerInvoicesPage = React.lazy(() => import('./dashboards/shared/InvoicesPage'));

// Corporate Pages
const CorporateDashboardPage = React.lazy(() => import('./dashboards/client/pages/CorporateDashboardPage'));
const CorporateEmployeesPage = React.lazy(() => import('./dashboards/client/pages/CorporateEmployeesPage'));
const CorporateRidesPage = React.lazy(() => import('./dashboards/client/pages/CorporateRidesPage'));
const CorporateProfilePage = React.lazy(() => import('./dashboards/client/pages/CorporateProfilePage'));
const CorporateInvoicesPage = React.lazy(() => import('./dashboards/shared/InvoicesPage'));

// Driver Pages
const RideRequestsPage = React.lazy(() => import('./dashboards/driver/pages/RideRequestsPage'));
const EarningsPage = React.lazy(() => import('./dashboards/driver/pages/EarningsPage'));
const MyRidesPage = React.lazy(() => import('./dashboards/driver/pages/MyRidesPage'));
const ProfilePage = React.lazy(() => import('./dashboards/driver/pages/ProfilePage'));
const DriverInvoicesPage = React.lazy(() => import('./dashboards/shared/InvoicesPage'));

// Status Pages
const IndividualStatusPage = React.lazy(() => import('./pages/status/IndividualStatusPage'));
const CorporateStatusPage = React.lazy(() => import('./pages/status/CorporateStatusPage'));
const DriverStatusPage = React.lazy(() => import('./pages/status/DriverStatusPage'));
const OperatorStatusPage = React.lazy(() => import('./pages/status/OperatorStatusPage'));

// Operator Pages
const OperatorProfilePage = React.lazy(() => import('./pages/operator/OperatorProfilePage'));
const OperatorDashboardPage = React.lazy(() => import('./pages/operator/OperatorDashboardPage'));
const FleetManagementPage = React.lazy(() => import('./pages/operator/FleetManagementPage'));
const DriversManagementPage = React.lazy(() => import('./pages/operator/DriversManagementPage'));



/**
 * Root Redirect - Handles automatic routing based on user type and profile status
 * Redirects users to their appropriate dashboard/screen based on:
 * 1. User type (individual, corporate, driver)
 * 2. Profile completion status
 * 3. Approval status
 */
const RootRedirect = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeProfileType, profileLoading, availableProfiles } = useProfileStore();

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }

    // IMPORTANT:
    // Route based on the *selected/active profile* (multi-profile), not the account's primary user_type.
    // This prevents driver accounts browsing as passengers from being forced into driver profile/status flows.
    const selectedProfileType =
      activeProfileType ||
      user.active_profile_type ||
      user.last_selected_profile_type ||
      user.last_used_profile ||
      user.user_type;

    // If profiles are still loading and we don't yet know the active profile, wait.
    if (profileLoading && !activeProfileType && (!availableProfiles || availableProfiles.length === 0)) {
      return;
    }

    // Delegate routing logic to centralized util (reads type-specific tables),
    // but override user_type with the selected profile so driver-only checks don't run in passenger mode.
    redirectToDashboard({ ...user, user_type: selectedProfileType }, navigate);
  }, [user, navigate, activeProfileType, profileLoading, availableProfiles]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
};

/**
 * App Routes Configuration
 * Handles routing for PWA with client and driver modes
 *
 * Routes:
 * - / : Mode selection (for authenticated users) - auto-routes if preferred_mode is set
 * - /user/dashboard : Individual client dashboard
 * - /user/book-ride : PWA-style booking page for individuals
 * - /corporate/dashboard : Corporate client dashboard
 * - /corporate/book-ride : PWA-style booking page for corporate
 * - /driver/dashboard : Driver dashboard
 * - /driver/rides : Driver rides feed (primary interface after login)
 */
const AppRoutes = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { activeProfileType } = useProfileStore();

  // Redirect to appropriate page based on last selected profile type
  const getDefaultRoute = () => {
    if (!isAuthenticated || !user) {
      return '/';
    }

    // Prefer the actively selected profile (multi-profile) over stale authStore fields.
    const selectedProfileType =
      activeProfileType ||
      user.active_profile_type ||
      user.last_selected_profile_type ||
      user.last_used_profile ||
      user.user_type;

    if (selectedProfileType === 'individual') return '/user/book-ride';
    if (selectedProfileType === 'corporate') return '/corporate/book-ride';
    if (selectedProfileType === 'driver') return '/driver/rides';

    // Check for last selected profile type (remembers user's choice)
    if (user.last_selected_profile_type) {
      const profileType = user.last_selected_profile_type;

      if (profileType === 'individual') {
        return '/user/book-ride';
      } else if (profileType === 'corporate') {
        return '/corporate/book-ride';
      } else if (profileType === 'driver') {
        return '/driver/rides';
      }
    }

    // Fallback: If no last selection, route based on user_type
    // This handles first-time logins
    if (user.user_type === 'corporate') {
      return '/corporate/book-ride';
    } else if (user.user_type === 'driver') {
      return '/'; // Show mode selection for drivers
    }

    return '/user/book-ride';
  };

  return (
    <Routes>
      {/* Public Routes - Login & Register */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Root - Auto-routes based on user type and profile status */}
      <Route
        path="/"
        element={
          isAuthenticated && user ? (
            <RootRedirect />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Mode Selection - Keep for manual profile switching */}
      <Route
        path="/mode-selection"
        element={
          isAuthenticated && user ? (
            <ModeSelection />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Individual Client Dashboard */}
      <Route
        path="/user/dashboard"
        element={
          <ProtectedRoute requiredProfile="individual">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <IndividualDashboard />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Individual Book Ride - PWA Style */}
      <Route
        path="/user/book-ride"
        element={
          <ProtectedRoute requiredProfile="individual">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>

              <BookRidePage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Corporate Client Dashboard - PWA Style */}
      <Route
        path="/corporate/dashboard"
        element={
          <ProtectedRoute requiredProfile="corporate">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <CorporateDashboardPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Corporate Book Ride - PWA Style */}
      <Route
        path="/corporate/book-ride"
        element={
          <ProtectedRoute requiredProfile="corporate">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <CorporateBookingPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />


      {/* Individual My Rides */}
      <Route
        path="/user/rides"
        element={
          <ProtectedRoute requiredProfile="individual">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <IndividualRidesPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Individual Invoices */}
      <Route
        path="/user/invoices"
        element={
          <ProtectedRoute requiredProfile="individual">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <PassengerInvoicesPage profileType="individual" />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Individual Profile */}
      <Route
        path="/user/profile"
        element={
          <ProtectedRoute requiredProfile="individual">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <IndividualProfilePage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Corporate Employees - PWA Style */}
      <Route
        path="/corporate/employees"
        element={
          <ProtectedRoute requiredProfile="corporate">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <CorporateEmployeesPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Corporate Rides - PWA Style */}
      <Route
        path="/corporate/rides"
        element={
          <ProtectedRoute requiredProfile="corporate">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <CorporateRidesPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Corporate Invoices */}
      <Route
        path="/corporate/invoices"
        element={
          <ProtectedRoute requiredProfile="corporate">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <CorporateInvoicesPage profileType="corporate" />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Corporate Profile - PWA Style */}
      <Route
        path="/corporate/profile"
        element={
          <ProtectedRoute requiredProfile="corporate">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <CorporateProfilePage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Driver Dashboard - Redirect to rides (primary interface) */}
      <Route
        path="/driver/dashboard"
        element={<Navigate to="/driver/rides" replace />}
      />

      {/* Driver Rides Feed - Primary interface after login */}
      <Route
        path="/driver/rides"
        element={
          <ProtectedRoute requiredProfile="driver">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <RideRequestsPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Driver Earnings */}
      <Route
        path="/driver/earnings"
        element={
          <ProtectedRoute requiredProfile="driver">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <EarningsPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Driver Rides History */}
      <Route
        path="/driver/rides-history"
        element={
          <ProtectedRoute requiredProfile="driver">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <MyRidesPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Driver Invoices */}
      <Route
        path="/driver/invoices"
        element={
          <ProtectedRoute requiredProfile="driver">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <DriverInvoicesPage profileType="driver" />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Driver Profile */}
      <Route
        path="/driver/profile"
        element={
          <ProtectedRoute requiredProfile="driver">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <ProfilePage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Status Pages - Dynamic status based on profile state */}

      {/* Individual Status Page */}
      <Route
        path="/user/status"
        element={
          <ProtectedRoute requiredProfile="individual">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <IndividualStatusPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Corporate Status Page */}
      <Route
        path="/corporate/status"
        element={
          <ProtectedRoute requiredProfile="corporate">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <CorporateStatusPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Driver Status Page */}
      <Route
        path="/driver/status"
        element={
          <ProtectedRoute requiredProfile="driver">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <DriverStatusPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Operator Dashboard */}
      <Route
        path="/operator/dashboard"
        element={
          <ProtectedRoute requiredProfile="operator">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <OperatorDashboardPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Operator Profile (Create / Edit) */}
      <Route
        path="/operator/profile"
        element={
          <ProtectedRoute requiredProfile="operator">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <OperatorProfilePage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Operator Fleet Management */}
      <Route
        path="/operator/fleet"
        element={
          <ProtectedRoute requiredProfile="operator">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <FleetManagementPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Operator Drivers Management */}
      <Route
        path="/operator/drivers"
        element={
          <ProtectedRoute requiredProfile="operator">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <DriversManagementPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Operator Status Page */}
      <Route
        path="/operator/status"
        element={
          <ProtectedRoute requiredProfile="operator">
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
              <OperatorStatusPage />
            </React.Suspense>
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to default route */}
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
};

export default AppRoutes;

