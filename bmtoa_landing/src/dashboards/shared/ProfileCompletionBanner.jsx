import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import Icon from '../../components/AppIcon';

/**
 * Profile Completion Banner Component
 * Displays a prominent banner when user profile is incomplete
 * Shows completion percentage, checklist, and CTA to complete profile
 */
const ProfileCompletionBanner = ({ user, userType }) => {
  const navigate = useNavigate();

  // Don't show banner if profile is complete
  if (user?.profile_completion_status === 'complete') {
    return null;
  }

  const completionPercentage = user?.profile_completion_percentage || 0;

  // Define checklist items based on user type
  const getChecklistItems = () => {
    const baseItems = [
      { id: 'basic_info', label: 'Basic Information', completed: !!user?.name && !!user?.email },
      { id: 'phone', label: 'Phone Number', completed: !!user?.phone },
      { id: 'photo', label: 'Profile Photo', completed: !!user?.avatar_url || !!user?.profile_photo },
    ];

    if (userType === 'driver') {
      return [
        ...baseItems,
        { id: 'license', label: 'Driver License', completed: false }, // Check driver_profiles table
        { id: 'vehicle', label: 'Vehicle Information', completed: false },
        { id: 'documents', label: 'Required Documents', completed: false },
      ];
    }

    if (userType === 'taxi_operator' || userType === 'operator') {
      return [
        ...baseItems,
        { id: 'company', label: 'Company Information', completed: false }, // Check operator_profiles table
        { id: 'fleet', label: 'Fleet Details', completed: false },
        { id: 'documents', label: 'Business Documents', completed: false },
      ];
    }

    return baseItems;
  };

  const checklistItems = getChecklistItems();
  const completedItems = checklistItems.filter(item => item.completed).length;

  const handleCompleteProfile = () => {
    // Navigate to profile completion page based on user type
    if (userType === 'driver') {
      navigate('/driver/profile');
    } else if (userType === 'taxi_operator' || userType === 'operator') {
      navigate('/operator/profile');
    }
  };

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-xl p-6 mb-6 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left Section - Message and Progress */}
        <div className="flex-1">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                <Icon name="AlertCircle" size={24} className="text-slate-700" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Complete Your Profile
              </h3>
              <p className="text-slate-600 mb-4">
                Your profile is <strong>{completionPercentage}% complete</strong>. 
                Complete your profile to unlock all features and start {userType === 'driver' ? 'accepting rides' : 'managing your fleet'}.
              </p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    {completedItems} of {checklistItems.length} steps completed
                  </span>
                  <span className="text-sm font-bold text-yellow-600">
                    {completionPercentage}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      item.completed 
                        ? 'bg-green-500 text-white' 
                        : 'bg-slate-300 text-slate-500'
                    }`}>
                      {item.completed ? (
                        <Icon name="Check" size={14} />
                      ) : (
                        <Icon name="X" size={14} />
                      )}
                    </div>
                    <span className={`text-sm ${
                      item.completed 
                        ? 'text-slate-700 font-medium' 
                        : 'text-slate-500'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - CTA */}
        <div className="flex-shrink-0">
          <Button
            variant="default"
            size="lg"
            onClick={handleCompleteProfile}
            iconName="ArrowRight"
            iconPosition="right"
            className="w-full lg:w-auto shadow-lg hover:shadow-xl transition-shadow"
          >
            Complete Profile Now
          </Button>
          <p className="text-xs text-slate-500 mt-2 text-center lg:text-left">
            Takes about 5-10 minutes
          </p>
        </div>
      </div>

      {/* Warning for verification status */}
      {user?.verification_status === 'pending' && (
        <div className="mt-4 pt-4 border-t border-yellow-300">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Icon name="Clock" size={16} className="text-yellow-600" />
            <span>
              Your profile is pending verification. Complete all required information to speed up the approval process.
            </span>
          </div>
        </div>
      )}

      {user?.verification_status === 'rejected' && (
        <div className="mt-4 pt-4 border-t border-red-300 bg-red-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
          <div className="flex items-start gap-2 text-sm text-red-700">
            <Icon name="XCircle" size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Profile Verification Failed</p>
              <p>{user?.rejection_reason || 'Please review and update your information.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCompletionBanner;

