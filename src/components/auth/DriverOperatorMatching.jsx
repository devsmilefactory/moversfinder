/**
 * DriverOperatorMatching - Operator Selection & Vehicle Matching
 * BMTOA Platform
 * 
 * Allows drivers to:
 * 1. Select an operator (optional)
 * 2. Enter vehicle details
 * 3. Auto-search operator's fleet if operator selected
 * 4. Detect conflicts if vehicle already assigned
 * 5. Proceed manually if vehicle not found
 */

import React, { useState, useEffect } from 'react';
import Icon from '../ui/AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { supabase } from '../../lib/supabase';

const DriverOperatorMatching = ({ formData, setFormData, errors, setErrors }) => {
  const [selectedOperator, setSelectedOperator] = useState(formData.operator_id || '');
  const [vehicleSearched, setVehicleSearched] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [proceedManually, setProceedManually] = useState(false);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch operators from Supabase
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const { data, error } = await supabase
          .from('operator_profiles')
          .select(`
            user_id,
            company_name,
            fleet_size,
            bmtoa_verified,
            profile:profiles!operator_profiles_user_id_fkey(
              name,
              phone
            )
          `)
          .eq('bmtoa_verified', true)
          .order('company_name');

        if (error) throw error;

        // Map user_id to id for compatibility with existing code
        const mappedData = (data || []).map(op => ({
          ...op,
          id: op.user_id
        }));

        setOperators(mappedData);
      } catch (error) {
        console.error('Error fetching operators:', error);
        setOperators([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOperators();
  }, []);

  const handleOperatorSelect = (operatorId) => {
    setSelectedOperator(operatorId);
    setFormData(prev => ({ ...prev, operator_id: operatorId }));
    setVehicleSearched(false);
    setSearchResult(null);
    setProceedManually(false);
    
    if (errors.operator_id) {
      setErrors(prev => ({ ...prev, operator_id: '' }));
    }
  };

  const handleVehicleSearch = async () => {
    if (!formData.license_plate?.trim()) {
      setErrors(prev => ({ ...prev, license_plate: 'License plate is required to search' }));
      return;
    }

    if (!selectedOperator) {
      setErrors(prev => ({ ...prev, operator_id: 'Please select an operator first' }));
      return;
    }

    try {
      // Search for vehicle in operator's fleet
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('operator_id', selectedOperator)
        .or(`registration_number.ilike.%${formData.license_plate}%,vehicle_number.ilike.%${formData.license_plate}%`)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      const result = {
        found: !!vehicle,
        conflict: vehicle?.assigned_driver_id ? true : false,
        vehicle: vehicle || null,
        conflictDriver: vehicle?.assigned_driver_id || null,
      };

      setSearchResult(result);
      setVehicleSearched(true);

      // If found and no conflict, auto-fill vehicle details
      if (result.found && !result.conflict) {
        setFormData(prev => ({
          ...prev,
          vehicle_make: vehicle.make,
          vehicle_model: vehicle.model,
          vehicle_year: vehicle.year,
          vehicle_color: vehicle.color,
        }));
      }
    } catch (error) {
      console.error('Error searching vehicle:', error);
      setErrors(prev => ({ ...prev, license_plate: 'Error searching vehicle. Please try again.' }));
    }
  };

  const handleProceedManually = () => {
    setProceedManually(true);
    setSearchResult(null);
  };

  const handleSkipOperator = () => {
    setSelectedOperator('');
    setFormData(prev => ({ ...prev, operator_id: '' }));
    setProceedManually(true);
    setVehicleSearched(false);
    setSearchResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Operator Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Select Taxi Operator (Optional)
          </label>
          {selectedOperator && (
            <button
              type="button"
              onClick={handleSkipOperator}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Skip operator selection
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Loading operators...
          </div>
        ) : operators.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No verified operators available. You can proceed without selecting an operator.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {operators.map((operator) => (
              <button
                key={operator.id}
                type="button"
                onClick={() => handleOperatorSelect(operator.id)}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  selectedOperator === operator.id
                    ? 'border-[#FFC107] bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedOperator === operator.id
                      ? 'bg-[#FFC107]'
                      : 'bg-[#334155]'
                  }`}>
                    <Icon name="Building" className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{operator.company_name}</h5>
                    <p className="text-xs text-gray-600 mt-1">
                      {operator.fleet_size} vehicles
                    </p>
                    {operator.bmtoa_verified && (
                      <div className="flex items-center gap-1 mt-1">
                        <Icon name="CheckCircle" className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">BMTOA Verified</span>
                      </div>
                    )}
                  </div>
                  {selectedOperator === operator.id && (
                    <Icon name="Check" className="w-5 h-5 text-[#FFC107] flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {!selectedOperator && (
          <button
            type="button"
            onClick={handleSkipOperator}
            className="mt-3 w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-all"
          >
            <p className="text-sm font-medium text-gray-700">No Operator - Proceed Manually</p>
            <p className="text-xs text-gray-500 mt-1">Enter all vehicle details yourself</p>
          </button>
        )}

        {errors.operator_id && (
          <p className="mt-1 text-sm text-red-600">{errors.operator_id}</p>
        )}
      </div>

      {/* License Plate Input - Always show when no operator or when operator selected */}
      {(proceedManually || selectedOperator) && (
        <div className={`${selectedOperator && !proceedManually ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
          <div className="flex items-start gap-3 mb-4">
            <Icon name={selectedOperator && !proceedManually ? "Search" : "Car"} className={`w-5 h-5 ${selectedOperator && !proceedManually ? 'text-blue-600' : 'text-gray-600'} flex-shrink-0 mt-0.5`} />
            <div>
              <h4 className={`font-semibold ${selectedOperator && !proceedManually ? 'text-blue-900' : 'text-gray-900'}`}>
                {selectedOperator && !proceedManually ? 'Vehicle Lookup' : 'Vehicle License Plate'}
              </h4>
              <p className={`text-sm ${selectedOperator && !proceedManually ? 'text-blue-700' : 'text-gray-600'} mt-1`}>
                {selectedOperator && !proceedManually
                  ? "Enter your vehicle's license plate to check if it's in the operator's fleet"
                  : "Enter your vehicle's license plate (required for conflict checking)"
                }
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                name="license_plate"
                value={formData.license_plate}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, license_plate: e.target.value }));
                  if (errors.license_plate) {
                    setErrors(prev => ({ ...prev, license_plate: '' }));
                  }
                }}
                placeholder="ABZ 1234"
                error={errors.license_plate}
              />
            </div>
            {selectedOperator && !proceedManually && (
              <Button
                onClick={handleVehicleSearch}
                className="bg-[#334155] hover:bg-[#FFC107] hover:text-[#334155]"
              >
                <Icon name="Search" className="w-4 h-4 mr-1" />
                Search
              </Button>
            )}
          </div>

          {/* Search Results */}
          {vehicleSearched && searchResult && (
            <div className={`mt-4 p-3 border rounded-lg ${
              searchResult.conflict
                ? 'bg-red-50 border-red-200'
                : searchResult.found
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-2">
                <Icon 
                  name={searchResult.conflict ? 'AlertTriangle' : searchResult.found ? 'CheckCircle' : 'Info'} 
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    searchResult.conflict
                      ? 'text-red-600'
                      : searchResult.found
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  }`} 
                />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    searchResult.conflict
                      ? 'text-red-900'
                      : searchResult.found
                      ? 'text-green-900'
                      : 'text-yellow-900'
                  }`}>
                    {searchResult.message}
                  </p>
                  
                  {searchResult.found && !searchResult.conflict && (
                    <div className="mt-2 text-xs text-green-700">
                      <p>✓ Vehicle found: {searchResult.vehicle.make} {searchResult.vehicle.model} ({searchResult.vehicle.year})</p>
                      <p className="mt-1">Your request will be sent to the operator for approval</p>
                    </div>
                  )}

                  {searchResult.conflict && (
                    <div className="mt-2 text-xs text-red-700">
                      <p>This vehicle is already assigned. Your request will be flagged for admin review.</p>
                    </div>
                  )}

                  {!searchResult.found && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={handleProceedManually}
                        className="text-xs text-yellow-700 hover:text-yellow-900 underline"
                      >
                        Proceed manually and enter vehicle details yourself
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Icon name="Info" className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">How Operator Matching Works</p>
            <ul className="text-xs text-gray-600 mt-2 space-y-1">
              <li>• <strong>With Operator:</strong> Your request will be sent for approval. If approved, you'll be linked to their fleet.</li>
              <li>• <strong>Without Operator:</strong> You'll operate independently and can join an operator later.</li>
              <li>• <strong>Vehicle Conflict:</strong> If detected, admin will review and resolve the conflict.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverOperatorMatching;

