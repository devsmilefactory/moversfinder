import React, { useState, useEffect } from 'react';
import { FEATURE_FLAGS, isInstantOnlyMode, normalizeRoundTripSelection } from '../../config/featureFlags';

/**
 * SchedulingSection Component
 * 
 * Handles ride scheduling options including instant booking,
 * specific date/time selection, and recurring patterns.
 * Extracted from UnifiedBookingModal for better modularity.
 * 
 * Respects feature flags - hides scheduling options when disabled.
 */
const SchedulingSection = ({
  schedulingState,
  selectedService,
  formData,
  onFormDataUpdate,
  errors = {},
  warnings = {}
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Get current scheduling values
  const scheduleType = schedulingState?.scheduleType || formData?.scheduleType || 'instant';
  const selectedDates = schedulingState?.selectedDates || formData?.selectedDates || [];
  const scheduleMonth = schedulingState?.scheduleMonth || formData?.scheduleMonth || '';
  const tripTime = schedulingState?.tripTime || formData?.tripTime || '';
  const isRoundTrip = formData?.isRoundTrip || false;
  const normalizedRoundTrip = normalizeRoundTripSelection(isRoundTrip);

  // Calculate minimum date (today)
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  
  // Calculate maximum date (30 days from now)
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Force round trip off when disabled by feature flag
  useEffect(() => {
    if (!FEATURE_FLAGS.ROUND_TRIPS_ENABLED && isRoundTrip && onFormDataUpdate) {
      onFormDataUpdate({ isRoundTrip: false });
    }
  }, [isRoundTrip, onFormDataUpdate]);

  // Handle schedule type change
  const handleScheduleTypeChange = (newType) => {
    const updates = {
      scheduleType: newType,
      selectedDates: newType === 'instant' ? [] : selectedDates,
      scheduleMonth: newType === 'instant' ? '' : scheduleMonth,
      tripTime: newType === 'instant' ? '' : tripTime
    };

    if (schedulingState?.handleScheduleTypeChange) {
      schedulingState.handleScheduleTypeChange(newType);
    } else if (onFormDataUpdate) {
      onFormDataUpdate(updates);
    }
  };

  // Handle date selection
  const handleDateChange = (dateString) => {
    let newDates = [...selectedDates];
    
    if (scheduleType === 'specific_dates') {
      if (newDates.includes(dateString)) {
        newDates = newDates.filter(d => d !== dateString);
      } else {
        newDates.push(dateString);
        newDates.sort();
      }
    } else {
      newDates = [dateString];
    }

    const updates = { selectedDates: newDates };
    
    if (schedulingState?.handleDateChange) {
      schedulingState.handleDateChange(newDates);
    } else if (onFormDataUpdate) {
      onFormDataUpdate(updates);
    }
  };

  // Handle time change
  const handleTimeChange = (timeString) => {
    const updates = { tripTime: timeString };
    
    if (schedulingState?.handleTimeChange) {
      schedulingState.handleTimeChange(timeString);
    } else if (onFormDataUpdate) {
      onFormDataUpdate(updates);
    }
  };

  // Handle month change for recurring schedules
  const handleMonthChange = (monthString) => {
    const updates = { scheduleMonth: monthString };
    
    if (schedulingState?.handleMonthChange) {
      schedulingState.handleMonthChange(monthString);
    } else if (onFormDataUpdate) {
      onFormDataUpdate(updates);
    }
  };

  // Generate time options (every 30 minutes)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  // Generate month options (current month + next 11 months)
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthString = date.toISOString().slice(0, 7); // YYYY-MM format
      const displayName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value: monthString, label: displayName });
    }
    
    return options;
  };

  // Get scheduling summary for display
  const getSchedulingSummary = () => {
    if (scheduleType === 'instant') {
      return { type: 'instant', display: 'Book now', icon: '⚡' };
    }
    
    if (scheduleType === 'specific_time' && selectedDates.length === 1 && tripTime) {
      const date = new Date(selectedDates[0]);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return { 
        type: 'specific_time', 
        display: `${dateStr} at ${tripTime}`, 
        icon: '📅' 
      };
    }
    
    if (scheduleType === 'specific_dates' && selectedDates.length > 0) {
      const count = selectedDates.length;
      return { 
        type: 'specific_dates', 
        display: `${count} selected date${count > 1 ? 's' : ''}`, 
        icon: '📅' 
      };
    }
    
    if ((scheduleType === 'weekdays' || scheduleType === 'weekends') && scheduleMonth) {
      const monthName = new Date(scheduleMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const typeLabel = scheduleType === 'weekdays' ? 'Weekdays' : 'Weekends';
      return { 
        type: scheduleType, 
        display: `${typeLabel} in ${monthName}`, 
        icon: '🔄' 
      };
    }
    
    return { type: 'incomplete', display: 'Select schedule', icon: '📅' };
  };

  const summary = getSchedulingSummary();
  
  // Force instant mode if feature flags disable scheduling
  useEffect(() => {
    if (isInstantOnlyMode() && scheduleType !== 'instant') {
      handleScheduleTypeChange('instant');
    }
  }, []);

  // If instant-only mode, show simplified UI
  if (isInstantOnlyMode()) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          ⚡ Instant Booking
        </h3>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            Your ride will be booked immediately and sent to nearby drivers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        📅 Scheduling
      </h3>

      {/* Schedule Type Selection */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleScheduleTypeChange('instant')}
          className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
            scheduleType === 'instant'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>⚡</span>
            <span>Book Now</span>
          </div>
        </button>

        {FEATURE_FLAGS.SCHEDULED_RIDES_ENABLED && (
          <button
            type="button"
            onClick={() => handleScheduleTypeChange('specific_time')}
            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
              scheduleType === 'specific_time'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>Schedule</span>
            </div>
          </button>
        )}
      </div>

      {/* Advanced Scheduling Options */}
      {scheduleType !== 'instant' && (
        <div className="space-y-3">
          {/* Recurring Options - Only show if recurring is enabled */}
          {FEATURE_FLAGS.RECURRING_RIDES_ENABLED && (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleScheduleTypeChange('specific_dates')}
                className={`p-2 rounded border text-xs font-medium transition-colors ${
                  scheduleType === 'specific_dates'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Specific Dates
              </button>

              <button
                type="button"
                onClick={() => handleScheduleTypeChange('weekdays')}
                className={`p-2 rounded border text-xs font-medium transition-colors ${
                  scheduleType === 'weekdays'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Weekdays
              </button>

              <button
                type="button"
                onClick={() => handleScheduleTypeChange('weekends')}
                className={`p-2 rounded border text-xs font-medium transition-colors ${
                  scheduleType === 'weekends'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Weekends
              </button>
            </div>
          )}

          {/* Date Selection */}
          {scheduleType === 'specific_dates' && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Select Dates</label>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full p-2 border border-blue-200 bg-white rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              {selectedDates.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedDates.map(date => (
                    <span
                      key={date}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <button
                        type="button"
                        onClick={() => handleDateChange(date)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Single Date Selection */}
          {scheduleType === 'specific_time' && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Select Date</label>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={selectedDates[0] || ''}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full p-2 border border-blue-200 bg-white rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Month Selection for Recurring */}
          {(scheduleType === 'weekdays' || scheduleType === 'weekends') && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Select Month</label>
              <select
                value={scheduleMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full p-2 border border-blue-200 bg-white rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose month...</option>
                {generateMonthOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Selection */}
          {(scheduleType === 'specific_time' || scheduleType === 'weekdays' || scheduleType === 'weekends') && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Select Time</label>
              <select
                value={tripTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full p-2 border border-blue-200 bg-white rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose time...</option>
                {generateTimeOptions().map(time => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Round Trip Option */}
          {FEATURE_FLAGS.ROUND_TRIPS_ENABLED && scheduleType === 'specific_time' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="roundTrip"
                checked={normalizedRoundTrip}
                onChange={(e) => onFormDataUpdate && onFormDataUpdate({ isRoundTrip: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="roundTrip" className="text-sm text-slate-600">
                Round trip (return journey)
              </label>
            </div>
          )}
        </div>
      )}

      {/* Scheduling Summary */}
      <div className={`p-3 rounded-lg border ${
        summary.type === 'incomplete' 
          ? 'bg-amber-50 border-amber-200' 
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{summary.icon}</span>
          <div>
            <p className={`font-medium ${
              summary.type === 'incomplete' ? 'text-amber-700' : 'text-green-700'
            }`}>
              {summary.display}
            </p>
            {summary.type !== 'instant' && summary.type !== 'incomplete' && (
              <p className="text-xs text-slate-500 mt-1">
                {normalizedRoundTrip ? 'Including return journey' : 'One-way trip'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errors.scheduling && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {errors.scheduling}
        </div>
      )}

      {/* Warning Display */}
      {warnings.scheduling && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
          {warnings.scheduling}
        </div>
      )}
    </div>
  );
};

export default SchedulingSection;