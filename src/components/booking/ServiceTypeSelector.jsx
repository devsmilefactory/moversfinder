import React from 'react';

/**
 * ServiceTypeSelector Component
 * 
 * Horizontal tab navigation for selecting service types.
 * Features smooth scrolling, snap-to-grid behavior, and visual feedback.
 */
const ServiceTypeSelector = ({
  selectedService,
  onServiceChange,
  disabled = false,
  showAllServices = true,
  availableServices = null
}) => {
  // Service types configuration
  const allServices = [
    { id: 'taxi', name: 'Taxi', icon: '🚕', color: 'yellow', description: 'Standard ride service' },
    { id: 'courier', name: 'Courier', icon: '📦', color: 'blue', description: 'Package delivery' },
    { id: 'errands', name: 'Errands', icon: '🛍️', color: 'purple', description: 'Multi-stop tasks' },
    { id: 'school_run', name: 'School/Work', icon: '🎒', color: 'green', description: 'Regular commute' },
    { id: 'bulk', name: 'Bulk', icon: '👥', color: 'teal', description: 'Multiple rides' }
  ];

  // Filter services based on availability
  const services = showAllServices 
    ? allServices 
    : allServices.filter(service => 
        availableServices ? availableServices.includes(service.id) : true
      );

  // Handle service selection
  const handleServiceSelect = (serviceId) => {
    if (!disabled && serviceId !== selectedService) {
      onServiceChange(serviceId);
    }
  };

  // Get button styling based on selection state
  const getButtonStyle = (service) => {
    const isSelected = selectedService === service.id;
    const baseClasses = "flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all text-sm snap-start relative";
    
    if (disabled) {
      return `${baseClasses} bg-slate-100 text-slate-400 cursor-not-allowed`;
    }
    
    if (isSelected) {
      return `${baseClasses} bg-yellow-400 text-slate-800 shadow-md transform -translate-y-0.5`;
    }
    
    return `${baseClasses} bg-slate-100 text-slate-600 hover:bg-slate-200 hover:shadow-sm cursor-pointer`;
  };

  // Get service by ID for display purposes
  const getSelectedServiceInfo = () => {
    return services.find(service => service.id === selectedService) || services[0];
  };

  const selectedServiceInfo = getSelectedServiceInfo();

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          🚗 Service Type
        </h3>
        
        {/* Selected service info */}
        {selectedServiceInfo && (
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span>{selectedServiceInfo.icon}</span>
            <span>{selectedServiceInfo.description}</span>
          </div>
        )}
      </div>

      {/* Service Tabs */}
      <div className="px-0 -mx-4 py-2 border border-slate-200 rounded-lg bg-slate-50">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 snap-x snap-mandatory">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => handleServiceSelect(service.id)}
              disabled={disabled}
              className={getButtonStyle(service)}
              aria-label={`Select ${service.name} service`}
              title={service.description}
            >
              <span className="mr-1.5" role="img" aria-label={service.name}>
                {service.icon}
              </span>
              <span>{service.name}</span>
              
              {/* Selection indicator */}
              {selectedService === service.id && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Service Description */}
      {selectedServiceInfo && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl" role="img" aria-label={selectedServiceInfo.name}>
              {selectedServiceInfo.icon}
            </span>
            <div>
              <h4 className="font-medium text-slate-700 mb-1">
                {selectedServiceInfo.name}
              </h4>
              <p className="text-sm text-slate-600">
                {getServiceDescription(selectedServiceInfo.id)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disabled state message */}
      {disabled && (
        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
          ℹ️ Service type cannot be changed when editing an existing booking
        </div>
      )}
    </div>
  );
};

// Helper function to get detailed service descriptions
const getServiceDescription = (serviceId) => {
  const descriptions = {
    taxi: "Standard point-to-point transportation with professional drivers. Perfect for airport trips, meetings, and daily commutes.",
    courier: "Reliable package and document delivery service. We handle your deliveries with care and provide tracking updates.",
    errands: "Multi-stop service for shopping, pickups, and various tasks. Our drivers will complete your errands efficiently.",
    school_run: "Safe and reliable transportation for students and workers. Regular schedules with trusted, verified drivers.",
    bulk: "Corporate booking for multiple rides. Ideal for events, team transportation, and business travel coordination."
  };
  
  return descriptions[serviceId] || "Professional transportation service";
};

export default ServiceTypeSelector;