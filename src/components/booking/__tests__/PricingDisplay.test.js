import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PricingDisplay from '../PricingDisplay';

describe('PricingDisplay', () => {
  const defaultProps = {
    selectedService: 'taxi',
    isCalculating: false,
    calculationError: null,
    estimate: null,
    computedEstimate: null,
    formattedPrice: null,
    isRoundTrip: false,
    schedulingType: 'instant',
    tripCount: 1,
    serviceData: {},
    formData: {},
    errandsTasksCost: 0
  };

  test('shows loading state when calculating', () => {
    render(
      <PricingDisplay 
        {...defaultProps} 
        isCalculating={true}
      />
    );
    
    expect(screen.getByText('Calculating price...')).toBeInTheDocument();
  });

  test('shows error state when calculation fails', () => {
    render(
      <PricingDisplay 
        {...defaultProps} 
        calculationError="Failed to calculate route"
      />
    );
    
    expect(screen.getByText('Pricing calculation failed')).toBeInTheDocument();
    expect(screen.getByText('Failed to calculate route')).toBeInTheDocument();
  });

  test('shows default state when no estimate available', () => {
    render(<PricingDisplay {...defaultProps} />);
    
    expect(screen.getByText('Enter pickup and dropoff locations')).toBeInTheDocument();
    expect(screen.getByText("We'll calculate the price for your trip")).toBeInTheDocument();
  });

  test('displays estimate when available', () => {
    const estimate = {
      cost: 25.50,
      distance: 5.2,
      duration: 15
    };

    render(
      <PricingDisplay 
        {...defaultProps} 
        estimate={estimate}
        formattedPrice="$25.50"
      />
    );
    
    expect(screen.getByText('$25.50')).toBeInTheDocument();
    expect(screen.getByText('5.2 km • 15 min')).toBeInTheDocument();
  });

  test('shows round trip indicator when applicable', () => {
    const estimate = {
      cost: 25.50,
      distance: 5.2,
      duration: 15
    };

    render(
      <PricingDisplay 
        {...defaultProps} 
        estimate={estimate}
        formattedPrice="$51.00"
        isRoundTrip={true}
      />
    );
    
    expect(screen.getByText('Round trip included')).toBeInTheDocument();
  });

  test('shows multiple trips indicator when applicable', () => {
    const estimate = {
      cost: 25.50,
      distance: 5.2,
      duration: 15
    };

    render(
      <PricingDisplay 
        {...defaultProps} 
        estimate={estimate}
        formattedPrice="$76.50"
        tripCount={3}
        schedulingType="specific_dates"
      />
    );
    
    expect(screen.getByText('3 trips total')).toBeInTheDocument();
  });

  test('displays correct service icon', () => {
    const estimate = { cost: 25.50 };

    const { rerender } = render(
      <PricingDisplay 
        {...defaultProps} 
        selectedService="taxi"
        estimate={estimate}
        formattedPrice="$25.50"
      />
    );
    
    expect(screen.getByText('🚕')).toBeInTheDocument();

    rerender(
      <PricingDisplay 
        {...defaultProps} 
        selectedService="courier"
        estimate={estimate}
        formattedPrice="$25.50"
      />
    );
    
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  test('renders in compact mode', () => {
    const estimate = {
      cost: 25.50,
      distance: 5.2,
      duration: 15
    };

    render(
      <PricingDisplay 
        {...defaultProps} 
        estimate={estimate}
        formattedPrice="$25.50"
        compact={true}
      />
    );
    
    // Should not show the "Pricing" header in compact mode
    expect(screen.queryByText('💰 Pricing')).not.toBeInTheDocument();
    // But should still show the price
    expect(screen.getByText('$25.50')).toBeInTheDocument();
  });
});