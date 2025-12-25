/**
 * ErrandTaskList Component
 * 
 * Displays errand tasks instead of route information.
 * Used exclusively for errand service type rides.
 */

import React from 'react';
import { CheckCircle, Circle, Clock, DollarSign, MapPin } from 'lucide-react';
import { summarizeErrandTasks, describeTaskState, ERRAND_TASK_STATES } from '../../utils/errandTasks';
import { calculateErrandTotalCost, calculateErrandTotalDistance, calculateErrandAverageDistance } from '../../utils/errandCostHelpers';
import { formatDistance, formatPrice } from '../../utils/formatters';

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
  const parsedTasks = summary.allTasks || [];
  
  // Calculate total cost from tasks
  const totalCost = showCosts ? calculateErrandTotalCost(parsedTasks) : null;
  const hasCosts = parsedTasks.some(task => task.cost && task.cost > 0);
  
  // Calculate total and average distance
  const totalDistance = calculateErrandTotalDistance(parsedTasks);
  const averageDistance = summary.total > 0 ? calculateErrandAverageDistance(parsedTasks) : 0;
  const hasDistances = totalDistance > 0;
  
  // Calculate total duration from tasks
  const totalDuration = parsedTasks.reduce((sum, task) => {
    const duration = parseInt(task.durationMinutes || task.duration || 0);
    return sum + (isNaN(duration) ? 0 : duration);
  }, 0);
  const hasDuration = totalDuration > 0;

  if (!summary || summary.total === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-sm text-gray-500 text-center">No tasks specified</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Task Summary - Matching booking confirmation format */}
      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-800">
              {summary.total} Task{summary.total === 1 ? '' : 's'}
            </p>
            {/* Summary line matching booking confirmation: "X tasks • Y km combined • Z min estimated" */}
            <p className="text-xs text-emerald-700">
              {summary.total} task{summary.total === 1 ? '' : 's'}
              {hasDistances && (
                <> • {Number(totalDistance).toFixed(1)} km combined</>
              )}
              {hasDuration && (
                <> • {totalDuration} min estimated</>
              )}
              {!hasDistances && !hasDuration && summary.total > 0 && (
                <> • {summary.completed} completed • {summary.remaining} remaining</>
              )}
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
            {hasDistances && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-600">
                  {formatDistance(averageDistance)} avg
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

      {/* Task List (if not compact) - Matching booking confirmation format */}
      {!compact && summary.allTasks && summary.allTasks.length > 0 && (
        <div className="space-y-2 mt-3">
          {summary.allTasks.map((task, index) => {
            const TaskIcon = getTaskIcon(task.state);
            const taskColor = getTaskColor(task.state);
            const isActive = index === summary.activeTaskIndex;
            const taskCost = task.cost && task.cost > 0 ? task.cost : null;
            const taskDistance = parseFloat(task.distanceKm || task.distance || 0);
            const taskDuration = parseInt(task.durationMinutes || task.duration || 0);
            const pickup = task.pickup || task.pickup_location || 'Not specified';
            const dropoff = task.dropoff || task.dropoff_location || 'Not specified';

            return (
              <div
                key={task.id || index}
                className={`text-sm text-slate-700 pl-4 border-l-2 ${
                  isActive
                    ? 'border-emerald-400 bg-emerald-50 rounded-r-lg p-3'
                    : 'border-purple-200 bg-white rounded-r-lg p-3'
                }`}
              >
                {/* Task number and name - matching booking confirmation format */}
                <p className="font-medium mb-1">
                  {index + 1}. {task.title}
                </p>
                
                {/* Pickup address */}
                <p className="text-xs text-slate-500 mt-0.5">
                  Pickup: {pickup}
                </p>
                
                {/* Drop-off address */}
                <p className="text-xs text-slate-500">
                  Drop-off: {dropoff}
                </p>
                
                {/* Distance, time, and cost - matching booking confirmation format */}
                {(taskDistance > 0 || taskDuration > 0 || taskCost) && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {taskDistance > 0 && `≈ ${Number(taskDistance).toFixed(1)} km`}
                    {taskDistance > 0 && taskDuration > 0 && ' • '}
                    {taskDuration > 0 && `${taskDuration} min`}
                    {taskCost && (taskDistance > 0 || taskDuration > 0) && ' • '}
                    {taskCost && formatPrice(taskCost)}
                  </p>
                )}
                
                {/* Status indicator */}
                {showStatus && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <TaskIcon className={`w-3 h-3 ${taskColor}`} />
                    <p className="text-[11px] text-gray-600">
                      {describeTaskState(task.state)}
                    </p>
                  </div>
                )}
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

      {/* Distance Breakdown Section */}
      {hasDistances && !compact && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-blue-800 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Distance Breakdown
              </p>
              <p className="text-xs text-blue-700">
                {summary.total} task{summary.total === 1 ? '' : 's'} • {formatDistance(averageDistance)} avg per task
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-600">
                {formatDistance(totalDistance)}
              </p>
              <p className="text-xs text-blue-600">Total Distance</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrandTaskList;
