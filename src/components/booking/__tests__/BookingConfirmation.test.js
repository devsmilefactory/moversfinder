import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BookingConfirmation from '../BookingConfirmation';

describe('BookingConfirmation', () => {
  const defaultProps = {
    selectedService: 'taxi',
    formData: {
      pickupLocation: '123 Main St',
      dropoffLocation: '456 Oak Ave',
      passengers: 2,
      paymentMethod: 'cash',
      isRoundTrip: false
    },
    serviceData: {
      vehicleType: 'sedan',
      priorityBooking: false
    },
    estimate: {
      cost: 25.50,
      distance: 5.2,
      duration: 15
    },
    schedulingSummary: {
      type: 'instant',
      display: 'Book now',
      icon: '⚡'
    },
    finalPrice: 25.50,
    onEdit: vi.fn(),
    onConfirm: vi.fn(),
    isSubmitting: false,
    errors: {}
  };

  test('renders confirmation header', () => {
    render(<BookingConfirmation {...defaultProps} />);
    
    expect(screen.getByText('Confirm Your Booking')).toBeInTheDocument();
    expect(screen.getByText('Please review the details below before confirming')).toBeInTheDocument();
  });

  test('displays service information', () => {
    render(<BookingConfirmation {...defaultProps} />);
    
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Taxi')).toBeInTheDocument();
    expect(screen.getByText('🚕')).toBeInTheDocument();
  });

  test('displays route information', () => {
    render(<BookingConfirmation {...defaultProps} />);
    
    expect(screen.getByText('Route')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
    expect(screen.getByText('PICKUP')).toBeInTheDocument();
    expect(screen.getByText('DROPOFF')).toBeInTheDocument();
  });

  test('displays service details for taxi', () => {
    render(<BookingConfirmation {...defaultProps} />);
    
    expect(screen.getByText('Service Details')).toBeInTheDocument();
    expect(screen.getByText('Vehicle Type:')).toBeInTheDocument();
    expect(screen.getByText('sedan')).toBeInTheDocument();
    expect(screen.getByText('Passengers:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('displays scheduling information', () => {
    render(<BookingConfirmation {...defaultProps} />);
    
    expect(screen.getByText('Scheduling')).toBeInTheDocument();
    expect(screen.getByText('Book now')).toBeInTheDocument();
  });

  test('displays payment method', () => {
    render(<BookingConfirmation {...defaultProps} />);
    
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('💵')).toBeInTheDocument();
  });

  test('displays total cost', () => {
    render(<BookingConfirmation {...defaultProps} />);
    
    expect(screen.getByText('Total Cost')).toBeInTheDocument();
    expect(screen.getByText('$25.50')).toBeInTheDocument();
  });

  test('calls onEdit when edit button is clicked', () => {
    const mockEdit = vi.fn();
    render(<BookingConfirmation {...defaultProps} onEdit={mockEdit} />);
    
    fireEvent.click(screen.getByText('Edit Details'));
    expect(mockEdit).toHaveBeenCalled();
  });

  test('calls onConfirm when confirm button is clicked', () => {
    const mockConfirm = vi.fn();
    render(<BookingConfirmation {...defaultProps} onConfirm={mockConfirm} />);
    
    fireEvent.click(screen.getByText('Confirm Booking'));
    expect(mockConfirm).toHaveBeenCalled();
  });

  test('shows loading state when submitting', () => {
    render(<BookingConfirmation {...defaultProps} isSubmitting={true} />);
    
    expect(screen.getByText('Booking...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /booking/i })).toBeDisabled();
  });

  test('displays error message when provided', () => {
    const props = {
      ...defaultProps,
      errors: {
        confirmation: 'Booking failed. Please try again.'
      }
    };

    render(<BookingConfirmation {...props} />);
    
    expect(screen.getByText('Booking failed. Please try again.')).toBeInTheDocument();
  });

  test('displays errands tasks in route section', () => {
    const props = {
      ...defaultProps,
      selectedService: 'errands',
      serviceData: {
        tasks: [
          { location: 'Grocery Store', description: 'Buy groceries' },
          { location: 'Post Office', description: 'Mail package' },
          { location: 'Bank', description: 'Deposit check' }
        ],
        returnToStart: true
      }
    };

    render(<BookingConfirmation {...props} />);
    
    expect(screen.getByText('TASK 1')).toBeInTheDocument();
    expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    expect(screen.getByText('TASK 2')).toBeInTheDocument();
    expect(screen.getByText('Post Office')).toBeInTheDocument();
  });

  test('shows round trip indicator when applicable', () => {
    const props = {
      ...defaultProps,
      formData: {
        ...defaultProps.formData,
        isRoundTrip: true
      }
    };

    render(<BookingConfirmation {...props} />);
    
    expect(screen.getByText('Including return journey')).toBeInTheDocument();
  });
});