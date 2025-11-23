import React, { useState } from 'react';
import Button from '../../shared/Button';

/**
 * Trip Confirmation Step
 * 
 * Displays all booking details for review before submission
 * Provides options to save trip, locations, and passengers
 */

const TripConfirmationStep = ({ 
  bookingData, 
  onEdit, 
  onConfirm,
  showSavePassenger = false // Only show for single bookings with manual passenger entry
}) => {
  const [saveOptions, setSaveOptions] = useState({
    saveTrip: false,
    savePickupLocation: false,
    saveDropoffLocation: false,
    savePassenger: false
  });

  const handleSaveOptionChange = (option) => {
    setSaveOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const handleConfirm = () => {
    onConfirm({ ...bookingData, saveOptions });
  };

  const { 
    bookingType, 
    serviceType, 
    passengerSelection,
    selectedPassenger,
    manualPassenger,
    scheduleType,
    recurringPattern,
    pickupLocation,
    dropoffLocation,
    additionalStops,
    passengers,
    vehicleType,
    recipientName,
    recipientPhone,
    packageDetails,
    packageSize,
    scheduledDate,
    scheduledTime,
    recurringEndDate,
    paymentMethod,
    specialInstructions
  } = bookingData;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-700">Confirm Your Booking</h1>
        <p className="text-slate-600">Review all details before submitting</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
        
        {/* Booking Type Summary */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-yellow-400 font-semibold mb-1 uppercase tracking-wide">
                {bookingType === 'single' ? 'Single' : 'Bulk'} {serviceType === 'rides' ? 'Ride' : 'Courier'}
              </div>
              <div className="text-2xl font-bold">
                {scheduleType === 'instant' && '⚡ Instant Booking'}
                {scheduleType === 'scheduled' && '📅 Scheduled Booking'}
                {scheduleType === 'recurring' && '🔄 Recurring Booking'}
              </div>
            </div>
            <div className="text-5xl opacity-90">
              {serviceType === 'rides' ? '🚗' : '📦'}
            </div>
          </div>
        </div>

        {/* Passenger/Recipient Details */}
        {serviceType === 'rides' && (
          <div className="border-b border-slate-200 pb-6">
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span>👤</span> Passenger Details
            </h2>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              {passengerSelection === 'existing' && selectedPassenger && (
                <div>
                  <span className="text-sm text-slate-600">Passenger:</span>
                  <span className="ml-2 font-semibold text-slate-700">{selectedPassenger}</span>
                </div>
              )}
              {passengerSelection === 'other' && manualPassenger && (
                <>
                  <div>
                    <span className="text-sm text-slate-600">Name:</span>
                    <span className="ml-2 font-semibold text-slate-700">{manualPassenger.name}</span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Phone:</span>
                    <span className="ml-2 font-semibold text-slate-700">{manualPassenger.phone}</span>
                  </div>
                  {manualPassenger.email && (
                    <div>
                      <span className="text-sm text-slate-600">Email:</span>
                      <span className="ml-2 font-semibold text-slate-700">{manualPassenger.email}</span>
                    </div>
                  )}
                </>
              )}
              {passengers && (
                <div>
                  <span className="text-sm text-slate-600">Number of Passengers:</span>
                  <span className="ml-2 font-semibold text-slate-700">{passengers}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {serviceType === 'courier' && (
          <div className="border-b border-slate-200 pb-6">
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span>📦</span> Package & Recipient Details
            </h2>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              {recipientName && (
                <div>
                  <span className="text-sm text-slate-600">Recipient:</span>
                  <span className="ml-2 font-semibold text-slate-700">{recipientName}</span>
                </div>
              )}
              {recipientPhone && (
                <div>
                  <span className="text-sm text-slate-600">Phone:</span>
                  <span className="ml-2 font-semibold text-slate-700">{recipientPhone}</span>
                </div>
              )}
              {packageDetails && (
                <div>
                  <span className="text-sm text-slate-600">Package:</span>
                  <span className="ml-2 font-semibold text-slate-700">{packageDetails}</span>
                </div>
              )}
              {packageSize && (
                <div>
                  <span className="text-sm text-slate-600">Size:</span>
                  <span className="ml-2 font-semibold text-slate-700 capitalize">{packageSize}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trip Details */}
        <div className="border-b border-slate-200 pb-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span>🗺️</span> Trip Details
          </h2>
          <div className="space-y-4">
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
              <div className="text-sm text-green-700 font-semibold mb-1">Pickup Location</div>
              <div className="text-slate-700">{pickupLocation || 'Not specified'}</div>
            </div>
            
            {additionalStops && additionalStops.length > 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <div className="text-sm text-blue-700 font-semibold mb-2">Additional Stops</div>
                {additionalStops.map((stop, index) => (
                  <div key={index} className="text-slate-700 mb-1">
                    {index + 1}. {stop}
                  </div>
                ))}
              </div>
            )}
            
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="text-sm text-red-700 font-semibold mb-1">Drop-off Location</div>
              <div className="text-slate-700">{dropoffLocation || 'Not specified'}</div>
            </div>

            {vehicleType && (
              <div className="bg-slate-50 rounded-lg p-4">
                <span className="text-sm text-slate-600">Vehicle Type:</span>
                <span className="ml-2 font-semibold text-slate-700 capitalize">{vehicleType.replace('-', ' ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Details */}
        <div className="border-b border-slate-200 pb-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span>📅</span> Schedule
          </h2>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div>
              <span className="text-sm text-slate-600">Type:</span>
              <span className="ml-2 font-semibold text-slate-700 capitalize">{scheduleType}</span>
            </div>
            {scheduleType !== 'instant' && scheduledDate && (
              <div>
                <span className="text-sm text-slate-600">Date:</span>
                <span className="ml-2 font-semibold text-slate-700">{scheduledDate}</span>
              </div>
            )}
            {scheduleType !== 'instant' && scheduledTime && (
              <div>
                <span className="text-sm text-slate-600">Time:</span>
                <span className="ml-2 font-semibold text-slate-700">{scheduledTime}</span>
              </div>
            )}
            {scheduleType === 'recurring' && recurringPattern && (
              <>
                <div>
                  <span className="text-sm text-slate-600">Repeat:</span>
                  <span className="ml-2 font-semibold text-slate-700 capitalize">{recurringPattern}</span>
                </div>
                {recurringEndDate && (
                  <div>
                    <span className="text-sm text-slate-600">Until:</span>
                    <span className="ml-2 font-semibold text-slate-700">{recurringEndDate}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Payment & Additional Info */}
        <div className="pb-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span>💳</span> Payment & Additional Info
          </h2>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            {paymentMethod && (
              <div>
                <span className="text-sm text-slate-600">Payment Method:</span>
                <span className="ml-2 font-semibold text-slate-700 capitalize">{paymentMethod.replace('-', ' ')}</span>
              </div>
            )}
            {specialInstructions && (
              <div>
                <span className="text-sm text-slate-600">Special Instructions:</span>
                <div className="mt-1 text-slate-700 bg-white rounded p-3 border border-slate-200">
                  {specialInstructions}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Options */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span>💾</span> Save for Future Use
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-yellow-100 p-2 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={saveOptions.saveTrip}
                onChange={() => handleSaveOptionChange('saveTrip')}
                className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
              />
              <div>
                <div className="font-semibold text-slate-700">Save this trip</div>
                <div className="text-sm text-slate-600">Quickly book the same trip again</div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer hover:bg-yellow-100 p-2 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={saveOptions.savePickupLocation}
                onChange={() => handleSaveOptionChange('savePickupLocation')}
                className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
              />
              <div>
                <div className="font-semibold text-slate-700">Save pickup location</div>
                <div className="text-sm text-slate-600">Add to your saved places</div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer hover:bg-yellow-100 p-2 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={saveOptions.saveDropoffLocation}
                onChange={() => handleSaveOptionChange('saveDropoffLocation')}
                className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
              />
              <div>
                <div className="font-semibold text-slate-700">Save drop-off location</div>
                <div className="text-sm text-slate-600">Add to your saved places</div>
              </div>
            </label>

            {showSavePassenger && (
              <label className="flex items-center gap-3 cursor-pointer hover:bg-yellow-100 p-2 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={saveOptions.savePassenger}
                  onChange={() => handleSaveOptionChange('savePassenger')}
                  className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                />
                <div>
                  <div className="font-semibold text-slate-700">Save passenger details</div>
                  <div className="text-sm text-slate-600">Add to your passenger list</div>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
          <Button variant="outline" onClick={onEdit} className="px-6">
            ← Edit Details
          </Button>
          <Button 
            onClick={handleConfirm}
            className="px-8 py-3 text-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          >
            Confirm & Submit ✓
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TripConfirmationStep;

