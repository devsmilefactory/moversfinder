import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import FormInput, { FormSelect } from '../../shared/FormInput';
import CompactCourierForm from './CompactCourierForm';
import TripConfirmationStep from './TripConfirmationStep';
import { useAuthStore } from '../../../stores';
import { supabase } from '../../../lib/supabase';
import { createSingleCourierBooking } from '../../../services/corporateBookingService';

/**
 * Corporate Single Courier Booking Form
 *
 * For booking courier/package delivery services
 * NO passenger selection - focuses on package details
 * Now with confirmation step before submission
 */

const CorporateSingleCourierForm = ({ onBack, onComplete, initialLocation }) => {
  const user = useAuthStore((state) => state.user);
  const [currentStep, setCurrentStep] = useState('form'); // 'form' or 'confirmation'
  const [scheduleType, setScheduleType] = useState('instant'); // 'instant', 'scheduled', 'recurring'
  const [recurringPattern, setRecurringPattern] = useState('daily');

  // Account balance state
  const [accountBalance, setAccountBalance] = useState({
    balance: 0,
    loading: true
  });

  const [formData, setFormData] = useState({
    // Locations
    pickupLocation: initialLocation?.address || '',
    dropoffLocation: '',
    // Courier-specific
    recipientName: '',
    recipientPhone: '',
    packageDetails: '',
    packageSize: 'small',
    additionalDeliveries: [],
    // Scheduling
    scheduledDate: '',
    scheduledTime: '',
    recurringEndDate: '',
    // Other
    paymentMethod: 'cash',
    specialInstructions: ''
  });

  // Mock user for development
  const mockUser = user || {
    id: 'user-1',
    companyId: 'company-1',
  };

  // Load account balance
  useEffect(() => {
    const loadBalance = async () => {
      try {
        if (!mockUser?.companyId) return;

        const { data, error } = await supabase
          .from('corporate_profiles')
          .select('credit_balance')
          .eq('user_id', mockUser.companyId)
          .single();

        if (error) throw error;

        setAccountBalance({
          balance: parseFloat(data?.credit_balance || 0),
          loading: false
        });
      } catch (error) {
        console.error('Error loading balance:', error);
        setAccountBalance({ balance: 0, loading: false });
      }
    };

    loadBalance();
  }, [mockUser?.companyId]);

  const savedPlaces = [];

  const handleFormChange = (newData) => {
    setFormData(newData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Move to confirmation step instead of submitting directly
    setCurrentStep('confirmation');
  };

  const handleConfirm = async (bookingDataWithSaveOptions) => {
    try {
      const result = await createSingleCourierBooking(bookingDataWithSaveOptions, user);

      if (result.success) {
        alert(`✅ Courier delivery booked successfully!${bookingDataWithSaveOptions.saveOptions.saveTrip ? '\n💾 Trip saved for future use!' : ''}`);
        onComplete();
      } else {
        alert(`❌ Error creating booking: ${result.error}`);
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
      alert(`❌ Error creating booking: ${error.message}`);
    }
  };

  const handleEditFromConfirmation = () => {
    setCurrentStep('form');
  };

  const getBookingData = () => {
    return {
      bookingType: 'single',
      serviceType: 'courier',
      scheduleType,
      recurringPattern: scheduleType === 'recurring' ? recurringPattern : null,
      ...formData
    };
  };

  // Show confirmation step
  if (currentStep === 'confirmation') {
    return (
      <TripConfirmationStep
        bookingData={getBookingData()}
        onEdit={handleEditFromConfirmation}
        onConfirm={handleConfirm}
        showSavePassenger={false}
      />
    );
  }

  // Show form step
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">Book Courier</h1>
          <p className="text-slate-600">Single Package Delivery</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          
          {/* Delivery Details */}
          <div className="pb-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Delivery Details</h2>
            <CompactCourierForm
              formData={formData}
              onChange={handleFormChange}
              savedPlaces={savedPlaces}
            />
          </div>

          {/* Schedule Type Section */}
          <div>
            <h2 className="text-lg font-semibold text-slate-700 mb-4">When?</h2>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <button
                type="button"
                onClick={() => setScheduleType('instant')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  scheduleType === 'instant'
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mb-1">⚡</div>
                <div className="font-semibold text-slate-700">Instant</div>
                <div className="text-xs text-slate-600">Deliver now</div>
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('scheduled')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  scheduleType === 'scheduled'
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mb-1">📅</div>
                <div className="font-semibold text-slate-700">Scheduled</div>
                <div className="text-xs text-slate-600">Pick date & time</div>
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('recurring')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  scheduleType === 'recurring'
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mb-1">🔄</div>
                <div className="font-semibold text-slate-700">Recurring</div>
                <div className="text-xs text-slate-600">Repeat delivery</div>
              </button>
            </div>

            {scheduleType === 'recurring' && (
              <div className="mb-4">
                <FormSelect
                  label="Repeat Pattern"
                  name="recurringPattern"
                  value={recurringPattern}
                  onChange={(e) => setRecurringPattern(e.target.value)}
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' }
                  ]}
                />
              </div>
            )}

            {(scheduleType === 'scheduled' || scheduleType === 'recurring') && (
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  type="date"
                  label={scheduleType === 'recurring' ? 'Start Date' : 'Date'}
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  required
                />
                <FormInput
                  type="time"
                  label="Time"
                  name="scheduledTime"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  required
                />
              </div>
            )}

            {scheduleType === 'recurring' && (
              <div className="mt-4">
                <FormInput
                  type="date"
                  label="End Date"
                  name="recurringEndDate"
                  value={formData.recurringEndDate}
                  onChange={(e) => setFormData({ ...formData, recurringEndDate: e.target.value })}
                  required
                />
              </div>
            )}
          </div>

          {/* Payment Method Section */}
          <div className="pb-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Payment Method</h2>

            {/* Account Balance Display */}
            {!accountBalance.loading && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Account Balance</p>
                    <p className="text-2xl font-bold text-green-700">${accountBalance.balance.toFixed(2)}</p>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentMethod: 'account_balance' })}
                disabled={accountBalance.balance <= 0}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  formData.paymentMethod === 'account_balance'
                    ? 'border-green-500 bg-green-50'
                    : accountBalance.balance <= 0
                    ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💰</div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-700">Account Balance</div>
                    <div className="text-sm text-slate-600">Use prepaid credits</div>
                    {accountBalance.balance <= 0 && (
                      <div className="text-xs text-red-600 mt-1">Insufficient balance</div>
                    )}
                  </div>
                  {formData.paymentMethod === 'account_balance' && (
                    <div className="text-green-500 text-xl">✓</div>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  formData.paymentMethod === 'cash'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💵</div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-700">Cash</div>
                    <div className="text-sm text-slate-600">Pay driver directly</div>
                  </div>
                  {formData.paymentMethod === 'cash' && (
                    <div className="text-yellow-500 text-xl">✓</div>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentMethod: 'ecocash' })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  formData.paymentMethod === 'ecocash'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📱</div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-700">EcoCash</div>
                    <div className="text-sm text-slate-600">Mobile money</div>
                  </div>
                  {formData.paymentMethod === 'ecocash' && (
                    <div className="text-blue-500 text-xl">✓</div>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentMethod: 'onemoney' })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  formData.paymentMethod === 'onemoney'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📲</div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-700">OneMoney</div>
                    <div className="text-sm text-slate-600">Mobile money</div>
                  </div>
                  {formData.paymentMethod === 'onemoney' && (
                    <div className="text-purple-500 text-xl">✓</div>
                  )}
                </div>
              </button>
            </div>

            {formData.paymentMethod === 'account_balance' && accountBalance.balance > 0 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  💡 The delivery cost will be deducted from your account balance upon completion.
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t border-slate-200 flex justify-between">
            <Button variant="outline" onClick={onBack}>
              ← Back
            </Button>
            <Button type="submit" className="px-8">
              Continue to Review →
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CorporateSingleCourierForm;

