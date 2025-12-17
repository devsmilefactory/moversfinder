/**
 * Service Types Configuration
 * 
 * Centralized configuration for all service types used across the application.
 * This eliminates duplication and ensures consistent icons, colors, and labels.
 */

import { Car, Package, ShoppingBag, GraduationCap, Briefcase } from 'lucide-react';

/**
 * Service type configuration mapping
 * Maps service type keys to their display properties
 */
export const SERVICE_TYPE_CONFIG = {
  taxi: {
    icon: Car,
    label: 'Taxi',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  courier: {
    icon: Package,
    label: 'Courier',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  errand: {
    icon: ShoppingBag,
    label: 'Errand',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  errands: {
    icon: ShoppingBag,
    label: 'Errands',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  school_run: {
    icon: GraduationCap,
    label: 'School Run',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  work_run: {
    icon: Briefcase,
    label: 'Work Run',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200'
  }
};

/**
 * Get service type configuration
 * @param {string} serviceType - The service type key
 * @returns {Object} Service type configuration object
 */
export function getServiceTypeConfig(serviceType) {
  if (!serviceType) {
    return SERVICE_TYPE_CONFIG.taxi; // Default fallback
  }
  
  const normalized = String(serviceType).trim().toLowerCase();
  return SERVICE_TYPE_CONFIG[normalized] || SERVICE_TYPE_CONFIG.taxi;
}

/**
 * Get all available service types
 * @returns {Array<string>} Array of service type keys
 */
export function getAvailableServiceTypes() {
  return Object.keys(SERVICE_TYPE_CONFIG).filter(key => key !== 'errands'); // Exclude duplicate
}
