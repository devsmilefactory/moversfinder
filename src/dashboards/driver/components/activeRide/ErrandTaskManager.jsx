import React, { useState, useEffect, useMemo } from 'react';
import Button from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/ToastProvider';
import useAuthStore from '../../../../stores/authStore';
import { useRideCompletion } from '../../../../hooks/useRideCompletion';
import { RIDE_STATUSES } from '../../../../hooks/useRideStatus';
import ErrandTaskList from '../../../../components/cards/ErrandTaskList';
import {
  summarizeErrandTasks,
  parseErrandTasks,
  getNextTaskState,
  ERRAND_TASK_STATES
} from '../../../../utils/errandTasks';
import { fetchErrandTasksForRide, advanceErrandTask } from '../../../../services/errandTaskService';
import { notifyStatusUpdateFromOverlay } from '../../../../services/notificationService';

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
 * ErrandTaskManager Component
 * 
 * Manages errand tasks for active rides.
 * Extracted from ActiveRideOverlay for better organization.
 * 
 * @param {object} props
 * @param {object} props.ride - The ride object
 * @param {array} props.errandTasks - Current errand tasks array
 * @param {function} props.onErrandTasksChange - Callback when tasks are updated
 * @param {boolean} props.isRideCompleted - Whether the ride is completed
 * @param {function} props.onRideCompleted - Callback when ride is completed via task completion
 * @param {function} props.onDismiss - Optional callback to dismiss overlay
 */
const ErrandTaskManager = ({
  ride,
  errandTasks: initialErrandTasks,
  onErrandTasksChange,
  isRideCompleted,
  onRideCompleted,
  onDismiss
}) => {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const { completeRide, completing } = useRideCompletion();
  const [errandTasks, setErrandTasks] = useState(() => parseErrandTasks(initialErrandTasks || ride?.errand_tasks || ride?.tasks));
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
        if (onErrandTasksChange) {
          onErrandTasksChange(result.tasks);
        }
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
      if (onErrandTasksChange) {
        onErrandTasksChange(result.tasks);
      }

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

      if (result.summary?.remaining === 0 && ride.ride_status !== RIDE_STATUSES.TRIP_COMPLETED) {
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
          if (onRideCompleted) {
            onRideCompleted({ ...ride, ride_status: RIDE_STATUSES.TRIP_COMPLETED });
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
    setErrandTasks(parseErrandTasks(ride?.errand_tasks || ride?.tasks));
  }, [ride?.id, ride?.errand_tasks, ride?.tasks]);

  useEffect(() => {
    if (ride?.id) {
      loadErrandTasks();
    } else {
      setErrandTasks([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.id, ride?.service_type]);

  if (!ride || !errandTasks || errandTasks.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Use ErrandTaskList component for structured display */}
      <ErrandTaskList
        tasks={errandTasks}
        compact={false}
        showStatus={true}
        showCosts={true}
      />

      {/* Task Action Button */}
      {errandActionConfig && !errandLoading && !isRideCompleted && (
        <Button
          variant="primary"
          size="sm"
          onClick={handleAdvanceErrandTask}
          disabled={advancingErrandTask || completing}
          className="w-full bg-yellow-500 hover:bg-yellow-600 border-yellow-500 text-yellow-900"
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
      {errandLoading && (
        <p className="text-xs text-yellow-700 text-center">Loading tasks…</p>
      )}
    </div>
  );
};

export default ErrandTaskManager;
