import React from 'react';
import Icon from '../../ui/AppIcon';

/**
 * UserTypeSelection Component
 * 
 * First step of registration - user selects their account type
 */
const UserTypeSelection = ({ selectedUserType, onUserTypeSelect }) => {
  const USER_TYPES = [
    {
      id: 'individual',
      title: 'Individual',
      subtitle: 'Book rides for personal use',
      icon: 'User',
    },
    {
      id: 'corporate',
      title: 'Corporate',
      subtitle: 'Manage company transportation',
      icon: 'Building',
    },
    {
      id: 'driver',
      title: 'Driver',
      subtitle: 'Drive and earn with TaxiCab',
      icon: 'Car',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Join TaxiCab
        </h2>
        <p className="text-gray-600">
          Choose your account type to get started
        </p>
      </div>

      <div className="space-y-3">
        {USER_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => onUserTypeSelect(type.id)}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
              selectedUserType === type.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                selectedUserType === type.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <Icon name={type.icon} size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{type.title}</h3>
                <p className="text-sm text-gray-600">{type.subtitle}</p>
              </div>
              {selectedUserType === type.id && (
                <div className="text-blue-600">
                  <Icon name="Check" size={20} />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Why choose TaxiCab?</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Safe and reliable transportation</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Competitive pricing</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-green-600">✓</span>
            <span>24/7 customer support</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Real-time tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTypeSelection;