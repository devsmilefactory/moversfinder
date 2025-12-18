import React, { useState, useEffect, useMemo } from 'react';
import Button from '../../../components/ui/Button';
import { useRideStatus, RIDE_STATUSES } from '../../../hooks/useRideStatus';
import { useToast } from '../../../components/ui/ToastProvider';
import { supabase } from '../../../lib/supabase';
import useAuthStore from '../../../stores/authStore';
import { getNavigationUrlTo } from '../../../utils/navigation';
import { useRideCompletion } from '../../../hooks/useRideCompletion';
import { notifyStatusUpdateFromOverlay } from '../../../services/notificationService';
import {
  summarizeErrandTasks,
  parseErrandTasks,
  describeTaskState,
  getNextTaskState,
  ERRAND_TASK_STATES
} from '../../../utils/errandTasks';
import { isErrandService } from '../../../utils/serviceTypes';
import { fetchErrandTasksForRide, advanceErrandTask } from '../../../services/errandTaskService';
import { isRoundTripRide } from '../../../utils/rideCostDisplay';
import { 
  driverOnTheWay, 
  driverArrived, 
  startTrip, 
  completeTrip 
} from '../../../services/rideStateService';

const ERRAND_TASK_ACTION_DEFS = {
  [ERRAND_TASK_STATES.PENDING]: {
    label: 'Activate Task',
    helper: 'Confirm you are ready to start this task.',
    notificationKey: ERRAND_TASK_STATES.ACTIVATED
  },
  [ERRAND_TASK_STATES.ACTIVATED]: {
    label: 'Driver On The Way',
    helper: 'Notify the passenger you are heading to this task.',
    notificationKey: ERRAND_TASK_STATES.DRIVER_ON_WAY
  },
  [ERRAND_TASK_STATES.DRIVER_ON_WAY]: {
    label: 'Mark Arrived',
    helper: 'Confirm arrival at the task location.',
    notificationKey: ERRAND_TASK_STATES.DRIVER_ARRIVED
  },
  [ERRAND_TASK_STATES.DRIVER_ARRIVED]: {
    label: 'Start Task',
    helper: 'Begin executing the task.',
    notificationKey: ERRAND_TASK_STATES.STARTED
  },
  [ERRAND_TASK_STATES.STARTED]: {
    label: 'Complete Task',
    helper: 'Confirm the task is done.',
    notificationKey: ERRAND_TASK_STATES.COMPLETED
  }
};

const ERRAND_TASK_NOTIFICATIONS = {
  [ERRAND_TASK_STATES.ACTIVATED]: (task) => ({
    title: '🛍️ Task Activated',
    message: `Your driver queued "${task?.title || 'a task'}".`
  }),
  [ERRAND_TASK_STATES.DRIVER_ON_WAY]: (task) => ({
    title: '🚗 Driver Heading Over',
    message: `Driver is en route to "${task?.title || 'your task'}".`
  }),
  [ERRAND_TASK_STATES.DRIVER_ARRIVED]: (task) => ({
    title: '📍 Driver Arrived',
    message: `Driver reached the location for "${task?.title || 'your task'}".`
  }),
  [ERRAND_TASK_STATES.STARTED]: (task) => ({
    title: '🧾 Task Started',
    message: `"${task?.title || 'Your task'}" is now in progress.`
  }),
  [ERRAND_TASK_STATES.COMPLETED]: (task) => ({
    title: '✅ Task Completed',
    message: `"${task?.title || 'Your task'}" is complete.`
  })
};

/**
 * ActiveRideOverlay Component
 *
 * Displays an overlay on all tabs when driver has an active ride
 * Prevents accepting other rides and provides quick access to active ride actions
 */
