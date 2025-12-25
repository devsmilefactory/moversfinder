import { getRouteDistanceAndDuration } from './locationServices';
import { calculateDistance } from './locationServices';
import { calculateEstimatedFareV2 } from './pricingCalculator';

const toPositiveInt = (value, fallback = null) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const rounded = Math.floor(num);
  return rounded >= 0 ? rounded : fallback;
};

const coerceJSONString = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    if (Array.isArray(value.tasks)) return value.tasks;
    return Array.isArray(value) ? value : Object.values(value);
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.tasks)) return parsed.tasks;
    return [];
  } catch (error) {
    console.warn('errandTasks: unable to parse tasks JSON', error);
    return [];
  }
};

export const ERRAND_TASK_STATES = {
  PENDING: 'pending',
  ACTIVATED: 'activated',
  DRIVER_ON_WAY: 'driver_on_way',
  DRIVER_ARRIVED: 'driver_arrived',
  STARTED: 'started',
  COMPLETED: 'completed'
};

export const ERRAND_TASK_STATE_SEQUENCE = [
  ERRAND_TASK_STATES.PENDING,
  ERRAND_TASK_STATES.ACTIVATED,
  ERRAND_TASK_STATES.DRIVER_ON_WAY,
  ERRAND_TASK_STATES.DRIVER_ARRIVED,
  ERRAND_TASK_STATES.STARTED,
  ERRAND_TASK_STATES.COMPLETED
];

const normalizeTaskState = (state) => {
  if (!state) return ERRAND_TASK_STATES.PENDING;
  const normalized = String(state).toLowerCase();
  if (ERRAND_TASK_STATE_SEQUENCE.includes(normalized)) return normalized;
  if (normalized === 'complete_task' || normalized === 'completed_task') {
    return ERRAND_TASK_STATES.COMPLETED;
  }
  if (normalized === 'in_progress' || normalized === 'task_started') {
    return ERRAND_TASK_STATES.STARTED;
  }
  if (normalized === 'task_activated') return ERRAND_TASK_STATES.ACTIVATED;
  if (normalized === 'driver_en_route') return ERRAND_TASK_STATES.DRIVER_ON_WAY;
  return ERRAND_TASK_STATES.PENDING;
};

const defaultTaskTitle = (task, index) =>
  task?.title ||
  task?.label ||
  task?.description ||
  task?.name ||
  `Task ${index + 1}`;

const normalizeLocation = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value?.address) return value.address;
  if (value?.data?.address) return value.data.address;
  if (value?.pickup_address) return value.pickup_address;
  if (value?.dropoff_address) return value.dropoff_address;
  return '';
};

const normalizeCoordinates = (value) => {
  if (!value) return null;
  if (value?.type === 'Point' && Array.isArray(value?.coordinates)) {
    return value;
  }
  if (value?.data?.type === 'Point') {
    return value.data;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed?.type === 'Point') return parsed;
    } catch (e) {
      return null;
    }
  }
  if (typeof value === 'object' && Number.isFinite(value?.lat) && Number.isFinite(value?.lng)) {
    return {
      type: 'Point',
      coordinates: [value.lng, value.lat]
    };
  }
  return null;
};

const normalizeTask = (task, index) => {
  const duration =
    toPositiveInt(task?.estimatedDuration) ??
    toPositiveInt(task?.estimated_duration) ??
    toPositiveInt(task?.durationMinutes);

  const pickupLocation = normalizeLocation(task?.pickup || task?.pickup_location || task?.startPoint);
  const dropoffLocation = normalizeLocation(task?.dropoff || task?.dropoff_location || task?.destinationPoint);

  return {
    id: task?.id ?? `${index + 1}`,
    order: toPositiveInt(task?.order, index),
    title: defaultTaskTitle(task, index),
    pickup: pickupLocation,
    dropoff: dropoffLocation,
    pickup_location: pickupLocation,
    dropoff_location: dropoffLocation,
    pickup_coordinates: normalizeCoordinates(task?.pickup_coordinates || task?.startPoint?.data),
    dropoff_coordinates: normalizeCoordinates(task?.dropoff_coordinates || task?.destinationPoint?.data),
    description: task?.description || '',
    durationMinutes: duration,
    startTime: task?.startTime || task?.time || task?.scheduled_time || null,
    state: normalizeTaskState(task?.state),
    history: Array.isArray(task?.history) ? task.history : [],
    metadata: task?.metadata || {},
    created_at: task?.created_at || task?.createdAt || null,
    updated_at: task?.updated_at || task?.updatedAt || null
  };
};

export const parseErrandTasks = (rawTasks) => {
  const tasks = coerceJSONString(rawTasks);
  if (!Array.isArray(tasks) || tasks.length === 0) return [];
  return tasks.map((task, index) => normalizeTask(task, index));
};

export const prepareErrandTasksForInsert = (draftTasks = []) => {
  if (!Array.isArray(draftTasks)) return [];
  return draftTasks.map((task, index) => ({
    ...normalizeTask(task, index),
    state: ERRAND_TASK_STATES.PENDING,
    history: []
  }));
};

