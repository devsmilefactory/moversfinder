import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import LandingPage from './pages/landing-page';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';
import { ProtectedRoute } from './components/auth';
import ProfileCompletionGuard from './components/ProfileCompletionGuard';

// Import Dashboard Components
import DriverDashboard from './dashboards/driver/DriverDashboard';
import OperatorDashboard from './dashboards/operator/OperatorDashboard';
import AdminDashboard from './dashboards/admin/AdminDashboard';

// Import Dashboard Layout Wrappers
import DriverDashboardLayout from './dashboards/driver/DriverDashboardLayout';
import OperatorDashboardLayout from './dashboards/operator/OperatorDashboardLayout';
import AdminDashboardLayout from './dashboards/admin/AdminDashboardLayout';

// Import Dashboard Content Components
import DriverDashboardContent from './dashboards/driver/DriverDashboardContent';
import OperatorDashboardContent from './dashboards/operator/OperatorDashboardContent';
import AdminDashboardContent from './dashboards/admin/AdminDashboardContent';

// Driver Pages
import EarningsPage from './dashboards/driver/pages/EarningsPage';
import RideRequestsPage from './dashboards/driver/pages/RideRequestsPage';
import DriverMyRidesPage from './dashboards/driver/pages/MyRidesPage';
import SchedulePage from './dashboards/driver/pages/SchedulePage';
import DocumentsPage from './dashboards/driver/pages/DocumentsPage';
import PerformancePage from './dashboards/driver/pages/PerformancePage';
import DriverSupportPage from './dashboards/driver/pages/SupportPage';
import DriverProfilePage from './dashboards/driver/pages/ProfilePage';

// Operator Pages
import FleetManagementPage from './dashboards/operator/pages/FleetManagementPage';
import DriversPage from './dashboards/operator/pages/DriversPage';
import RevenuePage from './dashboards/operator/pages/RevenuePage';
import MembershipPage from './dashboards/operator/pages/MembershipPage';
import MaintenancePage from './dashboards/operator/pages/MaintenancePage';
import OperatorReportsPage from './dashboards/operator/pages/ReportsPage';
import OperatorSettingsPage from './dashboards/operator/pages/SettingsPage';
import OperatorProfilePage from './dashboards/operator/pages/ProfilePage';

// Admin Pages
import UsersPage from './dashboards/admin/pages/UsersPage';
import AdminAnalyticsPage from './dashboards/admin/pages/AnalyticsPage';
import ContentPage from './dashboards/admin/pages/ContentPage';
import SupportTicketsPage from './dashboards/admin/pages/SupportTicketsPage';
import FinancialPage from './dashboards/admin/pages/FinancialPage';
import AdminReportsPage from './dashboards/admin/pages/ReportsPage';
import AdminSettingsPage from './dashboards/admin/pages/SettingsPage';
import AdminUsersPage from './dashboards/admin/pages/AdminUsersPage';
import TripsPage from './dashboards/admin/pages/TripsPage';
import MembersPage from './dashboards/admin/pages/MembersPage';
import MemberRequestsPage from './dashboards/admin/pages/MemberRequestsPage';
import SubscriptionsPage from './dashboards/admin/pages/SubscriptionsPage';
import BMTOAReportsPage from './dashboards/admin/pages/BMTOAReportsPage';
import DriverVerificationPage from './dashboards/admin/pages/DriverVerificationPage';
import CorporateAccountsPage from './dashboards/admin/pages/CorporateAccountsPage';
import PaymentVerificationPage from './dashboards/admin/pages/PaymentVerificationPage';
import InvoicesPage from './dashboards/admin/pages/InvoicesPage';
import CorporateReportsPage from './dashboards/admin/pages/CorporateReportsPage';

// User Guide Pages
import UserGuideLayout from './pages/UserGuide/UserGuideLayout';
import GuideCategoryList from './pages/UserGuide/GuideCategoryList';
import GuideArticle from './pages/UserGuide/GuideArticle';
import GuideSearch from './pages/UserGuide/GuideSearch';

const Routes = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        {/* Landing Page Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing-page" element={<LandingPage />} />

        {/* Auth Routes */}
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/sign-in" element={<SignInPage />} />

        {/* Driver Routes - Nested with Outlet - Protected */}
        <Route path="/driver" element={
          <ProtectedRoute allowedUserTypes={['driver']}>
            <ProfileCompletionGuard>
              <DriverDashboardLayout />
            </ProfileCompletionGuard>
          </ProtectedRoute>
        }>
          <Route index element={<DriverDashboardContent />} />
          <Route path="dashboard" element={<DriverDashboardContent />} />
          <Route path="earnings" element={<EarningsPage />} />
          <Route path="ride-requests" element={<RideRequestsPage />} />
          <Route path="rides" element={<DriverMyRidesPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="support" element={<DriverSupportPage />} />
          <Route path="profile" element={<DriverProfilePage />} />
        </Route>

        {/* Operator Routes - Nested with Outlet - Protected */}
        <Route path="/operator" element={
          <ProtectedRoute allowedUserTypes={['taxi_operator', 'operator']}>
            <OperatorDashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<OperatorDashboardContent />} />
          <Route path="dashboard" element={<OperatorDashboardContent />} />
          <Route path="profile" element={<OperatorProfilePage />} />
          <Route path="fleet" element={<FleetManagementPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="membership" element={<MembershipPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="reports" element={<OperatorReportsPage />} />
          <Route path="settings" element={<OperatorSettingsPage />} />
        </Route>

        {/* Admin Routes - Nested with Outlet - Protected */}
        <Route path="/admin" element={
          <ProtectedRoute allowedUserTypes={['admin']}>
            <AdminDashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboardContent />} />
          <Route path="dashboard" element={<AdminDashboardContent />} />

          {/* TaxiCab Platform */}
          <Route path="users" element={<UsersPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="corporate-accounts" element={<CorporateAccountsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="corporate-reports" element={<CorporateReportsPage />} />
          <Route path="content" element={<ContentPage />} />

          {/* BMTOA */}
          <Route path="members" element={<MembersPage />} />
          <Route path="member-requests" element={<MemberRequestsPage />} />
          <Route path="driver-verification" element={<DriverVerificationPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="bmtoa-reports" element={<BMTOAReportsPage />} />
          <Route path="payments" element={<PaymentVerificationPage />} />

          {/* Legacy BMTOA routes - Redirects */}
          <Route path="onboarding-requests" element={<Navigate to="/admin/member-requests" replace />} />

          {/* Admin */}
          <Route path="admin-users" element={<AdminUsersPage />} />
          <Route path="tickets" element={<SupportTicketsPage />} />

          {/* Legacy routes - Redirects */}
          <Route path="analytics" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="support-tickets" element={<Navigate to="/admin/tickets" replace />} />
          <Route path="financial" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="reports" element={<Navigate to="/admin/bmtoa-reports" replace />} />
          <Route path="settings" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* User Guide Routes - Public */}
        <Route path="/user-guide" element={<UserGuideLayout />}>
          <Route index element={<GuideCategoryList />} />
          <Route path=":category" element={<GuideCategoryList />} />
          <Route path="article/:slug" element={<GuideArticle />} />
          <Route path="search" element={<GuideSearch />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
