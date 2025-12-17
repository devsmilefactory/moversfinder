import React, { useMemo } from 'react';
import { LoadingSpinner } from '../shared/loading/LoadingSpinner';
import { formatPrice } from '../../utils/formatters';

/**
 * PricingDisplay Component
 * 
 * Shows pricing information, calculations, and cost breakdowns.
 * Extracted from UnifiedBookingModal for better modularity.
 */
const PricingDisplay = ({
  estimate,
  computedEstimate,
  isCalculating,
  calculationError,
  formattedPrice,
  selectedService,
  isRoundTrip = false,
  schedulingType = 'instant',
  tripCount = 1,
  serviceData = {},
  formData = {},
  errandsTasksCost = 0,
  showBreakdown = true,
  compact = false
}) => {
  // Determine which estimate to use
  const activeEstimate = computedEstimate || estimate;
  
  // Calculate final price based on service type and modifiers
  const finalPrice = useMemo(() => {
    if (!activeEstimate?.cost && activeEstimate?.cost !== 0) return null;
    
    let basePrice = activeEstimate.cost;
    
    // Add errands tasks cost if applicable
    if (selectedService === 'errands' && errandsTasksCost > 0) {
      basePrice += errandsTasksCost;
    }
    
    // Apply round trip multiplier
    if (isRoundTrip && selectedService !== 'bulk') {
      basePrice *= 2;
    }
    
    // Apply trip count multiplier for recurring trips
    if (tripCount > 1 && schedulingType !== 'instant') {
      basePrice *= tripCount;
    }
    
    return basePrice;
  }, [activeEstimate, selectedService, errandsTasksCost, isRoundTrip, tripCount, schedulingType]);

  // Get service icon
  const getServiceIcon = (service) => {
    const icons = {
      taxi: '🚕',
      courier: '📦',
      errands: '🛍️',
      school_run: '🎒',
      bulk: '👥'
    };
    return icons[service] || '🚗';
  };

  // Get pricing breakdown
  const getPricingBreakdown = () => {
    if (!activeEstimate || !finalPrice) return null;
    
    const breakdown = [];
    
    // Base fare
    breakdown.push({
      label: 'Base fare',
      amount: activeEstimate.cost,
      description: activeEstimate.distance ? 
        `${activeEstimate.distance.toFixed(1)} km • ${activeEstimate.duration || 0} min` : 
        'Distance-based pricing'
    });
    
    // Errands tasks cost
    if (selectedService === 'errands' && errandsTasksCost > 0) {
      breakdown.push({
        label: 'Task fees',
        amount: errandsTasksCost,
        description: `${serviceData.tasks?.length || 0} task${(serviceData.tasks?.length || 0) !== 1 ? 's' : ''}`
      });
    }
    
    // Round trip modifier
    if (isRoundTrip && selectedService !== 'bulk') {
      breakdown.push({
        label: 'Round trip',
        amount: (activeEstimate.cost + (errandsTasksCost || 0)),
        description: 'Return journey included'
      });
    }
    
    // Multiple trips
    if (tripCount > 1 && schedulingType !== 'instant') {
      const singleTripCost = (activeEstimate.cost + (errandsTasksCost || 0)) * (isRoundTrip ? 2 : 1);
      breakdown.push({
        label: `${tripCount} trips`,
        amount: singleTripCost * (tripCount - 1),
        description: `${schedulingType === 'specific_dates' ? 'Selected dates' : 'Recurring schedule'}`
      });
    }
    
    return breakdown;
  };

  // Show loading state
  if (isCalculating) {
    return (
      <div className="space-y-4">
        {!compact && (
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            💰 Pricing
          </h3>
        )}
        
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <LoadingSpinner size="sm" />
            <span className="text-slate-600">Calculating price...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (calculationError) {
    return (
      <div className="space-y-4">
        {!compact && (
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            💰 Pricing
          </h3>
        )}
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <span>❌</span>
            <div>
              <p className="font-medium">Pricing calculation failed</p>
              <p className="text-sm text-red-600 mt-1">{calculationError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-xs text-red-500 underline mt-2 hover:text-red-700"
              >
                Try refreshing the page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show estimate if available
  if (activeEstimate && finalPrice !== null) {
    const breakdown = showBreakdown ? getPricingBreakdown() : null;
    const displayPrice = formattedPrice || formatPrice(finalPrice);

    return (
      <div className="space-y-4">
        {!compact && (
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            💰 Pricing
          </h3>
        )}
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className={`font-bold text-green-800 ${compact ? 'text-lg' : 'text-xl'}`}>
                {displayPrice}
              </p>
              
              {!compact && activeEstimate.distance && (
                <div className="text-sm text-green-600 mt-1">
                  <p>{activeEstimate.distance.toFixed(1)} km • {activeEstimate.duration || 0} min</p>
                  {isRoundTrip && <p>Round trip included</p>}
                  {tripCount > 1 && <p>{tripCount} trips total</p>}
                </div>
              )}

              {/* Bulk trips breakdown */}
              {selectedService === 'bulk' && computedEstimate?.perTripEstimates?.length > 0 && (
                <div className="text-xs text-green-600 mt-2">
                  <p className="font-medium">Trip breakdown:</p>
                  <p>
                    {computedEstimate.perTripEstimates.slice(0, 3).map((trip, i) => 
                      formatPrice(trip.cost || 0)
                    ).join(' + ')}
                    {computedEstimate.perTripEstimates.length > 3 && ' + ...'}
                  </p>
                </div>
              )}
            </div>
            
            <div className={`${compact ? 'text-xl' : 'text-2xl'} ml-3`}>
              {getServiceIcon(selectedService)}
            </div>
          </div>

          {/* Pricing Breakdown */}
          {breakdown && breakdown.length > 1 && !compact && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-xs font-medium text-green-700 mb-2">Price breakdown:</p>
              <div className="space-y-1">
                {breakdown.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-xs text-green-600">
                    <div>
                      <span className="font-medium">{item.label}</span>
                      {item.description && (
                        <span className="text-green-500 ml-1">({item.description})</span>
                      )}
                    </div>
                    <span className="font-medium">{formatPrice(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-xs text-green-500 mt-2">
            *Final fare based on actual distance and time
          </div>
        </div>
      </div>
    );
  }

  // Default state - no estimate yet
  return (
    <div className="space-y-4">
      {!compact && (
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          💰 Pricing
        </h3>
      )}
      
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="text-center text-slate-500">
          <div className={`${compact ? 'text-2xl' : 'text-3xl'} mb-2`}>💭</div>
          <p className="font-medium">Enter pickup and dropoff locations</p>
          <p className="text-sm mt-1">We'll calculate the price for your trip</p>
        </div>
      </div>
    </div>
  );
};

export default PricingDisplay;