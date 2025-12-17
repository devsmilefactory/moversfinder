/**
 * BMTOA Platform Dashboards - Main Export File
 * 
 * This file exports all dashboard components for easy importing
 * throughout your application.
 * 
 * Usage:
 * import { IndividualDashboard, CorporateDashboard } from './dashboards';
 */

// Dashboard Components
export { default as IndividualDashboard } from './individual/IndividualDashboard';
export { default as CorporateDashboard } from './corporate/CorporateDashboard';
export { default as DriverDashboard } from './driver/DriverDashboard';
export { default as OperatorDashboard } from './operator/OperatorDashboard';
export { default as AdminDashboard } from './admin/AdminDashboard';

// Shared Components
export { default as DashboardLayout } from './shared/DashboardLayout';
export { default as DashboardSidebar } from './shared/DashboardSidebar';
export { default as DashboardHeader } from './shared/DashboardHeader';
export { default as StatsCard } from './shared/StatsCard';
export { default as DataTable } from './shared/DataTable';
export { LineChart, BarChart, PieChart } from './shared/Charts';

/**
 * Dashboard Routes Configuration
 * 
 * Use this configuration to set up your routes
 */
export const DASHBOARD_ROUTES = {
  individual: '/user/dashboard',
  corporate: '/corporate/dashboard',
  driver: '/driver/dashboard',
  taxi_operator: '/operator/dashboard',
  admin: '/admin/dashboard',
};

/**
 * User Type Constants
 * 
 * Use these constants throughout your app for consistency
 */
export const USER_TYPES = {
  INDIVIDUAL: 'individual',
  CORPORATE: 'corporate',
  DRIVER: 'driver',
  TAXI_OPERATOR: 'taxi_operator',
  ADMIN: 'admin',
};

/**
 * Platform Constants
 */
export const PLATFORMS = {
  TAXICAB: 'taxicab',
  BMTOA: 'bmtoa',
  BOTH: 'both',
};

/**
 * Helper function to get dashboard component by user type
 * 
 * @param {string} userType - The user type (individual, corporate, driver, taxi_operator, admin)
 * @returns {React.Component} The corresponding dashboard component
 */
export const getDashboardComponent = (userType) => {
  const dashboards = {
    [USER_TYPES.INDIVIDUAL]: IndividualDashboard,
    [USER_TYPES.CORPORATE]: CorporateDashboard,
    [USER_TYPES.DRIVER]: DriverDashboard,
    [USER_TYPES.TAXI_OPERATOR]: OperatorDashboard,
    [USER_TYPES.ADMIN]: AdminDashboard,
  };

  return dashboards[userType] || null;
};

/**
 * Helper function to get dashboard route by user type
 * 
 * @param {string} userType - The user type
 * @returns {string} The dashboard route
 */
export const getDashboardRoute = (userType) => {
  return DASHBOARD_ROUTES[userType] || '/';
};

/**
 * Helper function to check if user has access to a platform
 * 
 * @param {string} userType - The user type
 * @param {string} platform - The platform (taxicab or bmtoa)
 * @returns {boolean} Whether the user has access
 */
export const hasAccessToPlatform = (userType, platform) => {
  const access = {
    [USER_TYPES.INDIVIDUAL]: [PLATFORMS.TAXICAB],
    [USER_TYPES.CORPORATE]: [PLATFORMS.TAXICAB],
    [USER_TYPES.DRIVER]: [PLATFORMS.TAXICAB, PLATFORMS.BMTOA],
    [USER_TYPES.TAXI_OPERATOR]: [PLATFORMS.BMTOA],
    [USER_TYPES.ADMIN]: [PLATFORMS.TAXICAB, PLATFORMS.BMTOA],
  };

  return access[userType]?.includes(platform) || false;
};

/**
 * Zimbabwean Document Types
 * Required for driver compliance
 */
