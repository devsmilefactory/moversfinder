import React, { useState } from 'react';
import Button from '../../shared/Button';
import CorporateSingleRideForm from './CorporateSingleRideForm';
import CorporateSingleCourierForm from './CorporateSingleCourierForm';
import CorporateBulkBookingFormNew from './CorporateBulkBookingFormNew';

/**
 * Corporate Booking Flow - SIMPLIFIED
 * 
 * 2-Step Process + Confirmation:
 * 1. Select Booking Type AND Service Type (combined on one screen)
 * 2. Fill out booking form
 * 3. Review and confirm booking (handled by individual forms)
 * 
 * Design: Compact, space-efficient with clear visual switches
 */

const CorporateBookingFlowSimplified = ({ onBack, initialLocation }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Combined Selection, 2: Form
  const [bookingType, setBookingType] = useState('single'); // 'single' or 'bulk'
  const [serviceType, setServiceType] = useState('rides'); // 'rides' or 'courier'

  const handleProceed = () => {
    setCurrentStep(2);
  };

  const handleBackToSelection = () => {
    setCurrentStep(1);
  };

  const handleComplete = () => {
    // Reset and go back to main page
    setCurrentStep(1);
    setBookingType('single');
    setServiceType('rides');
    onBack();
  };

  // Step 1: Combined Booking Type + Service Type Selection
  if (currentStep === 1) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-700">New Booking</h1>
            <p className="text-slate-600">Select booking type and service</p>
          </div>
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 space-y-10">

          {/* Booking Type Selection */}
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-700 mb-2">Step 1: Choose Booking Type</h2>
              <p className="text-sm text-slate-600">Select whether you're booking for one or multiple passengers/packages</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Single Booking */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setBookingType('single')}
                  className={`w-full p-5 rounded-xl border-2 transition-all ${
                    bookingType === 'single'
                      ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg scale-105'
                      : 'border-slate-200 hover:border-yellow-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">🚕</div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-slate-700">Single</div>
                        <div className="text-xs text-slate-500">One trip</div>
                      </div>
                    </div>
                    {bookingType === 'single' && (
                      <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    )}
                  </div>
                </button>
                <div className="px-2 text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-700">Perfect for:</span> Individual employee trips, client pickups, or single package deliveries
                </div>
              </div>

              {/* Bulk Booking */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setBookingType('bulk')}
                  className={`w-full p-5 rounded-xl border-2 transition-all ${
                    bookingType === 'bulk'
                      ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg scale-105'
                      : 'border-slate-200 hover:border-yellow-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">👥</div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-slate-700">Bulk</div>
                        <div className="text-xs text-slate-500">Multiple trips</div>
                      </div>
                    </div>
                    {bookingType === 'bulk' && (
                      <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    )}
                  </div>
                </button>
                <div className="px-2 text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-700">Perfect for:</span> Team outings, group events, multiple deliveries, or recurring schedules
                </div>
              </div>
            </div>
          </div>

          {/* Service Type Selection */}
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-700 mb-2">Step 2: Choose Service Type</h2>
              <p className="text-sm text-slate-600">Select the type of service you need</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Rides */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setServiceType('rides')}
                  className={`w-full p-5 rounded-xl border-2 transition-all ${
                    serviceType === 'rides'
                      ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg scale-105'
                      : 'border-slate-200 hover:border-yellow-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">🚗</div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-slate-700">Rides</div>
                        <div className="text-xs text-slate-500">Passenger transport</div>
                      </div>
                    </div>
                    {serviceType === 'rides' && (
                      <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    )}
                  </div>
                </button>
                <div className="px-2 text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-700">Includes:</span> Professional drivers, real-time tracking, multiple stops, and flexible scheduling
                </div>
              </div>

              {/* Courier */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setServiceType('courier')}
                  className={`w-full p-5 rounded-xl border-2 transition-all ${
                    serviceType === 'courier'
                      ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg scale-105'
                      : 'border-slate-200 hover:border-yellow-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">📦</div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-slate-700">Courier</div>
                        <div className="text-xs text-slate-500">Package delivery</div>
                      </div>
                    </div>
                    {serviceType === 'courier' && (
                      <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    )}
                  </div>
                </button>
                <div className="px-2 text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-700">Includes:</span> Fast delivery, proof of delivery, package tracking, and multiple drop-offs
                </div>
              </div>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-yellow-400 font-semibold mb-2 uppercase tracking-wide">Ready to Book</div>
                <div className="text-2xl font-bold text-white mb-2">
                  {bookingType === 'single' ? 'Single' : 'Bulk'} {serviceType === 'rides' ? 'Ride' : 'Courier'}
                </div>
                <div className="text-sm text-slate-300">
                  {bookingType === 'single' && serviceType === 'rides' && '✓ One passenger trip with flexible scheduling'}
                  {bookingType === 'single' && serviceType === 'courier' && '✓ One package delivery with tracking'}
                  {bookingType === 'bulk' && serviceType === 'rides' && '✓ Multiple passengers with vehicle selection'}
                  {bookingType === 'bulk' && serviceType === 'courier' && '✓ Multiple packages with batch delivery'}
                </div>
              </div>
              <div className="text-6xl opacity-90">
                {bookingType === 'single' && serviceType === 'rides' && '🚕'}
                {bookingType === 'single' && serviceType === 'courier' && '📦'}
                {bookingType === 'bulk' && serviceType === 'rides' && '🚐'}
                {bookingType === 'bulk' && serviceType === 'courier' && '📦📦'}
              </div>
            </div>
          </div>

          {/* Proceed Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleProceed}
              className="px-10 py-3 text-lg bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-800 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              Continue to Booking Details →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Booking Form
  if (currentStep === 2) {
    if (bookingType === 'single') {
      // Single booking - different forms for Rides vs Courier
      if (serviceType === 'rides') {
        return (
          <CorporateSingleRideForm
            onBack={handleBackToSelection}
            onComplete={handleComplete}
            initialLocation={initialLocation}
          />
        );
      } else {
        // Courier - separate form for package delivery
        return (
          <CorporateSingleCourierForm
            onBack={handleBackToSelection}
            onComplete={handleComplete}
            initialLocation={initialLocation}
          />
        );
      }
    } else {
      // Bulk booking - temporarily in Coming Soon mode
      return (
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🚧</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Bulk Booking – Coming Soon</h2>
          <p className="text-slate-600 mb-6">We're rolling this out gradually. For now, please use Single booking.</p>
          <div className="flex items-center justify-center">
            <Button variant="primary" onClick={handleBackToSelection} className="bg-yellow-400 text-slate-900 hover:bg-yellow-500">Back</Button>
          </div>
        </div>
      );
    }
  }

  return null;
};

export default CorporateBookingFlowSimplified;

