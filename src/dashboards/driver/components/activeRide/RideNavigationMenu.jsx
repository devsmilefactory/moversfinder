import React, { useState } from 'react';
import Button from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/ToastProvider';
import { getNavigationUrlTo } from '../../../../utils/navigation';

/**
 * RideNavigationMenu Component
 * 
 * Provides navigation to pickup/dropoff locations and phone call functionality.
 * Extracted from ActiveRideOverlay for better organization.
 * 
 * @param {object} props
 * @param {object} props.ride - The ride object
 * @param {string} props.passengerPhone - Passenger phone number
 * @param {function} props.onNavigate - Callback when navigation is triggered
 * @param {function} props.onCall - Callback when call is triggered
 */
const RideNavigationMenu = ({
  ride,
  passengerPhone,
  onNavigate,
  onCall
}) => {
  const { addToast } = useToast();
  const [navOpen, setNavOpen] = useState(false);

  const handleNavigate = (destination) => {
    const url = getNavigationUrlTo(ride, destination);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setNavOpen(false);
      if (onNavigate) {
        onNavigate(destination);
      }
    } else {
      addToast({
        type: 'warn',
        title: 'Navigation unavailable',
        message: `${destination === 'pickup' ? 'Pickup' : 'Drop-off'} location missing or invalid.`
      });
    }
  };

  const handleCall = () => {
    if (passengerPhone) {
      window.location.href = `tel:${passengerPhone}`;
      if (onCall) {
        onCall(passengerPhone);
      }
    } else {
      addToast({
        type: 'warn',
        title: 'Phone number unavailable',
        message: 'Passenger phone number is not available.'
      });
    }
    setNavOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="md"
        onClick={() => setNavOpen(v => !v)}
        className="w-full"
      >
        🗺️ Navigate
      </Button>
      {navOpen && (
        <div className="absolute left-0 right-0 bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
          <div className="space-y-1">
            <button
              className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50 text-gray-800"
              onClick={() => handleNavigate('pickup')}
            >
              🚩 Navigate to Pickup
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50 text-gray-800"
              onClick={() => handleNavigate('dropoff')}
            >
              🎯 Navigate to Drop-off
            </button>
            {passengerPhone && (
              <button
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50 text-gray-800"
                onClick={handleCall}
              >
                📞 Call Passenger
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RideNavigationMenu;