export const DOCUMENT_TYPES = {
  DRIVERS_LICENSE: 'drivers_license',
  PSV_PERMIT: 'psv_permit',
  VEHICLE_REGISTRATION: 'vehicle_registration',
  FITNESS_CERTIFICATE: 'fitness_certificate',
  INSURANCE_CERTIFICATE: 'insurance_certificate',
  TAX_CLEARANCE: 'tax_clearance',
  BMTOA_MEMBERSHIP_CARD: 'bmtoa_membership_card',
};

/**
 * Document Type Labels
 */
export const DOCUMENT_LABELS = {
  [DOCUMENT_TYPES.DRIVERS_LICENSE]: "Driver's License",
  [DOCUMENT_TYPES.PSV_PERMIT]: 'Public Service Vehicle Permit',
  [DOCUMENT_TYPES.VEHICLE_REGISTRATION]: 'Vehicle Registration',
  [DOCUMENT_TYPES.FITNESS_CERTIFICATE]: 'Vehicle Fitness Certificate',
  [DOCUMENT_TYPES.INSURANCE_CERTIFICATE]: 'Insurance Certificate',
  [DOCUMENT_TYPES.TAX_CLEARANCE]: 'Tax Clearance',
  [DOCUMENT_TYPES.BMTOA_MEMBERSHIP_CARD]: 'BMTOA Membership Card',
};

/**
 * Membership Tiers
 */
export const MEMBERSHIP_TIERS = {
  BASIC: 'basic',
  PREMIUM: 'premium',
};

/**
 * Corporate Account Tiers
 */
export const CORPORATE_TIERS = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
};

/**
 * Ride Status Constants
 */
export const RIDE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/**
 * Service Types
 */
export const SERVICE_TYPES = {
  STANDARD: 'standard',
  SCHEDULED: 'scheduled',
  PACKAGE_DELIVERY: 'package_delivery',
  CORPORATE: 'corporate',
  RECURRING: 'recurring',
};

/**
 * Payment Methods
 */
export const PAYMENT_METHODS = {
  ECOCASH: 'ecocash',
  BANK_TRANSFER: 'bank_transfer',
  CASH: 'cash',
  USD_CARD: 'usd_card',
};

/**
 * Vehicle Status
 */
export const VEHICLE_STATUS = {
  ACTIVE: 'active',
  MAINTENANCE: 'maintenance',
  OFFLINE: 'offline',
  RETIRED: 'retired',
};

/**
 * Driver Status
 */
export const DRIVER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  INACTIVE: 'inactive',
};

/**
 * Support Ticket Priority
 */
export const TICKET_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

/**
 * Support Ticket Status
 */
export const TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

/**
 * Color Scheme
 * BMTOA brand colors
 */
export const COLORS = {
  PRIMARY: '#334155', // Slate-700
  ACCENT: '#FFC107', // Yellow
  SUCCESS: '#10B981', // Green
  WARNING: '#F59E0B', // Orange
  ERROR: '#EF4444', // Red
  INFO: '#3B82F6', // Blue
};

/**
 * Default Export
 * All dashboards and utilities
 */
export default {
  // Components
  IndividualDashboard,
  CorporateDashboard,
  DriverDashboard,
  OperatorDashboard,
  AdminDashboard,
  DashboardLayout,
  DashboardSidebar,
  DashboardHeader,
  StatsCard,
  DataTable,
  LineChart,
  BarChart,
  PieChart,
  
  // Constants
  DASHBOARD_ROUTES,
  USER_TYPES,
  PLATFORMS,
  DOCUMENT_TYPES,
  DOCUMENT_LABELS,
  MEMBERSHIP_TIERS,
  CORPORATE_TIERS,
  RIDE_STATUS,
  SERVICE_TYPES,
  PAYMENT_METHODS,
  VEHICLE_STATUS,
  DRIVER_STATUS,
  TICKET_PRIORITY,
  TICKET_STATUS,
  COLORS,
  
  // Helpers
  getDashboardComponent,
  getDashboardRoute,
  hasAccessToPlatform,
};

