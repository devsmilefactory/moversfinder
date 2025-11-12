import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import { calculateNumberOfTrips } from '../../../utils/recurringRides';

/**
 * Schedule Modal Component
 * 
 * Allows users to configure ride scheduling:
 * - Single scheduled ride (specific date + time)
 * - Recurring rides with specific dates
 * - Recurring weekday rides (Mon-Fri for a month)
 * - Recurring weekend rides (Sat-Sun for a month)
 */
const ScheduleModal = ({ isOpen, onClose, onConfirm, initialData = {} }) => {
  const [scheduleType, setScheduleType] = useState(initialData.scheduleType || 'instant');
  const [selectedDates, setSelectedDates] = useState(initialData.selectedDates || []);
  const [scheduleMonth, setScheduleMonth] = useState(initialData.scheduleMonth || '');
  const [tripTime, setTripTime] = useState(initialData.tripTime || '');
  const [tripCount, setTripCount] = useState(initialData.tripCount || 1);
  const [dateInput, setDateInput] = useState('');
  const [calculatedTrips, setCalculatedTrips] = useState(1);

  // Calculate number of trips whenever schedule parameters change
  useEffect(() => {
    if (scheduleType === 'instant') {
      setCalculatedTrips(1);
    } else if (scheduleType === 'specific_dates') {
      setCalculatedTrips(selectedDates.length || 0);
    } else if (scheduleType === 'weekdays' || scheduleType === 'weekends') {
      if (scheduleMonth) {
        const pattern = { type: scheduleType, month: scheduleMonth };
        setCalculatedTrips(calculateNumberOfTrips(pattern));
      } else {
        setCalculatedTrips(0);
      }
    }
  }, [scheduleType, selectedDates, scheduleMonth]);

  if (!isOpen) return null;

  const handleAddDate = () => {
    if (dateInput && !selectedDates.includes(dateInput)) {
      setSelectedDates([...selectedDates, dateInput].sort());
      setDateInput('');
    }
  };

  const handleRemoveDate = (date) => {
    setSelectedDates(selectedDates.filter(d => d !== date));
  };

  const handleConfirm = () => {
    const scheduleData = {
      scheduleType,
      selectedDates,
      scheduleMonth,
      tripTime,
      tripCount,
      numberOfTrips: calculatedTrips // Include calculated number of trips
    };
    onConfirm(scheduleData);
    onClose();
  };

  const isValid = () => {
    if (scheduleType === 'instant') return true;
    if (!tripTime) return false;
    
    if (scheduleType === 'specific_dates') {
      return selectedDates.length > 0;
    }
    
    if (scheduleType === 'weekdays' || scheduleType === 'weekends') {
      return scheduleMonth && tripCount > 0;
    }
    
    return false;
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMinMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">📅 Schedule Your Ride</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Schedule Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Select Schedule Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setScheduleType('instant')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    scheduleType === 'instant'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="font-semibold text-slate-700">Instant</div>
                  <div className="text-xs text-slate-600">Book now</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleType('specific_dates')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    scheduleType === 'specific_dates'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-1">📅</div>
                  <div className="font-semibold text-slate-700">Specific Dates</div>
                  <div className="text-xs text-slate-600">Pick dates</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleType('weekdays')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    scheduleType === 'weekdays'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-1">📆</div>
                  <div className="font-semibold text-slate-700">Weekdays</div>
                  <div className="text-xs text-slate-600">Mon-Fri</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleType('weekends')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    scheduleType === 'weekends'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-1">🎉</div>
                  <div className="font-semibold text-slate-700">Weekends</div>
                  <div className="text-xs text-slate-600">Sat-Sun</div>
                </button>
              </div>
            </div>

            {/* Specific Dates Configuration */}
            {scheduleType === 'specific_dates' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Add Dates
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      min={getMinDate()}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button onClick={handleAddDate} disabled={!dateInput}>
                      Add
                    </Button>
                  </div>
                </div>

                {selectedDates.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Selected Dates ({selectedDates.length})
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedDates.map((date) => (
                        <div
                          key={date}
                          className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg"
                        >
                          <span className="text-sm text-slate-700">
                            {new Date(date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <button
                            onClick={() => handleRemoveDate(date)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={tripTime}
                    onChange={(e) => setTripTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Weekdays/Weekends Configuration */}
            {(scheduleType === 'weekdays' || scheduleType === 'weekends') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Month
                  </label>
                  <input
                    type="month"
                    value={scheduleMonth}
                    onChange={(e) => setScheduleMonth(e.target.value)}
                    min={getMinMonth()}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={tripTime}
                    onChange={(e) => setTripTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Number of Trips
                  </label>
                  <input
                    type="number"
                    value={tripCount}
                    onChange={(e) => setTripCount(parseInt(e.target.value) || 1)}
                    min="1"
                    max="31"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {scheduleType === 'weekdays' 
                      ? 'Maximum weekdays in a month: ~22' 
                      : 'Maximum weekends in a month: ~8-10'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          {/* Display calculated number of trips */}
          {scheduleType !== 'instant' && calculatedTrips > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">
                  Total Number of Trips:
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {calculatedTrips}
                </div>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {scheduleType === 'specific_dates' && `${calculatedTrips} selected date${calculatedTrips !== 1 ? 's' : ''}`}
                {scheduleType === 'weekdays' && `${calculatedTrips} weekdays in the selected month`}
                {scheduleType === 'weekends' && `${calculatedTrips} weekend days in the selected month`}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!isValid()}
              className="flex-1"
            >
              Confirm Schedule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;

