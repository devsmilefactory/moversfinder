import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building2, Car, Users, CheckCircle, Clock, AlertCircle, XCircle, ChevronRight, Plus } from 'lucide-react';
import useProfileStore from '../../stores/profileStore';
import useProfileSwitch from '../../hooks/useProfileSwitch';
import ConfirmationModal from '../modals/ConfirmationModal';

import { isComingSoon } from '../../config/profileAvailability';

/**
 * ProfileSwitcher Component
 *
 * Modal component for switching between user profiles
 * Shows all available profiles with their status
 * Allows quick switching between approved profiles
 */
const ProfileSwitcher = ({ isOpen, onClose }) => {
  const { availableProfiles, activeProfileType } = useProfileStore();

  // Use shared profile switching hook
  const { handleProfileSwitch, switching, confirmationModal } = useProfileSwitch();



  const profileConfigs = {
    individual: {
      title: 'Passenger',
      icon: User,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      route: '/user/book-ride'
    },
    corporate: {
      title: 'Corporate',
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      route: '/corporate/book-ride'
    },
    driver: {
      title: 'Driver',
      icon: Car,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      route: '/driver/rides'
    },
    operator: {
      title: 'Operator',
      icon: Users,
      color: 'text-slate-700',
      bgColor: 'bg-slate-100',
      route: '/operator/status'
    }
  };

  const statusIcons = {
    approved: { icon: CheckCircle, color: 'text-green-600' },
    pending_approval: { icon: Clock, color: 'text-yellow-600' },
    in_progress: { icon: AlertCircle, color: 'text-orange-600' },
    incomplete: { icon: AlertCircle, color: 'text-orange-600' },
    rejected: { icon: XCircle, color: 'text-red-600' },
    declined: { icon: XCircle, color: 'text-red-600' },
    not_created: { icon: Plus, color: 'text-gray-400' }
  };

  /**
   * Wrapper for profile switching that closes the modal on success
   */
  const handleProfileSwitchClick = async (profileType) => {
    console.log('ProfileSwitcher: Switching to', profileType);

    // If already on this profile, just close the modal
    if (profileType === activeProfileType) {
      onClose();
      return;
    }

    // Use the shared hook's handleProfileSwitch with onSuccess callback
    await handleProfileSwitch(profileType, onClose);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[110]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-2xl shadow-2xl z-[111] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-accent p-6 text-white">
              <h2 className="text-2xl font-bold mb-1">Switch Profile</h2>
              <p className="text-white/90 text-sm">Choose which profile to use</p>
            </div>

            {/* Profile List */}
            <div className="max-h-96 overflow-y-auto p-4 space-y-3">
              {/* Show all possible profile types */}
              {Object.keys(profileConfigs).map((profileType) => {
                const config = profileConfigs[profileType];
                const profile = availableProfiles.find(p => p.type === profileType) || {
                  type: profileType,
                  status: 'not_created',
                  approval: 'pending'
                };

                const Icon = config.icon;
                const StatusIcon = statusIcons[profile.status]?.icon || AlertCircle;
                const statusColor = statusIcons[profile.status]?.color || 'text-gray-600';
                const isActive = profile.type === activeProfileType;
                const isApproved = profile.status === 'approved' && profile.approval === 'approved';
                const comingSoon = isComingSoon(profileType);
                // Allow navigation; Coming Soon routes to status/info page
                const isClickable = true;

                return (
                  <button
                    key={profileType}
                    onClick={() => handleProfileSwitchClick(profileType)}
                    disabled={!isClickable || switching}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all
                      ${isActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}
                      ${!isClickable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                      ${switching ? 'pointer-events-none' : ''}
                    `}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-6 h-6 ${config.color}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">{config.title}</h3>
                          {isActive && (
                            <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                              Active
                            </span>
                          )}
                          {comingSoon && (
                            <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-700 border border-yellow-200 text-xs rounded-full">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          <StatusIcon className={`w-3 h-3 ${statusColor}`} />
                          <span className={`text-xs ${statusColor}`}>
                            {profile.status === 'approved' && 'Ready'}
                            {profile.status === 'pending_approval' && 'Pending Approval'}
                            {(profile.status === 'in_progress' || profile.status === 'incomplete') && 'Incomplete'}
                            {(profile.status === 'rejected' || profile.status === 'declined') && 'Declined - Can Resubmit'}
                            {profile.status === 'not_created' && 'Not Created'}
                          </span>
                        </div>
                      </div>

                      {/* Action Button/Arrow */}
                      {!isActive && (
                        <div className="flex items-center space-x-2">
                          {profile.status === 'not_created' && (
                            <span className="text-xs font-medium text-primary">Create</span>
                          )}
                          {(profile.status === 'in_progress' || profile.status === 'incomplete') && (
                            <span className="text-xs font-medium text-orange-600">Complete</span>
                          )}
                          {(profile.status === 'rejected' || profile.status === 'declined') && (
                            <span className="text-xs font-medium text-red-600">Resubmit</span>
                          )}
                          {isApproved && (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Switching Indicator */}
            {switching && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-3"></div>
                  <p className="text-gray-600 font-medium">Switching profile...</p>
                </div>
              </div>
            )}
          </motion.div>
        </>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={confirmationModal.onClose}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        type={confirmationModal.type}
        confirmText="Create"
        cancelText="Cancel"
      />
    </>
  );
};

export default ProfileSwitcher;

