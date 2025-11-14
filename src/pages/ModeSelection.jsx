import React from 'react';
import { motion } from 'framer-motion';
import { Car, User, ArrowRight, Building2, Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import useProfileStore from '../stores/profileStore';
import useProfileSwitch from '../hooks/useProfileSwitch';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import { isComingSoon } from '../config/profileAvailability';


/**
 * Profile Selection Screen - Multi-Profile System
 * Allows users to choose between their available profiles
 *
 * Features:
 * - Shows all available profiles with status badges
 * - Handles profile switching
 * - Redirects to profile creation if needed
 * - Visual profile cards with animations
 * - Mobile-optimized layout
 */
const ModeSelection = () => {
  const { availableProfiles } = useProfileStore();

  // Use shared profile switching hook
  const { handleProfileSwitch, switching, confirmationModal } = useProfileSwitch();

  /**
   * Handle profile selection - uses shared profile switching logic
   */
  const handleProfileSelect = async (profileType) => {
    // Use the shared profile switching hook
    await handleProfileSwitch(profileType);
  };

  // Profile configurations - ALL possible profile types
  const profileConfigs = {
    individual: {
      title: 'Passenger',
      description: 'Book rides for yourself',
      icon: User,
      gradient: 'from-blue-500 to-blue-600',
      features: [
        'Book instant or scheduled rides',
        'Track your rides in real-time',
        'Manage multiple bookings',
        'Access ride history'
      ]
    },
    corporate: {
      title: 'Corporate',
      description: 'Book rides for your business',
      icon: Building2,
      gradient: 'from-purple-500 to-purple-600',
      features: [
        'Manage company bookings',
        'Add multiple employees',
        'Track business expenses',
        'Generate reports'
      ]
    },
    driver: {
      title: 'Driver',
      description: 'Accept ride requests and earn money',
      icon: Car,
      gradient: 'from-primary to-accent',
      features: [
        'Receive ride requests',
        'Navigate to pickup locations',
        'Track your earnings',
        'Manage your availability'
      ]
    },
    operator: {
      title: 'Operator',
      description: 'Manage fleet & drivers',
      icon: Users,
      gradient: 'from-slate-500 to-slate-600',
      features: [
        'Manage fleet assets',
        'Onboard and manage drivers',
        'View operations status',
        'Fleet analytics'
      ]
    }
  };

  /**
   * Get profile status from availableProfiles or return default 'not_created' status
   */
  const getProfileStatus = (profileType) => {
    const profile = availableProfiles.find(p => p.type === profileType);
    return profile || {
      type: profileType,
      status: 'not_created',
      approval: 'pending',
      completion: 0
    };
  };

  // Display only Passenger (individual) and Driver per UI request
  const displayProfiles = ['individual', 'driver']
    .map(type => getProfileStatus(type));

  // Get status badge component
  const getStatusBadge = (status) => {
    const badges = {
      approved: { icon: CheckCircle, text: 'Active', color: 'bg-green-500' },
      pending_approval: { icon: Clock, text: 'Pending', color: 'bg-yellow-500' },
      in_progress: { icon: AlertCircle, text: 'Incomplete', color: 'bg-orange-500' },
      rejected: { icon: XCircle, text: 'Rejected', color: 'bg-red-500' },
      not_created: { icon: AlertCircle, text: 'Not Created', color: 'bg-gray-400' }
    };

    const badge = badges[status] || badges.not_created;
    const Icon = badge.icon;

    return (
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${badge.color} text-white text-xs`}>
        <Icon className="w-3 h-3" />
        <span>{badge.text}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <div className="pt-safe px-6 py-8 bg-white shadow-sm">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Select Profile
          </h1>
          <p className="text-gray-600">
            Choose which profile you want to use
          </p>
        </motion.div>
      </div>

      {/* Profile Cards */}
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {displayProfiles.map((profile, index) => {
            const config = profileConfigs[profile.type];
            if (!config) return null;

            const Icon = config.icon;
            const comingSoon = isComingSoon(profile.type);
            // Mirror ProfileSwitcher behavior: always clickable; routing handled by useProfileSwitch
            const isClickable = true;

            return (
              <motion.div
                key={profile.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileTap={isClickable ? { scale: 0.98 } : {}}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : -1}
                onClick={() => {
                  if (isClickable) {
                    handleProfileSelect(profile.type);
                  }
                }}
                onKeyDown={(e) => {
                  if (!isClickable) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleProfileSelect(profile.type);
                  }
                }}
                className={`
                  relative overflow-hidden rounded-2xl shadow-lg
                  transition-all duration-300 touch-feedback
                  ${isClickable ? 'cursor-pointer hover:shadow-xl' : 'cursor-not-allowed opacity-75'}
                `}
              >
                {/* Gradient Background */}
                <div className={`bg-gradient-to-br ${config.gradient} p-6 text-white`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Icon className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h2 className="text-2xl font-bold">
                            {config.title}
                          </h2>
                          {getStatusBadge(profile.status)}
                          {comingSoon && (
                            <span className="ml-2 px-2 py-0.5 bg-yellow-500/10 text-yellow-100 border border-yellow-300/50 text-xs rounded-full">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <p className="text-white/90 text-sm">
                          {config.description}
                        </p>
                      </div>
                    </div>
                    {isClickable && (
                      <ArrowRight className="w-6 h-6" />
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 mt-6">
                    {config.features.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + idx * 0.05 }}
                        className="flex items-center space-x-2"
                      >
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        <span className="text-sm text-white/90">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Status Message */}
                  {!isClickable && (
                    <div className="mt-4 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                      <p className="text-sm text-white/90">
                        {profile.status === 'pending_approval' && 'Your profile is being reviewed'}
                        {profile.status === 'in_progress' && 'Complete your profile to access'}
                        {profile.status === 'rejected' && 'Profile rejected - please resubmit'}
                        {profile.status === 'not_created' && 'Create this profile to access'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="pb-safe px-6 py-4 bg-white border-t border-gray-200"
      >
        <p className="text-center text-sm text-gray-600">
          You can switch profiles anytime using the menu
        </p>
        {switching && (
          <div className="mt-2 flex items-center justify-center space-x-2 text-primary">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm">Switching profile...</span>
          </div>
        )}
      </motion.div>

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-20 -right-20 w-64 h-64 bg-primary rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl"
        />
      </div>

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
    </div>
  );
};

export default ModeSelection;

