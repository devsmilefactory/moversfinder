import React, { useState, useEffect, useMemo } from 'react';
import Button from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/ToastProvider';
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
    message: `Your driver queued \"${task?.title || 'a task'}\".`
  }),
  [ERRAND_TASK_STATES.DRIVER_ON_WAY]: (task) => ({
    title: '🚗 Driver Heading Over',
    message: `Driver is en route to \"${task?.title || 'your task'}\".`
  }),
  [ERRAND_TASK_STATES.DRIVER_ARRIVED]: (task) => ({
    title: '📍 Driver Arrived',
    message: `Driver reached the location for \"${task?.title || 'your task'}\".`
  }),
  [ERRAND_TASK_STATES.STARTED]: (task) => ({
    title: '🧾 Task Started',
    message: `\"${task?.title || 'Your task'}\" is now in progress.`
  }),
  [ERRAND_TASK_STATES.COMPLETED]: (task) => ({
    title: '✅ Task Completed',
    message: `\"${task?.title || 'Your task'}\" is complete.`
  })
};

/**
 * ErrandTaskManager Component
 * 
 * Manages errand tasks for active rides
 */
const ErrandTaskManager = ({ ride, user, isRideCompleted }) => {
  const { addToast } = useToast();
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
        return;
      }

      // Update local state
      setErrandTasks(result.updatedTasks);

      // Send notification
      const notificationDef = ERRAND_TASK_NOTIFICATIONS[errandActionConfig.notificationKey];
      if (notificationDef) {
        const notification = notificationDef(activeErrandTask);
        await notifyStatusUpdateFromOverlay({
          rideId: ride.id,
          passengerId: ride.user_id,
          title: notification.title,
          message: notification.message
        });
      }

      addToast({
        type: 'success',
        title: 'Task Updated',
        message: `Task "${activeErrandTask.title}" updated successfully`
      });

    } catch (error) {
      console.error('Error advancing errand task:', error);
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update task. Please try again.'
      });
    } finally {
      setAdvancingErrandTask(false);
    }
  };

  useEffect(() => {
    loadErrandTasks();
  }, [ride?.id]);

  if (!errandTasks?.length) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🛍️</span>
        <h4 className="font-semibold text-yellow-900">Errand Tasks</h4>
      </div>

      {/* Task Summary */}
      <div className="mb-4">
        <p className="text-sm text-yellow-800">
          {errandSummary?.completedCount || 0} of {errandTasks.length} tasks completed
        </p>
        <div className="w-full bg-yellow-200 rounded-full h-2 mt-2">
          <div
            className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((errandSummary?.completedCount || 0) / errandTasks.length) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Active Task */}
      {activeErrandTask && (
        <div className="bg-white border border-yellow-300 rounded-lg p-3 mb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h5 className="font-medium text-gray-900 mb-1">
                Current Task: {activeErrandTask.title}
              </h5>
              <p className="text-sm text-gray-600 mb-2">
                {activeErrandTask.description}
              </p>
              <p className="text-xs text-yellow-700">
                Status: {activeErrandTask.state.replace(/_/g, ' ').toUpperCase()}
              </p>
            </div>
          </div>

          {/* Task Action Button */}
          {errandActionConfig && !isRideCompleted && (
            <div className="mt-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAdvanceErrandTask}
                disabled={advancingErrandTask}
                className="w-full"
              >
                {advancingErrandTask ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : (
                  errandActionConfig.label
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-1 text-center">
                {errandActionConfig.helper}
              </p>
            </div>
          )}
        </div>
      )}

      {/* All Tasks List */}
      <div className="space-y-2">
        {errandTasks.map((task, index) => (
          <div
            key={index}
            className={`text-sm p-2 rounded border ${
              task.state === ERRAND_TASK_STATES.COMPLETED
                ? 'bg-green-50 border-green-200 text-green-800'
                : task === activeErrandTask
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>
                {task.state === ERRAND_TASK_STATES.COMPLETED ? '✅' : 
                 task === activeErrandTask ? '🔄' : '⏳'}
              </span>
              <span className="font-medium">{task.title}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="mt-3 text-center">
        <button
          onClick={loadErrandTasks}
          disabled={errandLoading}
          className="text-yellow-700 hover:text-yellow-800 text-sm font-medium"
        >
          {errandLoading ? 'Loading...' : '🔄 Refresh Tasks'}
        </button>
      </div>
    </div>
  );
};

export default ErrandTaskManager;