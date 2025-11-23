import React from 'react';
import SharedCancelRideModal from '../../../components/shared/SharedCancelRideModal';

const CancelRideModal = ({ open, onClose, onConfirm }) => {
  return (
    <SharedCancelRideModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      role="passenger"
    />
  );
};

export default CancelRideModal;

