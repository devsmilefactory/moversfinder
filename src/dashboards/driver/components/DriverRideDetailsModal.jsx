import React from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { getNavigationUrlForDriver, getNavigationUrlTo } from '../../../utils/navigation';

const Row = ({ label, value }) => (
  <div className="flex items-start gap-2">
    <span className="text-xs text-gray-500 min-w-[90px]">{label}</span>
    <div className="text-sm text-gray-900 flex-1 break-words">{value || '—'}</div>
  </div>
);

const DriverRideDetailsModal = ({ open, onClose, ride }) => {
  if (!open || !ride) return null;

  const onNavigate = () => {
    const url = getNavigationUrlForDriver(ride) || getNavigationUrlTo(ride, 'pickup');
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Ride Details" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <Row label="Status" value={ride.ride_status} />
          <Row label="Service" value={ride.service_type} />
          <Row label="Pickup" value={ride.pickup_address || ride.pickup_location} />
          <Row label="Dropoff" value={ride.dropoff_address || ride.dropoff_location} />
          {ride.scheduled_datetime && (
            <Row label="Scheduled" value={new Date(ride.scheduled_datetime).toLocaleString()} />
          )}
          {(ride.scheduled_date && ride.scheduled_time) && (
            <Row label="Scheduled" value={`${ride.scheduled_date} ${ride.scheduled_time}`} />
          )}
          {ride.special_instructions && (
            <Row label="Instructions" value={ride.special_instructions} />
          )}
          {ride.courier_package_details && (
            <Row label="Package" value={ride.courier_package_details} />
          )}
          {ride.package_size && (
            <Row label="Size" value={String(ride.package_size)} />
          )}
          {ride.estimated_cost && (
            <Row label="Estimated Fare" value={`$${parseFloat(ride.estimated_cost).toFixed(2)}`} />
          )}
        </div>

        <div className="flex gap-3 justify-end pt-3">
          <Button variant="success" onClick={onNavigate}>Open in Google Maps</Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};

export default DriverRideDetailsModal;

