import React from 'react';
import Icon from '../../ui/AppIcon';

/**
 * AuthMethodSelection Component
 * 
 * Second step of registration - user chooses authentication method
 */
const AuthMethodSelection = ({ selectedMethod, onMethodSelect, userType }) => {
  const AUTH_METHODS = [
    {
      id: 'password',
      title: 'Email & Password',
      subtitle: 'Traditional account with password',
      icon: 'Lock',
      recommended: false
    },
    {
      id: 'otp',
      title: 'Email & OTP',
      subtitle: 'Quick signup with one-time password',
      icon: 'Mail',
      recommended: true
    }
  ];

  const getUserTypeTitle = () => {
    const types = {
      individual: 'Individual',
      corporate: 'Corporate',
      driver: 'Driver'
    };
    return types[userType] || 'User';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Sign-up Method
        </h2>
        <p className="text-gray-600">
          Creating {getUserTypeTitle()} account
        </p>
      </div>

      <div className="space-y-3">
        {AUTH_METHODS.map((method) => (
          <button
            key={method.id}
            onClick={() => onMethodSelect(method.id)}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left relative ${
              selectedMethod === method.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {method.recommended && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                Recommended
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                selectedMethod === method.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <Icon name={method.icon} size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{method.title}</h3>
                <p className="text-sm text-gray-600">{method.subtitle}</p>
              </div>
              {selectedMethod === method.id && (
                <div className="text-blue-600">
                  <Icon name="Check" size={20} />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Method Comparison */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Method Comparison</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-gray-800 mb-2">Email & Password</h5>
            <ul className="space-y-1 text-gray-600">
              <li>• Traditional login</li>
              <li>• Password required</li>
              <li>• Email verification needed</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-gray-800 mb-2">Email & OTP</h5>
            <ul className="space-y-1 text-gray-600">
              <li>• Quick setup</li>
              <li>• No password to remember</li>
              <li>• Instant verification</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthMethodSelection;