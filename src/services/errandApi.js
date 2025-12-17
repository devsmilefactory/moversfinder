/**
 * Errand API Service
 * 
 * Service for fetching and managing errand tasks.
 * Errand parent rides appear in normal feeds, tasks are fetched separately for detail screens.
 */

import { supabase } from '../lib/supabase';
import { sortErrandTasks } from './feedHelpers';

/**
 * Fetch errand tasks for a specific errand ride
 * 
 * @param {string} errandId - UUID of the errand ride
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function fetchErrandTasks(errandId) {
  const startTime = performance.now();
  
  try {
    console.log('[Errand Tasks] Calling get_errand_tasks:', {
      p_errand_id: errandId
    });

    const { data, error } = await supabase.rpc('get_errand_tasks', {
      p_errand_id: errandId
    });

    const duration = performance.now() - startTime;

    if (error) {
      console.error('[Errand Tasks] Error fetching errand tasks:', {
        error,
        context: { errandId },
        duration: `${duration.toFixed(2)}ms`
      });
      return { data: null, error };
    }

    // Log performance warning if slow
    if (duration > 500) {
      console.warn('[Errand Tasks] Slow query detected:', {
        errandId,
        duration: `${duration.toFixed(2)}ms`,
        taskCount: data?.length || 0
      });
    }

    console.log('[Errand Tasks] Success:', {
      errandId,
      taskCount: data?.length || 0,
      duration: `${duration.toFixed(2)}ms`
    });

    // Tasks are already sorted by the RPC function
    // (state priority first, then task_index)
    return { data: data || [], error: null };
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error('[Errand Tasks] Exception in fetchErrandTasks:', {
      error: error.message,
      stack: error.stack,
      context: { errandId },
      duration: `${duration.toFixed(2)}ms`
    });
    return { data: null, error };
  }
}

/**
 * Get the current active task for an errand
 * 
 * @param {string} errandId - UUID of the errand ride
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function fetchActiveErrandTask(errandId) {
  try {
    const { data: tasks, error } = await fetchErrandTasks(errandId);
    
    if (error) {
      return { data: null, error };
    }
    
    // Find first task with active state
    const activeTask = tasks?.find(task => 
      ['ACTIVATE_TASK', 'DRIVER_ON_THE_WAY', 'DRIVER_ARRIVED', 'TASK_STARTED'].includes(task.task_status)
    );
    
    return { data: activeTask || null, error: null };
  } catch (error) {
    console.error('Exception in fetchActiveErrandTask:', error);
    return { data: null, error };
  }
}

/**
 * Get errand progress summary
 * 
 * @param {string} errandId - UUID of the errand ride
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function fetchErrandProgress(errandId) {
  try {
    const { data: tasks, error } = await fetchErrandTasks(errandId);
    
    if (error) {
      return { data: null, error };
    }
    
    const total = tasks?.length || 0;
    const completed = tasks?.filter(t => t.task_status === 'TASK_COMPLETED').length || 0;
    const cancelled = tasks?.filter(t => t.task_status === 'TASK_CANCELLED').length || 0;
    const active = tasks?.filter(t => 
      ['ACTIVATE_TASK', 'DRIVER_ON_THE_WAY', 'DRIVER_ARRIVED', 'TASK_STARTED'].includes(t.task_status)
    ).length || 0;
    const notStarted = tasks?.filter(t => t.task_status === 'NOT_STARTED').length || 0;
    
    return {
      data: {
        total,
        completed,
        cancelled,
        active,
        notStarted,
        remaining: total - completed - cancelled
      },
      error: null
    };
  } catch (error) {
    console.error('Exception in fetchErrandProgress:', error);
    return { data: null, error };
  }
}
