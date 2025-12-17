import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SchedulingSection from '../SchedulingSection';

describe('SchedulingSection', () => {
  const defaultProps = {
    schedulingState: {
      scheduleType: 'instant',
      selectedDates: [],
      scheduleMonth: '',
      tripTime: ''
    },
    selectedService: 'taxi',
    formData: {
      scheduleType: 'instant',
      isRoundTrip: false
    },
    onFormDataUpdate: vi.fn(),
    errors: {},
    warnings: {}
  };

  test('renders scheduling section with instant booking selected by default', () => {
    render(<SchedulingSection {...defaultProps} />);
    
    expect(screen.getByText('📅 Scheduling')).toBeInTheDocument();
    expect(screen.getByText('Book Now')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  test('shows instant booking summary when schedule type is instant', () => {
    render(<SchedulingSection {...defaultProps} />);
    
    expect(screen.getByText('Book now')).toBeInTheDocument();
  });

  test('switches to scheduled mode when schedule button is clicked', () => {
    const mockUpdate = vi.fn();
    render(
      <SchedulingSection 
        {...defaultProps} 
        onFormDataUpdate={mockUpdate}
      />
    );
    
    fireEvent.click(screen.getByText('Schedule'));
    
    expect(mockUpdate).toHaveBeenCalledWith({
      scheduleType: 'specific_time',
      selectedDates: [],
      scheduleMonth: '',
      tripTime: ''
    });
  });

  test('shows date and time inputs when in specific_time mode', () => {
    const props = {
      ...defaultProps,
      schedulingState: {
        ...defaultProps.schedulingState,
        scheduleType: 'specific_time'
      },
      formData: {
        ...defaultProps.formData,
        scheduleType: 'specific_time'
      }
    };

    render(<SchedulingSection {...props} />);
    
    expect(screen.getByLabelText('Select Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Time')).toBeInTheDocument();
  });

  test('displays error messages when provided', () => {
    const props = {
      ...defaultProps,
      errors: {
        scheduling: 'Please select a valid date and time'
      }
    };

    render(<SchedulingSection {...props} />);
    
    expect(screen.getByText('Please select a valid date and time')).toBeInTheDocument();
  });

  test('displays warning messages when provided', () => {
    const props = {
      ...defaultProps,
      warnings: {
        scheduling: 'Selected time is during peak hours'
      }
    };

    render(<SchedulingSection {...props} />);
    
    expect(screen.getByText('Selected time is during peak hours')).toBeInTheDocument();
  });
});