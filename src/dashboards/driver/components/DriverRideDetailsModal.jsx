import React, { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
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

  const [passenger, setPassenger] = useState({ name: null, phone: null });
  const isActive = !['cancelled', 'completed'].includes(ride?.ride_status);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ride?.user_id) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('name, phone')
          .eq('id', ride.user_id)
          .maybeSingle();
        if (!cancelled && data) setPassenger({ name: data.name, phone: data.phone });
      } catch (e) {
        if (!cancelled) setPassenger({ name: null, phone: null });
      }
    })();
    return () => { cancelled = true; };
  }, [ride?.user_id]);

  return (
    <Modal isOpen={open} onClose={onClose} title="Ride Details" size="lg">
      <div className="space-y-4">
        {isActive && (
          <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-700">
              Passenger: <span className="font-medium">{passenger.name || '—'}</span>
              {passenger.phone && <span className="text-slate-500 ml-2">• {passenger.phone}</span>}
            </div>
            {passenger.phone && (
              <Button size="sm" variant="outline" onClick={() => window.location.href = `tel:${passenger.phone}`}>
                Call
              </Button>
            )}
          </div>
        )}

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

