import { supabase } from '../lib/supabase';
import {
  parseErrandTasks,
  advanceTaskState,
  getNextTaskState,
  buildTaskHistoryEntry,
  summarizeErrandTasks
} from '../utils/errandTasks';

const serializeTasks = (tasks = []) => JSON.stringify(tasks);

export const fetchErrandTasksForRide = async (rideId) => {
  if (!rideId) {
    return { success: false, error: 'Missing rideId' };
  }

  const { data, error } = await supabase
    .from('rides')
    .select('errand_tasks, completed_tasks_count, remaining_tasks_count, active_errand_task_index, number_of_tasks')
    .eq('id', rideId)
    .single();

  if (error) {
    console.error('errandTaskService.fetchErrandTasksForRide', error);
    return { success: false, error: error.message };
  }

  const tasks = parseErrandTasks(data?.errand_tasks);
  const summary = summarizeErrandTasks(tasks);

  return {
    success: true,
    tasks: summary.allTasks,
    summary: {
      completed: summary.completed,
      remaining: summary.remaining,
      total: summary.total,
      activeTaskIndex: summary.activeTaskIndex
    }
  };
};

const updateErrandTasksRow = async (rideId, tasks, summary) => {
  const { error, data } = await supabase
    .from('rides')
    .update({
      errand_tasks: serializeTasks(tasks),
      completed_tasks_count: summary.completed,
      remaining_tasks_count: summary.remaining,
      active_errand_task_index: summary.activeTaskIndex ?? (tasks.length > 0 ? tasks.length - 1 : 0)
    })
    .eq('id', rideId)
    .select('errand_tasks, completed_tasks_count, remaining_tasks_count, active_errand_task_index')
    .single();

  if (error) throw error;

  return {
    row: data,
    parsedTasks: parseErrandTasks(data?.errand_tasks)
  };
};

export const advanceErrandTask = async ({
  rideId,
  rawTasks,
  taskIndex,
  driverId,
  action = 'advance'
}) => {
  if (!rideId) {
    return { success: false, error: 'Missing rideId' };
  }

  const tasks = parseErrandTasks(rawTasks);
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { success: false, error: 'No tasks configured for this errand' };
  }

  if (taskIndex < 0 || taskIndex >= tasks.length) {
    return { success: false, error: 'Invalid task index' };
  }

  const currentTask = tasks[taskIndex];
  const nextState = getNextTaskState(currentTask.state);

  // Do not advance if already completed
  if (currentTask.state === nextState) {
    return { success: true, tasks, summary: summarizeErrandTasks(tasks) };
  }

  const historyEntry = buildTaskHistoryEntry({
    action: action || nextState,
    actorId: driverId,
    actorType: 'driver'
  });

  const updatedTasks = advanceTaskState(tasks, taskIndex, nextState, historyEntry);
  const summary = summarizeErrandTasks(updatedTasks);

  try {
    const { parsedTasks } = await updateErrandTasksRow(rideId, updatedTasks, summary);
    return {
      success: true,
      tasks: parsedTasks,
      summary
    };
  } catch (error) {
    console.error('errandTaskService.advanceErrandTask', error);
    return { success: false, error: error.message };
  }
};