const ActiveRideOverlay = ({ ride, onViewDetails, onCancel, onDismiss, onCompleted }) => {
  if (!ride) return null;

  console.log('🚗 ActiveRideOverlay rendered with ride:', {
    id: ride.id,
    status: ride.ride_status,
    timing: ride.ride_timing,
    pickup: ride.pickup_address,
    dropoff: ride.dropoff_address
  });

  const [localRide, setLocalRide] = useState(ride);
  const [passengerPhone, setPassengerPhone] = useState(null);
  const isScheduled = localRide?.ride_timing !== 'instant';
  const isInstant = localRide?.ride_timing === 'instant';

  // Determine ride status display
  const getStatusDisplay = () => {
    switch (localRide.ride_status) {
      case 'accepted':
        return {
          icon: '✅',
          text: isScheduled ? 'Scheduled Ride Accepted' : 'Ride Accepted',
          color: 'bg-green-50 border-green-200',
          textColor: 'text-green-900'
        };
      case 'driver_on_way':
        return {
          icon: '🚗',
          text: 'On the way to pickup',
          color: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-900'
        };
      case 'driver_arrived':
        return {
          icon: '📍',
          text: 'Arrived at pickup',
          color: 'bg-purple-50 border-purple-200',
          textColor: 'text-purple-900'
        };
      case 'trip_started':
        return {
          icon: '🎯',
          text: 'Trip in progress',
          color: 'bg-orange-50 border-orange-200',
          textColor: 'text-orange-900'
        };
      default:
        return {
          icon: '⏳',
          text: 'Active Ride',
          color: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-900'
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const isRideCompleted =
    localRide.ride_status === RIDE_STATUSES.TRIP_COMPLETED ||
    localRide.ride_status === RIDE_STATUSES.COMPLETED;

  // Check if ride needs to be started (scheduled rides only)
  const needsToBeStarted = isScheduled && localRide.ride_status === 'accepted';

  // Toast and auth
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const { completeRide, completing } = useRideCompletion();
  const [errandTasks, setErrandTasks] = useState(() => parseErrandTasks(ride?.errand_tasks || ride?.tasks));
  const [errandLoading, setErrandLoading] = useState(false);
  const [advancingErrandTask, setAdvancingErrandTask] = useState(false);
  const errandSummary = useMemo(() => summarizeErrandTasks(errandTasks), [errandTasks]);
  const activeErrandTask = errandSummary?.activeTask;
  const errandActionConfig = useMemo(() => {
    if (!activeErrandTask) return null;
    const def = ERRAND_TASK_ACTION_DEFS[activeErrandTask.state];
    if (!def) return null;
    const nextState = getNextTaskState(activeErrandTask.state);
    if (nextState === activeErrandTask.state) return null;
    return { ...def, nextState };
  }, [activeErrandTask]);

  const loadErrandTasks = async () => {
    if (!ride?.id) return;
    setErrandLoading(true);
    try {
      const result = await fetchErrandTasksForRide(ride.id);
      if (result.success) {
        setErrandTasks(result.tasks);
      }
    } catch (error) {
      console.error('Error loading errand tasks', error);
    } finally {
      setErrandLoading(false);
    }
  };

  const handleAdvanceErrandTask = async () => {
    if (!ride?.id || !activeErrandTask || !errandActionConfig || advancingErrandTask || isRideCompleted) return;
    if (activeErrandTask.state === ERRAND_TASK_STATES.COMPLETED) return;

    setAdvancingErrandTask(true);
    try {
      const result = await advanceErrandTask({
        rideId: ride.id,
        rawTasks: errandTasks,
        taskIndex: errandSummary?.activeTaskIndex ?? 0,
        driverId: user?.id
      });

      if (!result.success) {
        addToast({
          type: 'error',
          title: 'Failed to update task',
          message: result.error || 'Please try again'
        });
        setAdvancingErrandTask(false);
        return;
      }

      setErrandTasks(result.tasks);

      const notificationFactory = ERRAND_TASK_NOTIFICATIONS[errandActionConfig.nextState];
      if (notificationFactory && ride.user_id) {
        try {
          const payload = notificationFactory(activeErrandTask);
          await notifyStatusUpdateFromOverlay({
            userId: ride.user_id,
            rideId: ride.id,
            title: payload.title,
            message: payload.message
          });
        } catch (notificationError) {
          console.error('Error sending errand task notification', notificationError);
        }
      }

      addToast({ type: 'success', title: 'Task updated' });

      if (result.summary?.remaining === 0 && localRide.ride_status !== RIDE_STATUSES.TRIP_COMPLETED) {
        const completionResult = await completeRide({
          rideId: ride.id,
          passengerId: ride.user_id,
          notifyPassenger: true
        });

        if (!completionResult?.success) {
          addToast({
            type: 'error',
            title: 'Failed to close errand',
            message: completionResult?.error || 'Please retry completion from the ride'
          });
        } else {
          const completedRide = { ...localRide, ride_status: RIDE_STATUSES.TRIP_COMPLETED };
          setLocalRide(completedRide);
          try {
            if (typeof onCompleted === 'function') {
              onCompleted(completedRide);
            }
          } catch (callbackError) {
            console.error('Error in onCompleted callback after errand completion', callbackError);
          }
          if (onDismiss) {
            onDismiss();
          }
        }
      }
    } catch (error) {
      console.error('Error advancing errand task', error);
      addToast({
        type: 'error',
        title: 'Failed to update task',
        message: error.message || 'Please try again'
      });
    } finally {
      setAdvancingErrandTask(false);
    }
  };

  useEffect(() => {
    setLocalRide(ride);
  }, [ride?.id, ride?.ride_status]);

  useEffect(() => {
    setErrandTasks(parseErrandTasks(ride?.errand_tasks || ride?.tasks));
  }, [ride?.id, ride?.errand_tasks, ride?.tasks]);

  useEffect(() => {
    if (isErrandService(ride?.service_type)) {
      loadErrandTasks();
    } else {
      setErrandTasks([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.id, ride?.service_type]);

  // Fetch passenger phone number when ride is accepted/active
  useEffect(() => {
    const fetchPassengerPhone = async () => {
      if (!ride?.user_id) {
        setPassengerPhone(null);
        return;
      }

      // Only show contact info when ride is accepted or active
      const showContact = ['accepted', 'driver_on_way', 'driver_arrived', 'trip_started'].includes(ride.ride_status);
      if (!showContact) {
        setPassengerPhone(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', ride.user_id)
          .single();

        if (!error && data?.phone) {
          setPassengerPhone(data.phone);
        }
      } catch (error) {
        console.error('Error fetching passenger phone:', error);
      }
    };

    fetchPassengerPhone();
  }, [ride?.user_id, ride?.ride_status]);

  // Allowed transitions and next-action UI
  const getNextAction = () => {
    const actions = {
      [RIDE_STATUSES.ACCEPTED]: { label: isScheduled ? 'Begin Trip' : 'Start Driving to Pickup', status: RIDE_STATUSES.DRIVER_ON_WAY, variant: 'primary' },
      [RIDE_STATUSES.DRIVER_ON_WAY]: { label: 'Mark as Arrived', status: RIDE_STATUSES.DRIVER_ARRIVED, variant: 'primary' },
      [RIDE_STATUSES.DRIVER_ARRIVED]: { label: 'Start Trip', status: RIDE_STATUSES.TRIP_STARTED, variant: 'success' },
      [RIDE_STATUSES.TRIP_STARTED]: { label: 'Complete Trip', status: RIDE_STATUSES.TRIP_COMPLETED, variant: 'success' },
    };
    return actions[localRide.ride_status] || null;
  };

  const updateTripStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const { validateTransition, RIDE_STATUSES: STATUSES } = useRideStatus();

      const allowedFrom = {
        [STATUSES.DRIVER_ON_WAY]: STATUSES.ACCEPTED,
        [STATUSES.DRIVER_ARRIVED]: STATUSES.DRIVER_ON_WAY,
        [STATUSES.TRIP_STARTED]: STATUSES.DRIVER_ARRIVED,
        [STATUSES.TRIP_COMPLETED]: STATUSES.TRIP_STARTED,
      };
      const expectedCurrent = allowedFrom[newStatus];
      if (!expectedCurrent) throw new Error('Invalid status transition');

      const updateData = {
        ride_status: newStatus,
        status: newStatus,
        status_updated_at: new Date().toISOString(),
      };

      // Add status-specific fields
      if (newStatus === 'driver_arrived') {
        updateData.estimated_arrival_time = new Date().toISOString();
      } else if (newStatus === 'trip_started') {
        updateData.actual_pickup_time = new Date().toISOString();
      }

      // EXECUTE STATE TRANSITION VIA SERVICE (Single Source of Truth)
      let transitionResult;
      switch (newStatus) {
        case 'driver_on_way':
          transitionResult = await driverOnTheWay(ride.id, user?.id);
          break;
        case 'driver_arrived':
          transitionResult = await driverArrived(ride.id, user?.id);
          break;
        case 'trip_started':
          transitionResult = await startTrip(ride.id, user?.id);
          break;
        case 'trip_completed':
          // For trip_completed, we use useRideCompletion hook's completeRide logic
          // which is already handled in handleAdvanceErrandTask for errands
          // and should be handled here for regular rides
          transitionResult = await completeRide({
            rideId: ride.id,
            passengerId: ride.user_id,
            notifyPassenger: true
          });
          break;
        default:
          throw new Error('Unsupported status update');
      }

      if (transitionResult && !transitionResult.success) {
        throw new Error(transitionResult.error || 'Transition failed');
      }

      // Update additional metadata
      const { error: metadataError } = await supabase
        .from('rides')
        .update(updateData)
        .eq('id', ride.id);

      if (metadataError) {
        console.error('Database error updating ride metadata:', metadataError);
      }

      // Optimistically update local UI so the label/stepper change immediately
      const updatedRide = { ...localRide, ...updateData, ride_status: newStatus };
      setLocalRide(updatedRide);

      // Send notifications to passenger for all status changes except completion
      const notificationMessages = {
        driver_on_way: {
          title: '🚗 Driver En Route',
          message: 'Your driver is on the way to pick you up!'
        },
        driver_arrived: {
          title: '📍 Driver Arrived',
          message: 'Your driver has arrived at the pickup location.'
        },
        trip_started: {
          title: '🎯 Journey Started',
          message: 'Your trip has started. Have a safe journey!'
        }
      };

      const notification = notificationMessages[newStatus];
      if (notification && ride.user_id && newStatus !== 'trip_completed') {
        try {
          await notifyStatusUpdateFromOverlay({
            userId: ride.user_id,
            rideId: ride.id,
            title: notification.title,
            message: notification.message,
          });
        } catch (e) {
          console.error('Error sending notification:', e);
        }
      }

      addToast({ type: 'success', title: 'Trip status updated successfully' });

      // If trip is completed, trigger the completion callbacks to close the overlay
      if (newStatus === 'trip_completed') {
        if (typeof onCompleted === 'function') {
          onCompleted(updatedRide);
        }
        if (onDismiss) {
          onDismiss();
        }
      }
    } catch (e) {
      console.error('Error updating trip status:', e);
      addToast({
        type: 'error',
        title: 'Failed to update status',
        message: e.message || 'Please try again or contact support if the issue persists'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Format scheduled time
  const formatScheduledTime = (datetime) => {
    if (!datetime) return '';
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-center items-start p-2 sm:p-4 pointer-events-none overflow-y-auto pt-16">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 space-y-3 relative pointer-events-auto">
        <button
          aria-label="Minimize overlay"
          onClick={onDismiss}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 font-bold text-xl transition-colors"
          title="Minimize this overlay"
        >
          ✕
        </button>

        {/* Header */}
        <div className={`rounded-lg p-3 border-2 ${statusDisplay.color}`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{statusDisplay.icon}</span>
            <div className="flex-1">
              <h3 className={`text-base font-semibold ${statusDisplay.textColor}`}>
                {statusDisplay.text}
              </h3>
              {isScheduled && ride.scheduled_datetime && (
                <p className="text-xs text-gray-600 mt-0.5">
                  📅 Scheduled for {formatScheduledTime(ride.scheduled_datetime)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Ride Info - Compact */}
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">📍</span>
            <p className="text-gray-900 truncate flex-1">
              {ride.pickup_address || ride.pickup_location}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">🎯</span>
            <p className="text-gray-900 truncate flex-1">
              {ride.dropoff_address || ride.dropoff_location}
            </p>
          </div>
          {ride.passenger_name && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">👤</span>
              <p className="text-gray-900">{ride.passenger_name}</p>
            </div>
          )}
          {passengerPhone && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">📞</span>
              <a
                href={`tel:${passengerPhone}`}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {passengerPhone}
              </a>
            </div>
          )}
          {ride.estimated_cost && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">💰</span>
              <p className="text-green-700 font-medium">
                ${(parseFloat(ride.estimated_cost) || 0).toFixed(2)}
                {ride.number_of_trips && ride.number_of_trips > 1 && (
                  <span className="text-xs text-gray-500 ml-1">
                    (${((parseFloat(ride.estimated_cost) || 0) / (ride.number_of_trips || 1)).toFixed(2)} × {ride.number_of_trips})
                  </span>
                )}
                {isRoundTripRide(ride) && (
                  <span className="text-xs text-cyan-600 ml-1">🔄</span>
                )}
              </p>
            </div>
          )}
        </div>

      {isErrandService(ride.service_type) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-900">Errand Tasks</p>
              {errandSummary?.total ? (
                <p className="text-xs text-yellow-700">
                  Completed {errandSummary.completed}/{errandSummary.total} • {errandSummary.remaining} remaining
                </p>
              ) : (
                <p className="text-xs text-yellow-700">No tasks configured</p>
              )}
            </div>
            {activeErrandTask && (
              <span className="text-[11px] font-semibold text-yellow-700 uppercase">
                {describeTaskState(activeErrandTask.state)}
              </span>
            )}
          </div>

          {errandLoading && (
            <p className="text-xs text-yellow-700 mt-2">Loading tasks…</p>
          )}

          {!errandLoading && errandSummary?.allTasks?.length > 0 && (
            <div className="mt-2 space-y-2">
              {errandSummary.allTasks.map((task, index) => (
                <div
                  key={task.id || index}
                  className={`rounded-lg p-2 border text-sm ${
                    index === errandSummary.activeTaskIndex
                      ? 'border-yellow-400 bg-white shadow-sm'
                      : 'border-yellow-100 bg-yellow-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-yellow-900">{task.title}</p>
                    <span className="text-[11px] text-yellow-700">{describeTaskState(task.state)}</span>
                  </div>
                  <p className="text-xs text-yellow-800 mt-0.5">
                    {task.pickup || 'Pickup TBD'} → {task.dropoff || 'Drop-off TBD'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {errandActionConfig && !errandLoading && !isRideCompleted && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdvanceErrandTask}
              disabled={advancingErrandTask || completing}
              className="w-full mt-3 bg-yellow-500 hover:bg-yellow-600 border-yellow-500 text-yellow-900"
            >
              {advancingErrandTask ? 'Updating task…' : errandActionConfig.label}
            </Button>
          )}
          {errandActionConfig?.helper && !isRideCompleted && (
            <p className="text-[11px] text-yellow-700 mt-1 text-center">{errandActionConfig.helper}</p>
          )}
          {isRideCompleted && (
            <p className="text-[11px] text-yellow-700 mt-2 text-center">All errand tasks completed</p>
          )}
        </div>
      )}

        {/* Warning Message */}
        {isInstant && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ You cannot accept other rides while this instant ride is active
            </p>
          </div>
        )}

        {needsToBeStarted && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ℹ️ Click "Begin Trip" when you're ready to start this scheduled ride
            </p>
          </div>
        )}

        {/* View Details above stepper */}
        <Button
          variant="primary"
          size="md"
          onClick={onViewDetails}
          className="w-full"
        >
          📱 View Full Ride Details
        </Button>

        {/* Progress Stepper - Compact */}
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="flex items-center justify-between">
            {(() => {
              const steps = ['accepted','driver_on_way','driver_arrived','trip_started'];
              const currentIndex = Math.max(0, steps.indexOf(localRide.ride_status));
              return steps.map((s, idx) => {
                const completed = idx < currentIndex;
                const current = idx === currentIndex;
                const next = idx === currentIndex + 1;
                const clickable = next && !updatingStatus;
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border
                        ${completed ? 'bg-blue-600 text-white border-blue-600' : ''}
                        ${current ? 'bg-blue-600 text-white border-blue-600' : ''}
                        ${next ? 'bg-white text-blue-700 border-blue-400 cursor-pointer hover:bg-blue-50' : ''}
                        ${(!completed && !current && !next) ? 'bg-gray-200 text-gray-600 border-gray-300' : ''}
                      `}
                      onClick={() => { if (clickable) updateTripStatus(s); }}
                    >
                      {completed ? '✓' : idx+1}
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 ${idx < currentIndex ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>Accept</span><span>En route</span><span>Arrived</span><span>Started</span>
          </div>
          <p className="text-[10px] text-blue-600 mt-0.5 text-center font-medium">👆 Tap next step to advance</p>
        </div>

        {/* Action Buttons - Always Visible */}
        <div className="space-y-2 border-t-2 border-gray-200 pt-3">
          {/* Dynamic progress action */}
          {(() => {
            const action = getNextAction();
            console.log('🔍 Active Ride Overlay - Current Status:', localRide.ride_status, 'Next Action:', action);
            if (action) {
              return (
                <Button
                  variant={action.variant}
                  size="md"
                  onClick={() => updateTripStatus(action.status)}
                  disabled={updatingStatus || completing}
                  className="w-full font-semibold"
                >
                  {updatingStatus || completing ? '⏳ Updating...' : `▶️ ${action.label}`}
                </Button>
              );
            }
            // If no action available, show current status
            return (
              <div className="bg-gray-100 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-600">Current Status: {localRide.ride_status}</p>
                <p className="text-xs text-gray-500 mt-1">Use the stepper above to advance</p>
              </div>
            );
          })()}

          {/* Navigate menu - ALWAYS show for active rides */}
          <div className="relative">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setNavOpen(v => !v)}
              className="w-full"
            >
              🗺️ Navigate
            </Button>
            {navOpen && (
              <div className="absolute left-0 right-0 bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
                {(() => {
                  const pickupUrl = getNavigationUrlTo(localRide, 'pickup');
                  const dropoffUrl = getNavigationUrlTo(localRide, 'dropoff');
                  return (
                    <div className="space-y-1">
                      <button
                        className={`w-full text-left px-3 py-2 rounded-md text-sm ${pickupUrl ? 'hover:bg-gray-50 text-gray-800' : 'text-gray-400 cursor-not-allowed'}`}
                        onClick={() => { if (pickupUrl) { window.open(pickupUrl, '_blank', 'noopener,noreferrer'); setNavOpen(false); } else { addToast({ type:'warn', title:'Navigation unavailable', message:'Pickup location missing or invalid.' }); } }}
                        disabled={!pickupUrl}
                      >
                        🚩 Navigate to Pickup
                      </button>
                      <button
                        className={`w-full text-left px-3 py-2 rounded-md text-sm ${dropoffUrl ? 'hover:bg-gray-50 text-gray-800' : 'text-gray-400 cursor-not-allowed'}`}
                        onClick={() => { if (dropoffUrl) { window.open(dropoffUrl, '_blank', 'noopener,noreferrer'); setNavOpen(false); } else { addToast({ type:'warn', title:'Navigation unavailable', message:'Drop-off location missing or invalid.' }); } }}
                        disabled={!dropoffUrl}
                      >
                        🎯 Navigate to Drop-off
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={onCancel}
            className="w-full"
          >
            ❌ Cancel Ride
          </Button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-center text-gray-500">
          Click the ✕ button to minimize this overlay. It will reappear when you navigate to a different page.
        </p>
      </div>
    </div>
  );
};

export default ActiveRideOverlay;

