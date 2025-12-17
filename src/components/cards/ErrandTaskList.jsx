/**
 * ErrandTaskList Component
 * 
 * Displays errand tasks instead of route information.
 * Used exclusively for errand service type rides.
 */

import React from 'react';
import { CheckCircle, Circle, Clock, DollarSign } from 'lucide-react';
import { summarizeErrandTasks, describeTaskState, ERRAND_TASK_STATES } from '../../utils/errandTasks';
import { calculateErrandTotalCost } from '../../utils/errandCostHelpers';

/**
 * Get task status icon
 * @param {string} state - Task state
 * @returns {Component} Icon component
 */
const getTaskIcon = (state) => {
  if (state === ERRAND_TASK_STATES.COMPLETED) {
    return CheckCircle;
  }
  if (state === ERRAND_TASK_STATES.STARTED || 
      state === ERRAND_TASK_STATES.DRIVER_ON_WAY || 
      state === ERRAND_TASK_STATES.DRIVER_ARRIVED) {
    return Clock;
  }
  return Circle;
};

/**
 * Get task status color
 * @param {string} state - Task state
 * @returns {string} Tailwind color classes
 */
const getTaskColor = (state) => {
  if (state === ERRAND_TASK_STATES.COMPLETED) {
    return 'text-green-600';
  }
  if (state === ERRAND_TASK_STATES.STARTED || 
      state === ERRAND_TASK_STATES.DRIVER_ON_WAY || 
      state === ERRAND_TASK_STATES.DRIVER_ARRIVED) {
    return 'text-blue-600';
  }
  return 'text-gray-400';
};

/**
 * ErrandTaskList - Shows errand tasks with status indicators
 * @param {Object} props
 * @param {Array} props.tasks - Array of errand tasks
 * @param {boolean} props.compact - Use compact layout
 * @param {boolean} props.showStatus - Show status indicators
 * @param {boolean} props.showCosts - Show task costs (default: true)
 */
const ErrandTaskList = ({
  tasks,
  compact = false,
  showStatus = true,
  showCosts = true
}) => {
  const summary = summarizeErrandTasks(tasks);
  
  // Calculate total cost from tasks
  const totalCost = showCosts ? calculateErrandTotalCost(tasks) : null;
  const hasCosts = tasks && tasks.some(task => task.cost && task.cost > 0);

  if (!summary || summary.total === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-sm text-gray-500 text-center">No tasks specified</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Task Summary */}
      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-800">
              {summary.total} Task{summary.total === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-emerald-700">
              {summary.completed} completed • {summary.remaining} remaining
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {summary.activeTask && showStatus && (
              <span className="text-[11px] font-semibold text-emerald-600 uppercase">
                {describeTaskState(summary.activeTask.state)}
              </span>
            )}
            {showCosts && hasCosts && totalCost > 0 && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-green-600" />
                <span className="text-sm font-bold text-green-600">
                  ${totalCost.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Active Task Preview */}
        {summary.activeTask && !compact && (
          <div className="mt-2 pt-2 border-t border-emerald-200">
            <p className="text-xs font-semibold text-emerald-800">
              Next: {summary.activeTask.title}
            </p>
            {summary.activeTask.description && (
              <p className="text-xs text-emerald-700 mt-0.5">
                {summary.activeTask.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Task List (if not compact) */}
      {!compact && summary.allTasks && summary.allTasks.length > 0 && (
        <div className="space-y-1.5">
          {summary.allTasks.map((task, index) => {
            const TaskIcon = getTaskIcon(task.state);
            const taskColor = getTaskColor(task.state);
            const isActive = index === summary.activeTaskIndex;
            const taskCost = task.cost && task.cost > 0 ? task.cost : null;

            return (
              <div
                key={task.id || index}
                className={`flex items-start gap-2 p-2 rounded-lg border ${
                  isActive
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-100 bg-gray-50'
                }`}
              >
                <TaskIcon className={`w-4 h-4 ${taskColor} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isActive ? 'text-emerald-900' : 'text-gray-800'}`}>
                        {task.title}
                      </p>
                      {showStatus && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {describeTaskState(task.state)}
                        </p>
                      )}
                    </div>
                    {showCosts && taskCost && (
                      <div className="flex items-center gap-1 ml-2">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <span className="text-sm font-semibold text-green-600">
                          ${taskCost.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cost Breakdown Section */}
      {showCosts && hasCosts && !compact && (
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-green-800">Cost Breakdown</p>
              <p className="text-xs text-green-700">
                {summary.total} task{summary.total === 1 ? '' : 's'} • ${(totalCost / summary.total).toFixed(2)} avg per task
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">
                ${totalCost.toFixed(2)}
              </p>
              <p className="text-xs text-green-600">Total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrandTaskList;
