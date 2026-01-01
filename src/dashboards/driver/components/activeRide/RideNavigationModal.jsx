import React from 'react';
import Modal from '../../../../components/ui/Modal';
import Button from '../../../../components/ui/Button';
import { getNavigationUrlTo } from '../../../../utils/navigation';

/**
 * RideNavigationModal
 *
 * Shows quick actions: Navigate to pickup, navigate to drop-off, call passenger.
 * Used by driver active ride overlay.
 */
const RideNavigationModal = ({
  isOpen,
  onClose,
  ride,
  passengerPhone,
  defaultDestination = null
}) => {
  if (!isOpen) return null;

  const handleNavigate = (destination) => {
    const url = getNavigationUrlTo(ride, destination);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // Keep the modal open so the driver can try another action
      // (e.g. calling passenger) if navigation cannot be generated.
      return;
    }
    onClose?.();
  };

  const handleCall = () => {
    if (passengerPhone) {
      window.location.href = `tel:${passengerPhone}`;
    }
    onClose?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Navigation & Contact" size="sm">
      <div className="space-y-3">
        <div className="text-sm text-gray-600">
          Choose an action for this ride.
        </div>

        <div className="space-y-2">
          <Button
            variant={defaultDestination === 'pickup' ? 'primary' : 'outline'}
            size="md"
            className="w-full"
            onClick={() => handleNavigate('pickup')}
          >
            🚩 Navigate to Pickup
          </Button>
          <Button
            variant={defaultDestination === 'dropoff' ? 'primary' : 'outline'}
            size="md"
            className="w-full"
            onClick={() => handleNavigate('dropoff')}
          >
            🎯 Navigate to Drop-off
          </Button>
          <Button
            variant="outline"
            size="md"
            className="w-full"
            onClick={handleCall}
            disabled={!passengerPhone}
          >
            📞 Call Passenger {passengerPhone ? `(${passengerPhone})` : ''}
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          Note: Calls use your phone dialer. Navigation opens in a new tab/app.
        </div>
      </div>
    </Modal>
  );
};

export default RideNavigationModal;



