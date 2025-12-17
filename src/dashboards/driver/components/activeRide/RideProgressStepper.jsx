import React from 'react';

/**
 * RideProgressStepper Component
 * 
 * Visual stepper showing ride progress through different stages
 */
const RideProgressStepper = ({ ride, isScheduled }) => {
  const steps = [
    {
      key: 'accepted',
      label: isScheduled ? 'Scheduled' : 'Accepted',
      icon: '✅',
      description: isScheduled ? 'Ride scheduled' : 'Ride accepted'
    },
    {
      key: 'driver_on_way',
      label: 'En Route',
      icon: '🚗',
      description: 'Driver heading to pickup'
    },
    {
      key: 'driver_arrived',
      label: 'Arrived',
      icon: '📍',
      description: 'Driver at pickup location'
    },
    {
      key: 'trip_started',
      label: 'In Progress',
      icon: '🎯',
      description: 'Trip in progress'
    },
    {
      key: 'trip_completed',
      label: 'Completed',
      icon: '🏁',
      description: 'Trip completed'
    }
  ];

  const getCurrentStepIndex = () => {
    const statusMap = {
      'accepted': 0,
      'driver_on_way': 1,
      'driver_arrived': 2,
      'trip_started': 3,
      'trip_completed': 4,
      'completed': 4
    };
    return statusMap[ride.ride_status] ?? 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-4">Ride Progress</h4>
      
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          return (
            <div key={step.key} className="flex items-center gap-4">
              {/* Step Icon */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  isCompleted
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : isCurrent
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300 animate-pulse'
                    : 'bg-gray-100 text-gray-500 border-2 border-gray-200'
                }`}
              >
                {step.icon}
              </div>

              {/* Step Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h5
                    className={`font-medium ${
                      isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </h5>
                  {isCompleted && (
                    <span className="text-green-600 text-sm">✓</span>
                  )}
                  {isCurrent && (
                    <span className="text-blue-600 text-sm animate-pulse">●</span>
                  )}
                </div>
                <p
                  className={`text-sm ${
                    isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'
                  }`}
                >
                  {step.description}
                </p>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-5 mt-10 w-0.5 h-6 bg-gray-200" />
              )}
            </div>
          );
        })}
      </div>

      {/* Time Estimate */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Estimated Duration:</span>
          <span className="font-medium text-gray-900">
            {ride.estimated_duration_minutes ? `${ride.estimated_duration_minutes} min` : 'N/A'}
          </span>
        </div>
        {ride.estimated_distance_km && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">Distance:</span>
            <span className="font-medium text-gray-900">
              {ride.estimated_distance_km} km
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideProgressStepper;