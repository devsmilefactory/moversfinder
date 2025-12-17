/**
 * useErrandTasks Hook
 * 
 * Manages errand task fetching, sorting, and state for detail screens.
 * Errand parent rides appear in feeds; tasks are fetched separately for detail views.
 * 
 * @see Design Doc: Errand Handling section
 * @see Requirements: 13.1-13.5, 14.1-14.5
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchErrandTasks, fetchActiveErrandTask, fetchErrandProgress } from '../services/errandApi';

/**
 * Hook for managing errand tasks
 * 
 * @param {string} errandId - UUID of the errand ride
 * @param {boolean} autoFetch - Whether to automatically fetch tasks on mount (default: true)
 * @returns {Object} Tasks state and actions
 * 
 * @example
 * const {
 *   tasks,
 *   activeTask,
 *   progress,
 *   isLoading,
 *   error,
 *   refreshTasks
 * } = useErrandTasks(errandId);
 */
export function useErrandTasks(errandId, autoFetch = true) {
  // Data state
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    cancelled: 0,
    active: 0,
    notStarted: 0,
    remaining: 0
  });
  
  // Loading and error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all tasks for the errand
   */
  const fetchTasks = useCallback(async () => {
    if (!errandId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchErrandTasks(errandId);

      if (result.error) {
        throw result.error;
      }

      setTasks(result.data || []);
    } catch (err) {
      console.error('[Errand Tasks Hook] Error fetching tasks:', err);
      setError(err);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [errandId]);

  /**
   * Fetch the current active task
   */
  const fetchActive = useCallback(async () => {
    if (!errandId) return;

    try {
      const result = await fetchActiveErrandTask(errandId);

      if (result.error) {
        console.error('[Errand Tasks Hook] Error fetching active task:', result.error);
        return;
      }

      setActiveTask(result.data);
    } catch (err) {
      console.error('[Errand Tasks Hook] Error fetching active task:', err);
    }
  }, [errandId]);

  /**
   * Fetch progress summary
   */
  const fetchProgressSummary = useCallback(async () => {
    if (!errandId) return;

    try {
      const result = await fetchErrandProgress(errandId);

      if (result.error) {
        console.error('[Errand Tasks Hook] Error fetching progress:', result.error);
        return;
      }

      setProgress(result.data || {
        total: 0,
        completed: 0,
        cancelled: 0,
        active: 0,
        notStarted: 0,
        remaining: 0
      });
    } catch (err) {
      console.error('[Errand Tasks Hook] Error fetching progress:', err);
    }
  }, [errandId]);

  /**
   * Refresh all task data
   */
  const refreshTasks = useCallback(async () => {
    await Promise.all([
      fetchTasks(),
      fetchActive(),
      fetchProgressSummary()
    ]);
  }, [fetchTasks, fetchActive, fetchProgressSummary]);

  /**
   * Auto-fetch tasks on mount if enabled
   */
  useEffect(() => {
    if (autoFetch && errandId) {
      refreshTasks();
    }
  }, [autoFetch, errandId, refreshTasks]);

  /**
   * Optimistically update a task in the list
   * 
   * @param {string} taskId - UUID of the task to update
   * @param {Object} updates - Partial task object with updates
   */
  const updateTaskInList = useCallback((taskId, updates) => {
    if (!taskId || !updates) return;
    
    setTasks((prevTasks) => {
      return prevTasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      );
    });

    // Update active task if it's the one being updated
    setActiveTask((prevActive) => {
      if (prevActive && prevActive.id === taskId) {
        return { ...prevActive, ...updates };
      }
      return prevActive;
    });
  }, []);

  /**
   * Mark a task as completed
   * 
   * @param {string} taskId - UUID of the task
   */
  const markTaskCompleted = useCallback((taskId) => {
    updateTaskInList(taskId, { task_status: 'TASK_COMPLETED' });
    
    // Update progress
    setProgress((prev) => ({
      ...prev,
      completed: prev.completed + 1,
      active: Math.max(0, prev.active - 1),
      remaining: Math.max(0, prev.remaining - 1)
    }));
  }, [updateTaskInList]);

  /**
   * Mark a task as started
   * 
   * @param {string} taskId - UUID of the task
   */
  const markTaskStarted = useCallback((taskId) => {
    updateTaskInList(taskId, { task_status: 'TASK_STARTED' });
    
    // Update progress
    setProgress((prev) => ({
      ...prev,
      active: prev.active + 1,
      notStarted: Math.max(0, prev.notStarted - 1)
    }));
  }, [updateTaskInList]);

  /**
   * Get task by ID
   * 
   * @param {string} taskId - UUID of the task
   * @returns {Object|null} Task object or null
   */
  const getTaskById = useCallback((taskId) => {
    return tasks.find((task) => task.id === taskId) || null;
  }, [tasks]);

  /**
   * Get tasks by status
   * 
   * @param {string} status - Task status to filter by
   * @returns {Array} Filtered tasks
   */
  const getTasksByStatus = useCallback((status) => {
    return tasks.filter((task) => task.task_status === status);
  }, [tasks]);

  /**
   * Check if all tasks are completed
   * 
   * @returns {boolean}
   */
  const areAllTasksCompleted = useCallback(() => {
    return progress.total > 0 && progress.completed === progress.total;
  }, [progress]);

  /**
   * Get completion percentage
   * 
   * @returns {number} Percentage (0-100)
   */
  const getCompletionPercentage = useCallback(() => {
    if (progress.total === 0) return 0;
    return Math.round((progress.completed / progress.total) * 100);
  }, [progress]);

  return {
    // State
    tasks,
    activeTask,
    progress,
    isLoading,
    error,
    
    // Computed
    completionPercentage: getCompletionPercentage(),
    allTasksCompleted: areAllTasksCompleted(),
    
    // Actions
    refreshTasks,
    updateTaskInList,
    markTaskCompleted,
    markTaskStarted,
    getTaskById,
    getTasksByStatus
  };
}
