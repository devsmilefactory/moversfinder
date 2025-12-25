/**
 * Ride Type Handlers
 * 
 * Modular system for handling ride-type-specific requirements across the application.
 * This allows each ride type to define its own:
 * - Display components
 * - Status handling
 * - Progress tracking
 * - Cost calculations
 * - Action buttons
 * - Validation rules
 * 
 * Usage:
 *   import { getRideTypeHandler } from './utils/rideTypeHandlers';
 *   const handler = getRideTypeHandler(ride.service_type);
 *   const component = handler.renderActiveRideDetails(ride);
 */

import React from 'react';
import { Car, Package, ShoppingBag, GraduationCap, Briefcase } from 'lucide-react';
import { normalizeServiceType, isErrandService } from './serviceTypes';
import { SERVICE_TYPE_CONFIG } from '../config/serviceTypes';
import { parseErrandTasks, summarizeErrandTasks, describeTaskState } from './errandTasks';
import ErrandTaskList from '../components/cards/ErrandTaskList';
import { getErrandCostDisplay, getRecurringErrandCostDisplay, isRoundTripRide, getRoundTripCostDisplay, getRecurringRoundTripCostDisplay, getRecurringTripCostDisplay, getSimpleCostDisplay } from './rideCostDisplay';
import { getErrandProgress, getRecurringErrandProgress, getRecurringTripProgress, getRecurringRoundTripProgress, getSimpleProgress } from './rideProgressTracking';
import { getRoundTripProgress } from './roundTripHelpers';
import { formatPrice } from './formatters';
import Button from '../components/ui/Button';

/**
 * Base handler with default implementations
 */