export const getErrandTaskProgress = (rawTasks) => {
  const tasks = parseErrandTasks(rawTasks);
  const total = tasks.length;
  const completed = tasks.filter((task) => task.state === ERRAND_TASK_STATES.COMPLETED).length;
  const remaining = Math.max(total - completed, 0);
  const activeIndex = tasks.findIndex((task) => task.state !== ERRAND_TASK_STATES.COMPLETED);

  return {
    tasks,
    total,
    completed,
    remaining,
    activeTaskIndex: activeIndex === -1 ? null : activeIndex,
    activeTask: activeIndex === -1 ? null : tasks[activeIndex]
  };
};

export const getNextTaskState = (currentState) => {
  const index = ERRAND_TASK_STATE_SEQUENCE.indexOf(normalizeTaskState(currentState));
  if (index === -1) return ERRAND_TASK_STATES.PENDING;
  return ERRAND_TASK_STATE_SEQUENCE[Math.min(index + 1, ERRAND_TASK_STATE_SEQUENCE.length - 1)];
};

export const describeTaskState = (state) => {
  switch (normalizeTaskState(state)) {
    case ERRAND_TASK_STATES.PENDING:
      return 'Awaiting activation';
    case ERRAND_TASK_STATES.ACTIVATED:
      return 'Task activated';
    case ERRAND_TASK_STATES.DRIVER_ON_WAY:
      return 'Driver en route to task';
    case ERRAND_TASK_STATES.DRIVER_ARRIVED:
      return 'Driver arrived';
    case ERRAND_TASK_STATES.STARTED:
      return 'Task in progress';
    case ERRAND_TASK_STATES.COMPLETED:
      return 'Task completed';
    default:
      return 'Pending';
  }
};

export const buildTaskHistoryEntry = ({ action, actorId, actorType }) => ({
  action,
  actorId,
  actorType,
  timestamp: new Date().toISOString()
});

export const advanceTaskState = (tasks, taskIndex, nextState, historyEntry = null) => {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((task, index) => {
    if (index !== taskIndex) return task;
    return {
      ...task,
      state: nextState,
      updated_at: new Date().toISOString(),
      history: historyEntry ? [...(task.history || []), historyEntry] : task.history || []
    };
  });
};

export const summarizeErrandTasks = (rawTasks) => {
  const { tasks, total, completed, remaining, activeTaskIndex, activeTask } = getErrandTaskProgress(rawTasks);
  return {
    total,
    completed,
    remaining,
    activeTaskIndex,
    activeTask,
    allTasks: tasks
  };
};

export const getTaskAddressValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value?.data?.address || value?.address || '';
};

export const getTaskCoordinatesValue = (value) => {
  if (!value) return null;
  const coords = value?.data?.coordinates || value?.coordinates || value;
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    return { lat: coords.lat, lng: coords.lng };
  }
  if (Array.isArray(coords?.coordinates) && coords.coordinates.length >= 2) {
    const [lng, lat] = coords.coordinates;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return { lat, lng };
    }
  }
  return null;
};

export const estimateErrandTask = async ({ startPoint, destinationPoint, servicePricingConfig = null }) => {
  const originAddress = getTaskAddressValue(startPoint);
  const destinationAddress = getTaskAddressValue(destinationPoint);

  if (!originAddress || !destinationAddress) {
    return {
      distanceKm: 0,
      durationMinutes: 0,
      cost: 0
    };
  }

  let distanceKm = 0;
  let durationMinutes = 0;

  try {
    const route = await getRouteDistanceAndDuration(originAddress, destinationAddress);
    distanceKm = route?.distance ?? 0;
    durationMinutes = route?.duration ?? 0;
  } catch (error) {
    console.warn('estimateErrandTask: routing failed, falling back to coordinates', error);
  }

  if (!distanceKm || distanceKm <= 0) {
    const startCoords = getTaskCoordinatesValue(startPoint);
    const endCoords = getTaskCoordinatesValue(destinationPoint);
    if (startCoords && endCoords) {
      distanceKm = calculateDistance(startCoords, endCoords) || 0;
    }
  }

  if (distanceKm && distanceKm > 0 && (!durationMinutes || durationMinutes <= 0)) {
    durationMinutes = Math.round((distanceKm / 35) * 60);
  }

  // Use service-specific pricing if available
  let cost = 0;
  if (distanceKm) {
    if (servicePricingConfig) {
      // Use service-specific pricing config
      const { calculateBaseFareAndDistance } = await import('./pricingCalculator');
      const { baseFare, distanceCharge } = await calculateBaseFareAndDistance(distanceKm, null, servicePricingConfig);
      cost = baseFare + distanceCharge;
    } else {
      // Fall back to global pricing
      cost = (await calculateEstimatedFareV2({ distanceKm })) ?? 0;
    }
  }

  return {
    distanceKm: Math.round((distanceKm || 0) * 10) / 10,
    durationMinutes: Math.max(0, Math.round(durationMinutes || 0)),
    cost: Math.round((cost || 0) * 100) / 100
  };
};

