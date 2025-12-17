import React from 'react';
import Button from '../../../components/ui/Button';

/**
 * ActionButtons Component
 * 
 * Handles action buttons for ride requests (bid, accept, decline, view details)
 * Provides a consistent interface for ride actions across different contexts.
 */
const ActionButtons = ({
  ride,
  onBidClick,
  onAcceptClick,
  onDeclineClick,
  onShowDetails,
  loading = false,
  size = 'sm',
  layout = 'horizontal' // 'horizontal' | 'vertical' | 'grid'
}) => {
  if (!ride) return null;

  const canBid = ride.allows_bidding && ride.status === 'pending';
  const canAccept = ride.status === 'pending' && !ride.allows_bidding;
  const canDecline = ride.status === 'pending';

  const buttons = [];

  // View Details button (always available)
  buttons.push({
    key: 'details',
    label: 'View Details',
    variant: 'outline',
    onClick: onShowDetails,
    priority: 1
  });

  // Primary action buttons
  if (canBid) {
    buttons.push({
      key: 'bid',
      label: 'Place Bid',
      variant: 'primary',
      onClick: onBidClick,
      priority: 2
    });
  }

  if (canAccept) {
    buttons.push({
      key: 'accept',
      label: 'Accept',
      variant: 'success',
      onClick: onAcceptClick,
      priority: 2
    });
  }

  // Decline button (lower priority)
  if (canDecline) {
    buttons.push({
      key: 'decline',
      label: 'Decline',
      variant: 'ghost',
      onClick: () => onDeclineClick('Not interested'),
      priority: 3,
      className: 'text-red-600 hover:text-red-700'
    });
  }

  // Sort buttons by priority
  const sortedButtons = buttons.sort((a, b) => a.priority - b.priority);

  // Layout classes
  const getLayoutClasses = () => {
    switch (layout) {
      case 'vertical':
        return 'flex flex-col gap-2';
      case 'grid':
        return 'grid grid-cols-2 gap-2';
      case 'horizontal':
      default:
        return 'flex items-center gap-2';
    }
  };

  // Button sizing for different layouts
  const getButtonProps = (button) => {
    const baseProps = {
      variant: button.variant,
      size,
      disabled: loading,
      onClick: (e) => {
        e.stopPropagation();
        button.onClick();
      },
      className: button.className
    };

    // Adjust sizing based on layout
    if (layout === 'horizontal') {
      baseProps.className = `${baseProps.className || ''} flex-1`.trim();
    }

    return baseProps;
  };

  return (
    <div className={getLayoutClasses()}>
      {sortedButtons.map((button) => (
        <Button
          key={button.key}
          {...getButtonProps(button)}
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
};

export default ActionButtons;