/**
 * CardHeader Component
 * 
 * Standardized header for ride cards with three-column layout:
 * - Left: Service type badge
 * - Middle: Timing badge
 * - Right: Time posted (relative time)
 */

import React from 'react';
import { getServiceTypeConfig } from '../../config/serviceTypes';
import { getRideTimingConfig } from '../../config/rideTiming';
import { formatRelativeTime } from '../../utils/formatters';

/**
 * CardHeader - Displays service type, timing, and time posted
 * @param {Object} props
 * @param {string} props.serviceType - Service type (taxi, courier, errands, school_run)
 * @param {string} props.rideTiming - Ride timing (instant, scheduled_single, scheduled_recurring)
 * @param {string|Date} props.createdAt - Timestamp when ride was created
 * @param {number} props.offerCount - Number of offers (optional)
 * @param {string} props.context - Card context for conditional styling
 */
const CardHeader = ({
  serviceType,
  rideTiming,
  createdAt,
  offerCount = 0,
  context = 'pending'
}) => {
  const serviceConfig = getServiceTypeConfig(serviceType);
  const timingConfig = getRideTimingConfig(rideTiming);
  
  const ServiceIcon = serviceConfig.icon;
  const TimingIcon = timingConfig.icon;

  return (
    <div className="flex items-start justify-between mb-3">
      {/* Left: Service Type & Timing */}
      <div className="flex-1 flex items-center gap-2 flex-wrap">
        {/* Service Type Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 ${serviceConfig.bgColor} rounded-lg`}>
          <ServiceIcon className={`w-5 h-5 ${serviceConfig.color}`} />
          <span className={`font-bold text-sm ${serviceConfig.color}`}>
            {serviceConfig.label}
          </span>
        </div>

        {/* Timing Badge */}
        <div className={`flex items-center gap-1 px-2 py-1 ${timingConfig.bgColor} rounded-full`}>
          <TimingIcon className={`w-3.5 h-3.5 ${timingConfig.color}`} />
          <span className={`text-xs font-semibold ${timingConfig.color}`}>
            {timingConfig.label}
          </span>
        </div>
      </div>

      {/* Right: Time Posted & Offer Count */}
      <div className="flex flex-col items-end gap-1 ml-2">
        {/* Time Posted */}
        <div className="text-xs text-gray-500">
          {formatRelativeTime(createdAt)}
        </div>

        {/* Offer Count Badge (if applicable) */}
        {context === 'pending' && offerCount > 0 && (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
            {offerCount} offer{offerCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

export default CardHeader;