const baseHandler = {
  /**
   * Render location details for active ride modal
   * @param {Object} ride - Ride object
   * @returns {JSX.Element|null} Location details component
   */
  renderLocationDetails: (ride) => {
    return (
      <>
        <div>
          <span className="text-slate-600">📍 Pickup:</span>
          <span className="ml-2 text-slate-800">{ride.pickup_address || ride.pickup_location || 'Not specified'}</span>
        </div>
        <div>
          <span className="text-slate-600">🎯 Dropoff:</span>
          <span className="ml-2 text-slate-800">{ride.dropoff_address || ride.dropoff_location || 'Not specified'}</span>
        </div>
      </>
    );
  },

  /**
   * Render service-specific details section
   * @param {Object} ride - Ride object
   * @returns {JSX.Element|null} Service-specific details
   */
  renderServiceDetails: (ride) => null,

  /**
   * Render additional action buttons for active ride
   * @param {Object} ride - Ride object
   * @param {Object} handlers - Action handlers (onCancel, etc.)
   * @returns {Array<JSX.Element>} Array of action buttons
   */
  renderActiveRideActions: (ride, handlers) => [],

  /**
   * Get status display configuration
   * @param {Object} ride - Ride object
   * @returns {Object} Status display config {icon, text, color, textColor}
   */
  getStatusDisplay: (ride) => {
    const statusMap = {
      pending: { icon: '⏳', text: 'Pending', color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-900' },
      accepted: { icon: '✅', text: 'Accepted', color: 'bg-green-50 border-green-200', textColor: 'text-green-900' },
      driver_on_way: { icon: '🚗', text: 'Driver on the way', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-900' },
      driver_arrived: { icon: '📍', text: 'Driver arrived', color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-900' },
      trip_started: { icon: '🎯', text: 'Trip in progress', color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-900' },
      trip_completed: { icon: '✅', text: 'Trip completed', color: 'bg-green-50 border-green-200', textColor: 'text-green-900' },
      cancelled: { icon: '❌', text: 'Cancelled', color: 'bg-red-50 border-red-200', textColor: 'text-red-900' }
    };
    return statusMap[ride.ride_status] || statusMap.pending;
  },

  /**
   * Get progress information for the ride
   * @param {Object} ride - Ride object
   * @returns {Object} Progress info {percentage, label, description}
   */
  getProgressInfo: (ride) => {
    const isRoundTrip = isRoundTripRide(ride);
    const isRecurring = (ride.number_of_trips > 1) || ride.series_id;
    
    // Handle round trips and recurring rides
    if (isRoundTrip && isRecurring) {
      const progress = getRecurringRoundTripProgress(ride);
      return {
        percentage: progress.percentage,
        label: `${progress.completedLegs}/${progress.totalLegs} legs`,
        description: `Occurrence ${progress.completedOccurrences + 1} of ${progress.totalOccurrences}`
      };
    }
    if (isRoundTrip && !isRecurring) {
      const percentage = getRoundTripProgress(ride);
      const statusProgress = baseHandler.getProgressInfo(ride);
      return {
        percentage,
        label: statusProgress.label,
        description: statusProgress.description
      };
    }
    if (isRecurring) {
      const progress = getRecurringTripProgress(ride);
      return {
        percentage: progress.percentage,
        label: `${progress.completed}/${progress.total} trips`,
        description: `Trip ${progress.completed + 1} of ${progress.total}`
      };
    }
    
    // Simple ride progress
    const statusProgress = {
      pending: { percentage: 0, label: 'Awaiting driver', description: 'Waiting for driver offers' },
      accepted: { percentage: 20, label: 'Driver assigned', description: 'Driver has been assigned' },
      driver_on_way: { percentage: 40, label: 'Driver en route', description: 'Driver heading to pickup' },
      driver_arrived: { percentage: 60, label: 'Driver arrived', description: 'Driver at pickup location' },
      trip_started: { percentage: 80, label: 'Trip started', description: 'Journey in progress' },
      trip_completed: { percentage: 100, label: 'Trip completed', description: 'Trip finished successfully' }
    };
    return statusProgress[ride.ride_status] || statusProgress.pending;
  },

  /**
   * Validate ride data for this service type
   * @param {Object} ride - Ride object
   * @returns {Object} Validation result {isValid, errors}
   */
  validateRide: (ride) => {
    return { isValid: true, errors: [] };
  },

  /**
   * Render card-specific details for ride cards
   * @param {Object} ride - Ride object
   * @param {string} context - Card context: 'pending', 'active', 'completed', 'cancelled', 'driver'
   * @param {Object} options - Additional options {onClick, compact}
   * @returns {JSX.Element|null} Card details component
   */
  renderCardDetails: (ride, context = 'default', options = {}) => {
    return null;
  },

  /**
   * Get cost breakdown for the ride
   * @param {Object} ride - Ride object
   * @returns {Object} Cost breakdown {total, breakdown, display, formattedPrice, type}
   */
  getCostBreakdown: (ride) => {
    const isRoundTrip = isRoundTripRide(ride);
    const isRecurring = (ride.number_of_trips > 1) || ride.series_id;
    
    if (isRoundTrip && isRecurring) {
      return getRecurringRoundTripCostDisplay(ride);
    }
    if (isRoundTrip && !isRecurring) {
      return getRoundTripCostDisplay(ride);
    }
    if (isRecurring) {
      return getRecurringTripCostDisplay(ride);
    }
    return getSimpleCostDisplay(ride);
  },

  /**
   * Get card summary text
   * @param {Object} ride - Ride object
   * @returns {string} Summary text for cards
   */
  getCardSummary: (ride) => {
    return null;
  },

  /**
   * Get service type display information (icon, label, colors)
   * @returns {Object} Service type info {icon, label, color, bgColor}
   */
  getServiceTypeInfo: () => {
    const config = SERVICE_TYPE_CONFIG.taxi;
    return {
      icon: config.icon,
      label: config.label,
      color: config.color,
      bgColor: config.bgColor
    };
  },

  /**
   * Get service type display name for modals and details
   * @returns {string} Display name (e.g., "Taxi Ride", "Courier Delivery")
   */
  getServiceTypeDisplayName: () => {
    return 'Taxi Ride';
  },

  /**
   * Check if ride is of a specific service type
   * @param {Object} ride - Ride object
   * @param {string} serviceType - Service type to check
   * @returns {boolean} True if ride matches service type
   */
  isServiceType: (ride, serviceType) => {
    const normalizedRideType = normalizeServiceType(ride?.service_type || '');
    const normalizedTargetType = normalizeServiceType(serviceType);
    return normalizedRideType === normalizedTargetType;
  },

  /**
   * Prepare ride data for database insertion
   * @param {Object} formData - Form data from booking
   * @param {Object} serviceData - Service-specific data
   * @returns {Object} Prepared ride data object
   */
  prepareRideData: (formData, serviceData = {}) => {
    const baseData = {
      pickup_location: formData.pickupLocation,
      dropoff_location: formData.dropoffLocation,
      pickup_address: formData.pickupAddress || formData.pickupLocation,
      dropoff_address: formData.dropoffAddress || formData.dropoffLocation,
      ride_timing: formData.rideTiming || 'instant',
      scheduled_datetime: formData.scheduledDateTime || null,
      number_of_trips: formData.numberOfTrips || 1,
      is_round_trip: formData.isRoundTrip || false
    };

    // Add pickup/dropoff coordinates if available
    if (formData.pickupCoords) {
      baseData.pickup_latitude = formData.pickupCoords.lat;
      baseData.pickup_longitude = formData.pickupCoords.lng;
    }
    if (formData.dropoffCoords) {
      baseData.dropoff_latitude = formData.dropoffCoords.lat;
      baseData.dropoff_longitude = formData.dropoffCoords.lng;
    }

    return baseData;
  },

  /**
   * Validate booking data before submission
   * @param {Object} formData - Form data
   * @param {Object} serviceData - Service-specific data
   * @returns {Object} {isValid: boolean, errors: Array<string>}
   */
  validateBookingData: (formData, serviceData = {}) => {
    const errors = [];
    
    if (!formData.pickupLocation) {
      errors.push('Pickup location is required');
    }
    if (!formData.dropoffLocation && !formData.tasks) {
      errors.push('Dropoff location or tasks are required');
    }
    
    return { isValid: errors.length === 0, errors };
  },

  /**
   * Calculate fare for this service type
   * @param {Object} params - Pricing parameters
   * @param {number} params.distanceKm - Distance in kilometers
   * @param {Object} params.formData - Form data
   * @param {Object} params.serviceData - Service-specific data
   * @param {number} params.numberOfTrips - Number of trips
   * @returns {Promise<Object|null>} Fare breakdown or null if invalid
   */
  async calculateFare(params) {
    // Default implementation - should be overridden by service handlers
    const { distanceKm } = params;
    if (!distanceKm || distanceKm <= 0) return null;
    
    // Import pricing functions dynamically to avoid circular dependencies
    const { calculateEstimatedFareV2 } = await import('./pricingCalculator');
    const baseFare = await calculateEstimatedFareV2({ distanceKm });
    return {
      totalFare: baseFare || 0,
      breakdown: { base: `Base fare: $${(baseFare || 0).toFixed(2)}` }
    };
  },

  /**
   * Get pricing rules for this service type
   * @param {string} serviceType - Service type (optional, for base handler)
   * @returns {Promise<Object>} Pricing rules configuration
   */
  async getPricingRules(serviceType = 'taxi') {
    const { getServicePricingConfig } = await import('../services/servicePricingConfigService');
    return await getServicePricingConfig(serviceType);
  },

  /**
   * Get fare breakdown display
   * @param {Object} fareResult - Result from calculateFare
   * @returns {Object} Display-ready breakdown {display, breakdown, label}
   */
  getFareBreakdown(fareResult) {
    if (!fareResult) return { display: 'N/A', breakdown: [], label: 'Fare' };
    
    return {
      display: `$${fareResult.totalFare?.toFixed(2) || '0.00'}`,
      breakdown: fareResult.breakdown || {},
      label: 'Total Fare'
    };
  },

  /**
   * Get available actions for active ride
   * @param {Object} ride - Ride object
   * @param {Object} handlers - Action handlers {onCancel, onStatusUpdate, onComplete}
   * @returns {Array<Object>} Array of action configs {label, action, variant, icon}
   */
  getActiveRideActions: (ride, handlers = {}) => {
    const actions = [];
    
    // Default actions based on status
    if (ride.ride_status === 'trip_started') {
      actions.push({
        label: 'Complete Trip',
        action: 'complete',
        variant: 'success',
        icon: '✅'
      });
    }
    
    // Cancel action available for non-completed rides
    if (ride.ride_status !== 'trip_completed' && ride.ride_status !== 'cancelled') {
      actions.push({
        label: 'Cancel Ride',
        action: 'cancel',
        variant: 'outline',
        icon: '❌'
      });
    }
    
    return actions;
  },

  /**
   * Handle active ride action
   * @param {Object} ride - Ride object
   * @param {string} action - Action type ('complete', 'cancel', etc.)
   * @param {Object} handlers - Action handlers
   * @returns {Promise<Object>} Result {success, error?}
   */
  async handleActiveRideAction(ride, action, handlers = {}) {
    switch (action) {
      case 'complete':
        if (handlers.onComplete) {
          return await handlers.onComplete(ride);
        }
        break;
      case 'cancel':
        if (handlers.onCancel) {
          return await handlers.onCancel(ride);
        }
        break;
      case 'statusUpdate':
        if (handlers.onStatusUpdate && handlers.status) {
          return await handlers.onStatusUpdate(ride, handlers.status);
        }
        break;
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
    return { success: false, error: 'Action handler not provided' };
  },

  /**
   * Check if ride can be completed
   * @param {Object} ride - Ride object
   * @returns {Object} {canComplete: boolean, reason?: string}
   */
  canComplete: (ride) => {
    // Default: can complete if trip_started
    if (ride.ride_status !== 'trip_started' && ride.ride_status !== 'in_progress') {
      return { 
        canComplete: false, 
        reason: 'Ride must be started before completion' 
      };
    }
    return { canComplete: true };
  },

  /**
   * Prepare completion data
   * @param {Object} ride - Ride object
   * @returns {Object} Completion data updates
   */
  prepareCompletionData: (ride) => {
    const now = new Date().toISOString();
    return {
      trip_completed_at: now,
      actual_dropoff_time: now,
      payment_status: 'paid'
    };
  },

  /**
   * Handle ride completion (service-specific logic)
   * @param {Object} ride - Ride object
   * @param {Object} completionData - Completion data
   * @returns {Promise<Object>} Result {success, error?}
   */
  async onComplete(ride, completionData) {
    // Default implementation - handlers can override for special logic
    return { success: true };
  },

  /**
   * Get service type display info (icon, label, colors)
   * Uses SERVICE_TYPE_CONFIG but accessed through handler system
   * @param {string} serviceType - Service type
   * @returns {Object} Service type display info
   */
  getServiceTypeDisplay: (serviceType) => {
    const normalized = normalizeServiceType(serviceType);
    const config = SERVICE_TYPE_CONFIG[normalized] || SERVICE_TYPE_CONFIG.taxi;
    return {
      icon: config.icon,
      label: config.label,
      color: config.color,
      bgColor: config.bgColor,
      borderColor: config.borderColor
    };
  }
};

/**
 * Errand ride type handler
 */
const errandHandler = {
  ...baseHandler,

  renderLocationDetails: (ride) => {
    // Errands don't show simple pickup/dropoff - they show tasks instead
    return null;
  },

  renderServiceDetails: (ride) => {
    const tasks = parseErrandTasks(ride.errand_tasks || ride.tasks);
    const summary = summarizeErrandTasks(tasks);

    if (!summary || summary.total === 0) {
      return (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <p className="text-sm text-gray-500 text-center">No tasks specified</p>
        </div>
      );
    }

    return (
      <div className="mt-2">
        <ErrandTaskList
          tasks={ride.errand_tasks || ride.tasks}
          compact={false}
          showStatus={true}
          showCosts={true}
        />
      </div>
    );
  },

  getStatusDisplay: (ride) => {
    const tasks = parseErrandTasks(ride.errand_tasks || ride.tasks);
    const summary = summarizeErrandTasks(tasks);
    const activeTask = summary?.activeTask;

    const baseStatus = baseHandler.getStatusDisplay(ride);
    
    // Enhance status display for errands with active task info
    if (activeTask && ride.ride_status !== 'trip_completed' && ride.ride_status !== 'cancelled') {
      return {
        ...baseStatus,
        text: `${baseStatus.text} • Task ${(summary.activeTaskIndex || 0) + 1} of ${summary.total}`,
        description: activeTask.title || 'Current errand task'
      };
    }

    return baseStatus;
  },

  getProgressInfo: (ride) => {
    const isRecurring = (ride.number_of_trips > 1) || ride.series_id;
    
    if (isRecurring) {
      const progress = getRecurringErrandProgress(ride);
      return {
        percentage: progress.percentage,
        label: `${progress.completed}/${progress.total} occurrences`,
        description: progress.tasks && progress.tasks.length > 0
          ? `${progress.tasks.filter(t => t.isCompleted).length}/${progress.tasks.length} tasks in current`
          : 'Errand series in progress'
      };
    }
    
    const progress = getErrandProgress(ride);
    return {
      percentage: progress.percentage,
      label: `${progress.completed}/${progress.total} tasks completed`,
      description: progress.tasks && progress.tasks.length > 0
        ? progress.tasks.find(t => t.isActive)?.title || 'Errand in progress'
        : 'Errand in progress'
    };
  },

  getCostBreakdown: (ride) => {
    const isRecurring = (ride.number_of_trips > 1) || ride.series_id;
    
    if (isRecurring) {
      return getRecurringErrandCostDisplay(ride);
    }
    return getErrandCostDisplay(ride);
  },

  renderCardDetails: (ride, context = 'default', options = {}) => {
    const { onClick, compact = false } = options;
    const tasks = parseErrandTasks(ride.errand_tasks || ride.tasks);
    const summary = summarizeErrandTasks(tasks);
    
    if (!summary || summary.total === 0) {
      return null;
    }

    const errandCompletionPct = summary.total
      ? Math.round((summary.completed / summary.total) * 100)
      : 0;

    // Different styling for completed/cancelled contexts
    const isCompleted = context === 'completed' || context === 'cancelled';
    const bgColor = isCompleted ? 'bg-green-50' : 'bg-green-50';
    const borderColor = isCompleted ? 'border-green-200' : 'border-green-200';
    const textColor = isCompleted ? 'text-green-800' : 'text-green-800';
    const opacityClass = context === 'cancelled' ? 'opacity-75' : '';

    return (
      <div className={`mb-3 ${bgColor} rounded-lg ${context === 'completed' ? 'px-3 py-2' : 'p-3'} border ${borderColor} ${opacityClass}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className={`text-sm font-bold ${textColor}`}>
              {summary.total} Errand Task{summary.total !== 1 ? 's' : ''}
            </p>
            <p className={`text-xs ${isCompleted ? 'text-green-700' : 'text-green-700'}`}>
              {context === 'completed' || context === 'cancelled'
                ? `Completed ${summary.completed}/${summary.total}`
                : `Completed ${summary.completed}/${summary.total} • ${summary.remaining} remaining`}
            </p>
          </div>
          {context === 'active' && (
            <div className="text-sm font-bold text-green-800">
              {errandCompletionPct}%
            </div>
          )}
          {(context === 'completed' || context === 'cancelled') && summary.activeTask && (
            <span className="text-[11px] font-bold text-green-600 bg-white px-2 py-0.5 rounded-full border border-green-100">
              {describeTaskState(summary.activeTask.state)}
            </span>
          )}
        </div>
        
        {summary.activeTask && context === 'active' && (
          <div className="bg-white rounded-lg p-2 border border-green-100 mb-2">
            <p className="text-[10px] uppercase text-green-500 font-bold tracking-wider mb-1">Current task</p>
            <p className="text-sm font-semibold text-green-800 line-clamp-1">{summary.activeTask.title}</p>
            <p className="text-[11px] text-green-600 font-medium">
              {describeTaskState(summary.activeTask.state)}
            </p>
          </div>
        )}

        {onClick && (
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-white border-green-200 text-green-700 hover:bg-green-50 text-xs py-1 h-auto"
            onClick={(e) => {
              e?.stopPropagation?.();
              onClick();
            }}
          >
            View All Tasks
          </Button>
        )}
      </div>
    );
  },

  getCardSummary: (ride) => {
    const tasks = parseErrandTasks(ride.errand_tasks || ride.tasks);
    const summary = summarizeErrandTasks(tasks);
    
    if (summary && summary.total > 0) {
      return `${summary.total} task${summary.total !== 1 ? 's' : ''}`;
    }
    return null;
  },

  validateRide: (ride) => {
    const errors = [];
    const tasks = parseErrandTasks(ride.errand_tasks || ride.tasks);
    
    if (!tasks || tasks.length === 0) {
      errors.push('Errand rides must have at least one task');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  async calculateFare(params) {
    const { serviceData = {}, numberOfTrips = 1 } = params;
    const errands = serviceData.tasks || [];
    
    if (!errands || errands.length === 0) return null;

    // Get service-specific pricing config
    const servicePricingConfig = await this.getPricingRules('errands');
    
    // Import pricing function
    const { calculateErrandsFare } = await import('./pricingCalculator');
    
    return await calculateErrandsFare({
      errands,
      numberOfDates: numberOfTrips,
      servicePricingConfig
    });
  },

  prepareRideData: (formData, serviceData = {}) => {
    const baseData = baseHandler.prepareRideData(formData, serviceData);
    
    // Add errand-specific fields
    if (serviceData.tasks && Array.isArray(serviceData.tasks)) {
      baseData.errand_tasks = JSON.stringify(serviceData.tasks);
    }
    
    return baseData;
  },

  validateBookingData: (formData, serviceData = {}) => {
    const errors = [];
    const tasks = serviceData.tasks || [];
    
    if (tasks.length === 0) {
      errors.push('At least one errand task is required');
    }
    
    // Validate each task
    tasks.forEach((task, index) => {
      if (!task.title || !task.title.trim()) {
        errors.push(`Task ${index + 1}: Title is required`);
      }
      if (!task.location || !task.location.trim()) {
        errors.push(`Task ${index + 1}: Location is required`);
      }
    });
    
    return { isValid: errors.length === 0, errors };
  },

  canComplete: (ride) => {
    // For errands, check if all tasks are completed
    const tasks = parseErrandTasks(ride.errand_tasks || ride.tasks);
    const summary = summarizeErrandTasks(tasks);
    
    if (!summary || summary.total === 0) {
      return { 
        canComplete: false, 
        reason: 'No tasks found in errand ride' 
      };
    }
    
    if (summary.completed < summary.total) {
      return { 
        canComplete: false, 
        reason: `All tasks must be completed (${summary.completed}/${summary.total} completed)` 
      };
    }
    
    // Also check base status
    const baseCheck = baseHandler.canComplete(ride);
    if (!baseCheck.canComplete) {
      return baseCheck;
    }
    
    return { canComplete: true };
  },

  async onComplete(ride, completionData) {
    // Errand-specific completion logic
    // Verify all tasks are completed before allowing completion
    const tasks = parseErrandTasks(ride.errand_tasks || ride.tasks);
    const summary = summarizeErrandTasks(tasks);
    
    if (summary && summary.completed < summary.total) {
      return { 
        success: false, 
        error: `Cannot complete: ${summary.remaining} task(s) still pending` 
      };
    }
    
    return { success: true };
  },

  getServiceTypeInfo: () => {
    const config = SERVICE_TYPE_CONFIG.errand || SERVICE_TYPE_CONFIG.errands;
    return {
      icon: config.icon,
      label: config.label,
      color: config.color,
      bgColor: config.bgColor
    };
  },

  getServiceTypeDisplayName: () => {
    return 'Errands';
  }
};

/**
 * Courier ride type handler
 */
const courierHandler = {
  ...baseHandler,

  renderServiceDetails: (ride) => {
    if (!ride.courier_package_details && !ride.package_size && !ride.recipient_name) {
      return null;
    }

    return (
      <div className="mt-2 space-y-2">
        {ride.recipient_name && (
          <div>
            <span className="text-slate-600">👤 Recipient:</span>
            <span className="ml-2 text-slate-800">{ride.recipient_name}</span>
          </div>
        )}
        {ride.recipient_phone && (
          <div>
            <span className="text-slate-600">📞 Recipient Phone:</span>
            <span className="ml-2 text-slate-800">{ride.recipient_phone}</span>
          </div>
        )}
        {ride.package_size && (
          <div>
            <span className="text-slate-600">📦 Package Size:</span>
            <span className="ml-2 text-slate-800 capitalize">{ride.package_size}</span>
          </div>
        )}
        {ride.courier_package_details && (
          <div>
            <span className="text-slate-600">📋 Package Details:</span>
            <span className="ml-2 text-slate-800">{ride.courier_package_details}</span>
          </div>
        )}
      </div>
    );
  },

  renderCardDetails: (ride, context = 'default', options = {}) => {
    if (!ride.courier_package_details && !ride.package_size && !ride.recipient_name) {
      return null;
    }

    return (
      <div className="mb-3 bg-purple-50 rounded-lg px-3 py-2.5 border border-purple-200">
        <div className="flex items-start gap-2">
          <Package className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-purple-700 mb-1">Package Details</div>
            {ride.package_size && (
              <div className="text-xs text-purple-600 mb-1">
                Size: <span className="font-semibold capitalize">{ride.package_size}</span>
              </div>
            )}
            {ride.courier_package_details && (
              <div className="text-sm text-purple-700">{ride.courier_package_details}</div>
            )}
            {ride.recipient_name && (
              <div className="text-xs text-purple-600 mt-1">
                To: {ride.recipient_name} {ride.recipient_phone && `• ${ride.recipient_phone}`}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },

  getCardSummary: (ride) => {
    if (ride.package_size) {
      return `Package (${ride.package_size})`;
    }
    if (ride.recipient_name) {
      return `To: ${ride.recipient_name}`;
    }
    return 'Package delivery';
  },

  async calculateFare(params) {
    const { distanceKm, serviceData = {}, numberOfTrips = 1 } = params;
    if (!distanceKm || distanceKm <= 0) return null;

    // Get service-specific pricing config
    const servicePricingConfig = await this.getPricingRules('courier');
    
    // Import pricing function
    const { calculateCourierFare } = await import('./pricingCalculator');
    
    return await calculateCourierFare({
      distanceKm,
      vehicleType: serviceData.vehicleType || 'sedan',
      packageSize: serviceData.package?.size || 'medium',
      isRecurring: numberOfTrips > 1,
      numberOfDates: numberOfTrips,
      servicePricingConfig
    });
  },

  getServiceTypeInfo: () => {
    const config = SERVICE_TYPE_CONFIG.courier;
    return {
      icon: config.icon,
      label: config.label,
      color: config.color,
      bgColor: config.bgColor
    };
  },

  getServiceTypeDisplayName: () => {
    return 'Courier Delivery';
  }
};

/**
 * Taxi ride type handler
 */
const taxiHandler = {
  ...baseHandler,

  renderServiceDetails: (ride) => {
    if (ride.number_of_passengers && ride.number_of_passengers > 1) {
      return (
        <div className="mt-2">
          <span className="text-slate-600">👥 Passengers:</span>
          <span className="ml-2 text-slate-800">{ride.number_of_passengers}</span>
        </div>
      );
    }
    return null;
  },

  getCardSummary: (ride) => {
    if (ride.number_of_passengers && ride.number_of_passengers > 1) {
      return `${ride.number_of_passengers} passengers`;
    }
    return null;
  },

  async calculateFare(params) {
    const { distanceKm, formData = {}, numberOfTrips = 1 } = params;
    if (!distanceKm || distanceKm <= 0) return null;

    // Get service-specific pricing config
    const servicePricingConfig = await this.getPricingRules('taxi');
    
    // Import pricing function
    const { calculateTaxiFare } = await import('./pricingCalculator');
    
    return await calculateTaxiFare({
      distanceKm,
      isRoundTrip: formData.isRoundTrip || false,
      numberOfDates: numberOfTrips,
      servicePricingConfig
    });
  },

  getServiceTypeInfo: () => {
    const config = SERVICE_TYPE_CONFIG.taxi;
    return {
      icon: config.icon,
      label: config.label,
      color: config.color,
      bgColor: config.bgColor
    };
  },

  getServiceTypeDisplayName: () => {
    return 'Taxi Ride';
  }
};

/**
 * School Run ride type handler
 */
const schoolRunHandler = {
  ...baseHandler,

  renderServiceDetails: (ride) => {
    return (
      <div className="mt-2 space-y-2">
        {ride.passenger_name && (
          <div>
            <span className="text-slate-600">👤 Student Name:</span>
            <span className="ml-2 text-slate-800">{ride.passenger_name}</span>
          </div>
        )}
        {ride.contact_number && (
          <div>
            <span className="text-slate-600">📞 Contact Number:</span>
            <span className="ml-2 text-slate-800">{ride.contact_number}</span>
          </div>
        )}
      </div>
    );
  },

  getCardSummary: (ride) => {
    if (ride.passenger_name) {
      return `Student: ${ride.passenger_name}`;
    }
    return 'School run';
  },

  async calculateFare(params) {
    const { distanceKm, formData = {}, numberOfTrips = 1 } = params;
    if (!distanceKm || distanceKm <= 0) return null;

    // Get service-specific pricing config
    const servicePricingConfig = await this.getPricingRules('school_run');
    
    // Import pricing function
    const { calculateSchoolRunFare } = await import('./pricingCalculator');
    
    return await calculateSchoolRunFare({
      distanceKm,
      isRoundTrip: formData.isRoundTrip || false,
      numberOfDates: numberOfTrips,
      servicePricingConfig
    });
  },

  getServiceTypeInfo: () => {
    const config = SERVICE_TYPE_CONFIG.school_run;
    return {
      icon: config.icon,
      label: config.label,
      color: config.color,
      bgColor: config.bgColor
    };
  },

  getServiceTypeDisplayName: () => {
    return 'School Run';
  }
};

/**
 * Handler registry
 */
const HANDLERS = {
  taxi: taxiHandler,
  courier: courierHandler,
  errand: errandHandler,
  errands: errandHandler, // Alias for errands
  school_run: schoolRunHandler,
  schoolRun: schoolRunHandler // Alias
};

/**
 * Get ride type handler
 * @param {string} serviceType - Service type (taxi, courier, errand, school_run)
 * @returns {Object} Ride type handler
 */
export function getRideTypeHandler(serviceType) {
  const normalized = normalizeServiceType(serviceType);
  return HANDLERS[normalized] || baseHandler;
}

/**
 * Register a new ride type handler
 * @param {string} serviceType - Service type key
 * @param {Object} handler - Handler object
 */
export function registerRideTypeHandler(serviceType, handler) {
  HANDLERS[serviceType] = { ...baseHandler, ...handler };
}

/**
 * Get all registered service types
 * @returns {Array<string>} Array of service type keys
 */
export function getRegisteredServiceTypes() {
  return Object.keys(HANDLERS);
}

/**
 * Check if a ride is of a specific service type
 * Utility function for convenience
 * @param {Object} ride - Ride object
 * @param {string} serviceType - Service type to check
 * @returns {boolean} True if ride matches service type
 */
export function isServiceType(ride, serviceType) {
  const handler = getRideTypeHandler(ride?.service_type);
  return handler.isServiceType(ride, serviceType);
}

export default {
  getRideTypeHandler,
  registerRideTypeHandler,
  getRegisteredServiceTypes,
  baseHandler
};

